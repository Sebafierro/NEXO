-- ============================================================================
-- NEXO - Seed de demostracion M1-M4 (datos sinteticos)
-- Idempotente: puede ejecutarse mas de una vez sobre la misma base de datos.
--
-- SOLO ENTORNOS DE DESARROLLO / TESTING. NO ejecutar en produccion.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 10_*.sql)
--
-- Que crea:
--   1. Cuentas de login (auth.users) para los 4 roles del sistema, con
--      app_metadata.rol correcto. Los triggers on_auth_user_rol_inyectar y
--      on_auth_usuario_sincronizar crean public.usuarios y completan el rol.
--   2. Propietario y Arrendatario vinculados a sus cuentas (user_id).
--   3. Propiedades, contrato VIGENTE, cuentas de servicios (con monto_mensual).
--   4. Obligaciones del periodo actual (ARRIENDO + servicios) para M2/M4.
--   5. Documento OCR en estado SIN_ASIGNAR (entidad_tipo='SIN_ASIGNAR') para M3.
--
-- Credenciales (password de TODAS las cuentas): NexoDemo2024!
--   admin@nexo.test         -> ADMINISTRADOR
--   ejecutivo@nexo.test     -> EJECUTIVO
--   propietario.test@nexo.cl-> PROPIETARIO
--   arrendatario.test@nexo.cl-> ARRENDATARIO
--
-- NOTA: el OCR real requiere el microservicio ocr-service en :8080. El documento
-- de ejemplo se deja en estado PENDIENTE/SIN_ASIGNAR para probar el flujo M3
-- completo desde la UI (subir/asignar/confirmar).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helpers locales del seed (recreados cada ejecucion)
-- ----------------------------------------------------------------------------
-- Crea/actualiza una cuenta de auth con rol en app_metadata sin tocar filas de
-- auth.users que ya existan (preserva contrasenas reales si el usuario cambio).
create or replace function pg_temp.seed_auth_user(
  p_id      uuid,
  p_email   text,
  p_rol     text,
  p_nombres text,
  p_apellidos text,
  p_password text
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  -- Centinela para neutralizar temporalmente el email de arrendatarios que
  -- hagan match: el trigger on_auth_usuario_arrendatario_vincular corre ANTES
  -- que on_auth_usuario_sincronizar (orden alfabetico de triggers) e intenta
  -- enlazar arrendatarios.user_id -> public.usuarios, que aun no existe.
  v_sentinel text := '__seed_pending__';
begin
  select id into v_id from auth.users where id = p_id;
  if v_id is null then
    select id into v_id from auth.users where lower(email) = lower(p_email) limit 1;
  end if;

  if v_id is null then
    -- Neutraliza el match por email para que el trigger de vinculacion no
    -- dispare la FK antes de que exista la fila en public.usuarios.
    update public.arrendatarios
       set email = v_sentinel || email
     where lower(email) = lower(p_email)
       and email not like v_sentinel || '%';

    insert into auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      p_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'rol', p_rol),
      jsonb_build_object('rol', p_rol, 'nombres', p_nombres, 'apellidos', p_apellidos),
      now(), now(),
      '', '', '', ''
    );
    v_id := p_id;
  else
    -- Refresca metadata/rol para que el JWT los transporte tras el login.
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
             || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'rol', p_rol),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('rol', p_rol, 'nombres', p_nombres, 'apellidos', p_apellidos),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_id;
  end if;

  -- Refuerza public.usuarios (los triggers lo crean, esto garantiza el rol).
  insert into public.usuarios (id, email, rol, nombres, apellidos)
  values (v_id, p_email, p_rol, p_nombres, p_apellidos)
  on conflict (id) do update
    set email = excluded.email,
        rol = excluded.rol,
        nombres = coalesce(excluded.nombres, public.usuarios.nombres),
        apellidos = coalesce(excluded.apellidos, public.usuarios.apellidos);

  -- Restaura el email neutralizado (si aplica). La vinculacion real de
  -- arrendatarios.user_id se hace de forma explicita mas abajo.
  update public.arrendatarios
     set email = substring(email from length(v_sentinel) + 1)
   where email like v_sentinel || '%';

  -- Identidad de email para que GoTrue resuelva el login por email.
  -- La forma de auth.identities varia entre versiones de Supabase: se detectan
  -- las columnas existentes y se inserta solo con las disponibles.
  if not exists (
    select 1 from auth.identities i
    where i.user_id = v_id and i.provider = 'email'
  ) then
    declare
      v_has_provider_id boolean;
    begin
      select count(*) > 0 into v_has_provider_id
        from information_schema.columns
       where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id';

      if v_has_provider_id then
        insert into auth.identities (
          id, user_id, provider_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        ) values (
          gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now()
        );
      else
        -- Esquemas antiguos: id es text y funciona como provider id.
        insert into auth.identities (
          id, user_id, identity_data, provider,
          last_sign_in_at, created_at, updated_at
        ) values (
          v_id::text, v_id,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now()
        );
      end if;
    end;
  end if;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. CUENTAS DE LOGIN (4 roles)
