-- ============================================================================
-- NEXO - Seed de demostracion M1-M4 (datos sinteticos)
-- Idempotente: puede ejecutarse mas de una vez sobre la misma base de datos.
--
-- SOLO ENTORNOS DE DESARROLLO / TESTING. NO ejecutar en produccion.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 10_*.sql)
--
-- Que crea (dataset minimo, cada registro tiene un proposito de demo):
--   1. Cuentas de login (auth.users) para los 4 roles, con app_metadata.rol.
--      Los triggers on_auth_user_rol_inyectar y on_auth_usuario_sincronizar
--      crean public.usuarios y completan el rol.
--   2. Propietario Carlos Perez y arrendataria Maria Gonzalez vinculados a login.
--      Arrendatario Diego Soto (sin cuenta) para el escenario M4.
--   3. Tres propiedades del mismo dueno:
--        Depto Los Leones  ARRENDADA   -> M1/M2/M3 (cartera con mora)
--        Casa Villa Frei   ARRENDADA   -> M4 (periodo anterior en verde)
--        Oficina Huerfanos DISPONIBLE  -> M1 alta de contrato
--   4. Contratos VIGENTE, cuentas de servicios con monto_mensual.
--   5. Obligaciones: Depto (actual PENDIENTE + mes anterior VENCIDA) y Casa
--      (solo mes anterior PAGADA, sin mes actual) para que generar_obligaciones
--      del periodo vigente cree filas visibles.
--   6. Pago PENDIENTE de Maria (comprobante) para conciliar en M2.
--      Pago VALIDADO + conciliacion de Diego para el cierre M4.
--   7. Boleta OCR SIN_ASIGNAR + extraccion EXTRAIDA para M3.
--
-- Credenciales (password de TODAS las cuentas): NexoDemo2024!
--   admin@nexo.test          -> ADMINISTRADOR
--   ejecutivo@nexo.test      -> EJECUTIVO
--   propietario.test@nexo.cl -> PROPIETARIO
--   arrendatario.test@nexo.cl-> ARRENDATARIO
--
-- Restablecer escenario (borra SOLO UUIDs/contratos de este seed):
--   supabase/12_reset_seed_demo.sql y luego volver a ejecutar este archivo.
--
-- NOTA: el OCR real requiere ocr-service en :8080. La boleta de ejemplo queda
-- PENDIENTE/SIN_ASIGNAR para asignar y confirmar desde /ejecutivo/documentos.
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
-- 2. PROPIETARIO / ARRENDATARIOS
-- ----------------------------------------------------------------------------
insert into public.propietarios (
  id, user_id, rut, nombres, apellidos, telefono, email, direccion, estado
) values (
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-1', 'Carlos', 'Pérez', '+56911111111',
  'propietario.test@nexo.cl', 'Av. Providencia 1000, oficina 402', 'ACTIVO'
)
on conflict (id) do update
  set user_id = excluded.user_id,
      nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      email = excluded.email,
      direccion = excluded.direccion,
      estado = excluded.estado;

insert into public.arrendatarios (
  id, user_id, rut, nombres, apellidos, telefono, email, direccion, estado
) values (
  '22222222-2222-2222-2222-222222222222',
  'aaaaaaaa-0000-0000-0000-000000000004',
  '22222222-2', 'María', 'González', '+56922222222',
  'arrendatario.test@nexo.cl', 'Av. Los Leones 1450, depto 603', 'ACTIVO'
)
on conflict (id) do update
  set user_id = excluded.user_id,
      nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      email = excluded.email,
      direccion = excluded.direccion,
      estado = excluded.estado;

-- Sin cuenta de login: se usa solo en el contrato listo para liquidar (M4).
insert into public.arrendatarios (
  id, user_id, rut, nombres, apellidos, telefono, email, direccion, estado
) values (
  '22222222-2222-2222-2222-222222222223',
  null,
  '17333444-5', 'Diego', 'Soto', '+56933333333',
  'diego.soto.demo@nexo.test', 'Pasaje Oriente 890, Ñuñoa', 'ACTIVO'
)
on conflict (id) do update
  set nombres = excluded.nombres,
      apellidos = excluded.apellidos,
      email = excluded.email,
      direccion = excluded.direccion,
      estado = excluded.estado;

-- ----------------------------------------------------------------------------
-- 3. PROPIEDADES
-- ----------------------------------------------------------------------------
insert into public.propiedades (
  id, propietario_id, nombre, direccion, comuna, region, tipo, estado, valor_arriendo
) values
  (
    '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
    'Depto Los Leones', 'Av. Los Leones 1450, depto 603', 'Providencia', 'Metropolitana',
    'DEPARTAMENTO', 'ARRENDADA', 500000
  ),
  (
    '33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111',
    'Casa Villa Frei', 'Pasaje Oriente 890', 'Ñuñoa', 'Metropolitana',
    'CASA', 'ARRENDADA', 800000
  ),
  (
    '33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111',
    'Oficina Huérfanos', 'Huérfanos 1160, oficina 8', 'Santiago', 'Metropolitana',
    'OFICINA', 'DISPONIBLE', 450000
  )
on conflict (id) do update
  set propietario_id = excluded.propietario_id,
      nombre = excluded.nombre,
      direccion = excluded.direccion,
      comuna = excluded.comuna,
      tipo = excluded.tipo,
      estado = excluded.estado,
      valor_arriendo = excluded.valor_arriendo;

-- ----------------------------------------------------------------------------
-- 4. CONTRATOS VIGENTE
--    Depto: arriendo 500000, comision 10%, vence dia 5  (M1/M2/M3)
--    Casa:  arriendo 800000, comision 8%,  vence dia 5  (M4)
-- ----------------------------------------------------------------------------
insert into public.contratos (
  id, propiedad_id, arrendatario_id, fecha_inicio, fecha_termino,
  valor_arriendo, garantia_meses, estado, dia_vencimiento, comision_porcentaje
) values
  (
    '44444444-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    (date_trunc('month', current_date) - interval '3 months')::date,
    (date_trunc('month', current_date) + interval '9 months')::date,
    500000, 1, 'VIGENTE', 5, 10
  ),
  (
    '44444444-4444-4444-4444-444444444445',
    '33333333-3333-3333-3333-333333333334',
    '22222222-2222-2222-2222-222222222223',
    (date_trunc('month', current_date) - interval '6 months')::date,
    (date_trunc('month', current_date) + interval '6 months')::date,
    800000, 1, 'VIGENTE', 5, 8
  )
on conflict (id) do update
  set estado = excluded.estado,
      valor_arriendo = excluded.valor_arriendo,
      comision_porcentaje = excluded.comision_porcentaje,
      dia_vencimiento = excluded.dia_vencimiento;

-- ----------------------------------------------------------------------------
-- 5. CUENTAS DE SERVICIOS (monto_mensual => generan obligacion en M2)
-- ----------------------------------------------------------------------------
insert into public.cuentas_servicios (
  id, propiedad_id, tipo_servicio, empresa, numero_cliente, numero_cuenta, activo, monto_mensual
) values
  (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'AGUA', 'Aguas Andinas', 'CLI-LEONES-AGUA', 'CTA-LEONES-AGUA', true, 15000
  ),
  (
    '55555555-5555-5555-5555-555555555556',
    '33333333-3333-3333-3333-333333333333',
    'ELECTRICIDAD', 'Enel', 'CLI-LEONES-ENEL', 'CTA-LEONES-ENEL', true, 25000
  ),
  (
    '55555555-5555-5555-5555-555555555557',
    '33333333-3333-3333-3333-333333333334',
    'GAS', 'Metrogas', 'CLI-FREI-GAS', 'CTA-FREI-GAS', true, 18000
  )
on conflict (id) do update
  set numero_cliente = excluded.numero_cliente,
      empresa = excluded.empresa,
      activo = excluded.activo,
      monto_mensual = excluded.monto_mensual;

-- ----------------------------------------------------------------------------
-- 6. OBLIGACIONES (idempotentes por contrato+tipo+periodo)
--    No se pisan estados si la fila ya existe (preserva el avance de la demo).
--    saldo es columna GENERADA: no insertar.
-- ----------------------------------------------------------------------------
do $$
declare
  v_periodo     date := date_trunc('month', current_date)::date;
  v_fin_mes     date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  v_prev        date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_fin_prev    date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_depto_c     uuid := '44444444-4444-4444-4444-444444444444';
  v_depto_p     uuid := '33333333-3333-3333-3333-333333333333';
  v_casa_c      uuid := '44444444-4444-4444-4444-444444444445';
  v_casa_p      uuid := '33333333-3333-3333-3333-333333333334';