-- ----------------------------------------------------------------------------
select pg_temp.seed_auth_user(
  'aaaaaaaa-0000-0000-0000-000000000001', 'admin@nexo.test', 'ADMINISTRADOR',
  'Admin', 'Nexo', 'NexoDemo2024!');

select pg_temp.seed_auth_user(
  'aaaaaaaa-0000-0000-0000-000000000002', 'ejecutivo@nexo.test', 'EJECUTIVO',
  'Ejecutivo', 'Nexo', 'NexoDemo2024!');

select pg_temp.seed_auth_user(
  'aaaaaaaa-0000-0000-0000-000000000003', 'propietario.test@nexo.cl', 'PROPIETARIO',
  'Carlos', 'Pérez', 'NexoDemo2024!');

select pg_temp.seed_auth_user(
  'aaaaaaaa-0000-0000-0000-000000000004', 'arrendatario.test@nexo.cl', 'ARRENDATARIO',
  'María', 'González', 'NexoDemo2024!');

-- ----------------------------------------------------------------------------
-- 2. PROPIETARIO / ARRENDATARIO vinculados a sus cuentas
-- ----------------------------------------------------------------------------
insert into public.propietarios (
  id, user_id, rut, nombres, apellidos, telefono, email, direccion, estado
) values (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-1', 'Carlos', 'Pérez', '+56911111111',
  'propietario.test@nexo.cl', 'Av. Providencia 1000', 'ACTIVO'
)
on conflict (id) do update
  set user_id = excluded.user_id,
      nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      email = excluded.email,
      estado = excluded.estado;

insert into public.arrendatarios (
  id, user_id, rut, nombres, apellidos, telefono, email, direccion, estado
) values (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-0000-0000-0000-000000000004',
  '22222222-2', 'María', 'González', '+56922222222',
  'arrendatario.test@nexo.cl', 'Calle Ficticia 456', 'ACTIVO'
)
on conflict (id) do update
  set user_id = excluded.user_id,
      nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      email = excluded.email,
      estado = excluded.estado;

-- ----------------------------------------------------------------------------
-- 3. PROPIEDAD (2 para cubrir contratos multiples) y arrendatario 2
-- ----------------------------------------------------------------------------
insert into public.propiedades (
  id, propietario_id, nombre, direccion, comuna, region, tipo, estado, valor_arriendo
) values (
  '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
  'Depto Test', 'Calle Ficticia 456', 'Santiago', 'Metropolitana',
  'DEPARTAMENTO', 'ARRENDADA', 500000
)
on conflict (id) do update
  set propietario_id = excluded.propietario_id,
      estado = excluded.estado,
      valor_arriendo = excluded.valor_arriendo;

insert into public.propiedades (
  id, propietario_id, nombre, direccion, comuna, region, tipo, estado, valor_arriendo
) values (
  '33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111',
  'Casa Test', 'Pasaje Ficticio 789', 'Ñuñoa', 'Metropolitana',
  'CASA', 'DISPONIBLE', 800000
)
on conflict (id) do update
  set propietario_id = excluded.propietario_id,
      estado = excluded.estado,
      valor_arriendo = excluded.valor_arriendo;

-- ----------------------------------------------------------------------------
-- 4. CONTRATO VIGENTE (M1/M2/M4) - arriendo 500000, comision 10%, vence dia 5
-- ----------------------------------------------------------------------------
insert into public.contratos (
  id, propiedad_id, arrendatario_id, fecha_inicio, fecha_termino,
  valor_arriendo, garantia_meses, estado, dia_vencimiento, comision_porcentaje
) values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  (date_trunc('month', current_date) - interval '3 months')::date,
  (date_trunc('month', current_date) + interval '9 months')::date,
  500000, 1, 'VIGENTE', 5, 10
)
on conflict (id) do update
  set estado = excluded.estado,
      valor_arriendo = excluded.valor_arriendo,
      comision_porcentaje = excluded.comision_porcentaje,
      dia_vencimiento = excluded.dia_vencimiento;

-- ----------------------------------------------------------------------------
-- 5. CUENTAS DE SERVICIOS (con monto_mensual para que generen obligacion)
-- ----------------------------------------------------------------------------
insert into public.cuentas_servicios (
  id, propiedad_id, tipo_servicio, empresa, numero_cliente, numero_cuenta, activo, monto_mensual
) values (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'AGUA', 'EmpresaTest', 'CLI-TEST-001', 'CTA-TEST-001', true, 15000
)
on conflict (id) do update
  set numero_cliente = excluded.numero_cliente,
      activo = excluded.activo,
      monto_mensual = excluded.monto_mensual;

insert into public.cuentas_servicios (
  id, propiedad_id, tipo_servicio, empresa, numero_cliente, numero_cuenta, activo, monto_mensual
) values (
  '55555555-5555-5555-5555-555555555556',
  '33333333-3333-3333-3333-333333333333',
  'ELECTRICIDAD', 'EmpresaTest', 'CLI-TEST-002', 'CTA-TEST-002', true, 25000
)
on conflict (id) do update
  set numero_cliente = excluded.numero_cliente,
      activo = excluded.activo,
      monto_mensual = excluded.monto_mensual;

-- ----------------------------------------------------------------------------
-- 6. OBLIGACIONES DEL PERIODO ACTUAL (idempotentes por periodo+tipo+contrato)
--    ARRIENDO + servicios. Se usan en M2 (conciliacion) y M4 (liquidaciones).
-- ----------------------------------------------------------------------------
do $$
declare
  v_periodo date := date_trunc('month', current_date)::date;
  v_fin_mes date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_contrato uuid := '44444444-4444-4444-4444-444444444444';
  v_propiedad uuid := '33333333-3333-3333-3333-333333333333';
begin
  -- ARRIENDO del periodo actual
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_contrato and tipo = 'ARRIENDO' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666666', v_contrato, v_propiedad,
      'ARRIENDO', 'Arriendo mensual', 500000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  -- AGUA del periodo actual
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_contrato and tipo = 'AGUA' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666667', v_contrato, v_propiedad,
      'AGUA', 'Servicio AGUA', 15000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  -- ELECTRICIDAD del periodo actual
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_contrato and tipo = 'ELECTRICIDAD' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666668', v_contrato, v_propiedad,
      'ELECTRICIDAD', 'Servicio ELECTRICIDAD', 25000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  -- ARRIENDO del mes anterior, VENCIDA (para conciliacion de mora)
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_contrato and tipo = 'ARRIENDO'
      and periodo = (date_trunc('month', current_date) - interval '1 month')::date
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666669', v_contrato, v_propiedad,
      'ARRIENDO', 'Arriendo mensual (mes anterior)', 500000, 0, 'VENCIDA',
      (date_trunc('month', current_date) - interval '1 month' + interval '4 days')::date,
      (date_trunc('month', current_date) - interval '1 month')::date
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. DOCUMENTO OCR DE EJEMPLO (M3) - nace SIN_ASIGNAR
--    El arrendatario/ejecutivo lo sube por la UI; este registro sirve para
--    probar la asignacion a una obligacion real desde /ejecutivo/documentos.
--    No se crea fila si ya existe un documento con el mismo hash.
-- ----------------------------------------------------------------------------
insert into public.documentos (
  id, entidad_tipo, entidad_id, tipo_documento, nombre, archivo_url, bucket,
  subido_por, periodo, hash_archivo, estado
) values (
  '88888888-8888-8888-8888-888888888888',
  'SIN_ASIGNAR', null, 'BOLETA_SERVICIO', 'Boleta demo AGUA',
  'demo/boleta-demo-agua.pdf', 'respaldos',
  'aaaaaaaa-0000-0000-0000-000000000002',
  date_trunc('month', current_date)::date,
  'seed-demo-boleta-agua-hash-001', 'PENDIENTE'
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 8. ENLACE DE ARRENDATARIO (por email) por si el trigger no lo hizo
-- ----------------------------------------------------------------------------
update public.arrendatarios
   set user_id = 'aaaaaaaa-0000-0000-0000-000000000004'
 where id = '22222222-2222-2222-2222-222222222222'
   and user_id is null;

commit;

-- ============================================================================
-- VERIFICACION (opcional): reporte rapido de filas creadas
-- ============================================================================
select 'usuarios' as tabla, count(*) from public.usuarios
 where id in (
   'aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000004')
union all select 'contratos', count(*) from public.contratos
 where id = '44444444-4444-4444-4444-444444444444'
union all select 'obligaciones', count(*) from public.obligaciones
 where contrato_id = '44444444-4444-4444-4444-444444444444'
union all select 'cuentas_servicios', count(*) from public.cuentas_servicios
 where propiedad_id = '33333333-3333-3333-3333-333333333333'
union all select 'documentos_sin_asignar', count(*) from public.documentos
 where entidad_tipo = 'SIN_ASIGNAR';