begin
  -- Depto / Maria: periodo actual PENDIENTE (conciliar + semaforo)
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_depto_c and tipo = 'ARRIENDO' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666666', v_depto_c, v_depto_p,
      'ARRIENDO', 'Arriendo mensual Depto Los Leones', 500000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_depto_c and tipo = 'AGUA' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666667', v_depto_c, v_depto_p,
      'AGUA', 'Servicio AGUA Depto Los Leones', 15000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_depto_c and tipo = 'ELECTRICIDAD' and periodo = v_periodo
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666668', v_depto_c, v_depto_p,
      'ELECTRICIDAD', 'Servicio ELECTRICIDAD Depto Los Leones', 25000, 0, 'PENDIENTE',
      least(v_periodo + 4, v_fin_mes), v_periodo
    );
  end if;

  -- Depto / Maria: mes anterior VENCIDA (mora / semaforo ROJO)
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_depto_c and tipo = 'ARRIENDO' and periodo = v_prev
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666669', v_depto_c, v_depto_p,
      'ARRIENDO', 'Arriendo mensual Depto Los Leones (mes anterior)', 500000, 0, 'VENCIDA',
      least(v_prev + 4, v_fin_prev), v_prev
    );
  end if;

  -- Casa / Diego: SOLO mes anterior PAGADA (periodo verde M4).
  -- El mes actual se omite a proposito: generar_obligaciones_periodo(hoy)
  -- crea ARRIENDO + GAS y deja el resultado visible en conciliacion.
  if not exists (
    select 1 from public.obligaciones
    where contrato_id = v_casa_c and tipo = 'ARRIENDO' and periodo = v_prev
  ) then
    insert into public.obligaciones (
      id, contrato_id, propiedad_id, tipo, descripcion, monto, monto_pagado,
      estado, fecha_vencimiento, periodo
    ) values (
      '66666666-6666-6666-6666-666666666670', v_casa_c, v_casa_p,
      'ARRIENDO', 'Arriendo mensual Casa Villa Frei (mes anterior)', 800000, 800000, 'PAGADA',
      least(v_prev + 4, v_fin_prev), v_prev
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. PAGOS, DOCUMENTOS Y CONCILIACIONES
--    Se resuelven las obligaciones por (contrato, tipo, periodo) para no
--    romper FKs si esas filas ya existian con otro UUID.
-- ----------------------------------------------------------------------------
do $$
declare
  v_periodo date := date_trunc('month', current_date)::date;
  v_prev    date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_arriendo_depto uuid;
  v_arriendo_casa  uuid;
begin
  select id into v_arriendo_depto
    from public.obligaciones
   where contrato_id = '44444444-4444-4444-4444-444444444444'
     and tipo = 'ARRIENDO' and periodo = v_periodo
   limit 1;

  select id into v_arriendo_casa
    from public.obligaciones
   where contrato_id = '44444444-4444-4444-4444-444444444445'
     and tipo = 'ARRIENDO' and periodo = v_prev
   limit 1;

  if v_arriendo_casa is not null
     and not exists (select 1 from public.pagos where id = '77777777-7777-7777-7777-777777777777') then
    insert into public.pagos (
      id, obligacion_id, monto, fecha_pago, metodo_pago, referencia,
      registrado_por, estado_validacion
    ) values (
      '77777777-7777-7777-7777-777777777777',
      v_arriendo_casa,
      800000,
      (date_trunc('month', current_date) - interval '1 month' + interval '3 days'),
      'TRANSFERENCIA',
      'TRX-DEMO-CASA-001',
      'aaaaaaaa-0000-0000-0000-000000000002',
      'VALIDADO'
    );
  end if;

  if v_arriendo_casa is not null
     and exists (select 1 from public.pagos where id = '77777777-7777-7777-7777-777777777777')
     and not exists (select 1 from public.conciliaciones where id = '99999999-9999-9999-9999-999999999999') then
    insert into public.conciliaciones (
      id, pago_id, obligacion_id, monto_aplicado, diferencia, estado, resuelto_por, observacion
    ) values (
      '99999999-9999-9999-9999-999999999999',
      '77777777-7777-7777-7777-777777777777',
      v_arriendo_casa,
      800000, 0, 'CONCILIADO',
      'aaaaaaaa-0000-0000-0000-000000000002',
      'Pago de arriendo Casa Villa Frei conciliado en demo'
    );
  end if;

  if v_arriendo_depto is not null
     and not exists (select 1 from public.pagos where id = '77777777-7777-7777-7777-777777777778') then
    insert into public.pagos (
      id, obligacion_id, monto, fecha_pago, metodo_pago, referencia,
      registrado_por, estado_validacion
    ) values (
      '77777777-7777-7777-7777-777777777778',
      v_arriendo_depto,
      500000,
      now(),
      'TRANSFERENCIA',
      'TRX-DEMO-LEONES-001',
      'aaaaaaaa-0000-0000-0000-000000000004',
      'PENDIENTE'
    );
  end if;

  update public.documentos
     set estado = 'EXTRAIDO',
         nombre = 'Boleta Aguas Andinas — Los Leones'
   where id = '88888888-8888-8888-8888-888888888888'
     and estado = 'PENDIENTE';

  if not exists (select 1 from public.documentos where id = '88888888-8888-8888-8888-888888888888')
     and not exists (select 1 from public.documentos where hash_archivo = 'seed-demo-boleta-agua-hash-001') then
    insert into public.documentos (
      id, entidad_tipo, entidad_id, tipo_documento, nombre, archivo_url, bucket,
      subido_por, periodo, hash_archivo, estado, propiedad_id
    ) values (
      '88888888-8888-8888-8888-888888888888',
      'SIN_ASIGNAR', null, 'BOLETA_SERVICIO', 'Boleta Aguas Andinas — Los Leones',
      'demo/boleta-aguas-andinas-leones.pdf', 'respaldos',
      'aaaaaaaa-0000-0000-0000-000000000002',
      v_periodo,
      'seed-demo-boleta-agua-hash-001', 'EXTRAIDO',
      null
    );
  end if;

  if not exists (select 1 from public.extracciones_documento where id = '12121212-1212-1212-1212-121212121212')
     and exists (select 1 from public.documentos where id = '88888888-8888-8888-8888-888888888888') then
    insert into public.extracciones_documento (
      id, documento_id, solicitado_por, objetivo, estado,
      empresa_detectada, numero_cliente, monto_detectado, fecha_vencimiento,
      confianza_ocr, resultado_validacion, datos_crudos
    ) values (
      '12121212-1212-1212-1212-121212121212',
      '88888888-8888-8888-8888-888888888888',
      'aaaaaaaa-0000-0000-0000-000000000002',
      'Boleta de agua para asignar a obligación AGUA',
      'EXTRAIDA',
      'Aguas Andinas', 'CLI-LEONES-AGUA', 14890,
      least((v_periodo + 4), (date_trunc('month', current_date) + interval '1 month - 1 day')::date),
      91.50, 'REVISAR',
      jsonb_build_object(
        'origen', 'seed-demo',
        'nota', 'Monto detectado distinto del estimado (15000) para mostrar reemplazo al confirmar'
      )
    );
  end if;

  if v_arriendo_depto is not null
     and not exists (select 1 from public.documentos where id = '88888888-8888-8888-8888-888888888889')
     and not exists (select 1 from public.documentos where hash_archivo = 'seed-demo-comprobante-arriendo-hash-001') then
    insert into public.documentos (
      id, entidad_tipo, entidad_id, tipo_documento, nombre, archivo_url, bucket,
      subido_por, periodo, hash_archivo, estado, propiedad_id
    ) values (
      '88888888-8888-8888-8888-888888888889',
      'OBLIGACION', v_arriendo_depto,
      'COMPROBANTE_PAGO', 'Comprobante transferencia arriendo Los Leones',
      'demo/comprobante-arriendo-leones.pdf', 'respaldos',
      'aaaaaaaa-0000-0000-0000-000000000004',
      v_periodo,
      'seed-demo-comprobante-arriendo-hash-001', 'PENDIENTE',
      '33333333-3333-3333-3333-333333333333'
    );
  end if;

  update public.pagos
     set documento_id = '88888888-8888-8888-8888-888888888889'
   where id = '77777777-7777-7777-7777-777777777778'
     and documento_id is null
     and exists (select 1 from public.documentos where id = '88888888-8888-8888-8888-888888888889');
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. ENLACE DE ARRENDATARIO (por si el trigger no lo hizo)
-- ----------------------------------------------------------------------------
update public.arrendatarios
   set user_id = 'aaaaaaaa-0000-0000-0000-000000000004'
 where id = '22222222-2222-2222-2222-222222222222'
   and user_id is null;

commit;

-- ============================================================================
-- VERIFICACION: filas del escenario demo
-- ============================================================================
select 'usuarios' as tabla, count(*)::text as n from public.usuarios
 where id in (
   'aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000004')
union all select 'propiedades', count(*)::text from public.propiedades
 where id in (
   '33333333-3333-3333-3333-333333333333',
   '33333333-3333-3333-3333-333333333334',
   '33333333-3333-3333-3333-333333333335')
union all select 'contratos', count(*)::text from public.contratos
 where id in (
   '44444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444445')
union all select 'obligaciones_depto', count(*)::text from public.obligaciones
 where contrato_id = '44444444-4444-4444-4444-444444444444'
union all select 'obligaciones_casa_pagadas', count(*)::text from public.obligaciones
 where contrato_id = '44444444-4444-4444-4444-444444444445' and estado = 'PAGADA'
union all select 'pagos_pendientes_maria', count(*)::text from public.pagos
 where id = '77777777-7777-7777-7777-777777777778' and estado_validacion = 'PENDIENTE'
union all select 'documentos_sin_asignar', count(*)::text from public.documentos
 where id = '88888888-8888-8888-8888-888888888888' and entidad_tipo = 'SIN_ASIGNAR'
union all select 'extracciones_ocr', count(*)::text from public.extracciones_documento
 where id = '12121212-1212-1212-1212-121212121212';
