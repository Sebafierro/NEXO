-- ============================================================================
-- NEXO - Extensión de roles: EJECUTIVO y ARRENDATARIO
-- Complementa a backend_setup.sql (no lo modifica). Es idempotente: se puede
-- ejecutar más de una vez sobre la misma base de datos.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (después de backend_setup.sql)
--
-- Contenido:
--   1. Widening del CHECK de usuarios.rol a los 4 roles de la plataforma
--   2. Vínculo de cuentas autenticadas con public.arrendatarios (user_id)
--   3. Helpers de RLS (es_ejecutivo / es_arrendatario_de / es_arrendatario_entidad)
--   4. Políticas RLS de EJECUTIVO y ARRENDATARIO
--   5. Storage: acceso del EJECUTIVO al bucket "respaldos"
--   6. TODO de negocio pendiente (liquidaciones, conciliación, cola OCR)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. ROLES
-- ----------------------------------------------------------------------------
-- 1.1 El CHECK original solo admite ADMINISTRADOR y PROPIETARIO.
alter table public.usuarios
  drop constraint if exists usuarios_rol_check;

alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('ADMINISTRADOR', 'EJECUTIVO', 'PROPIETARIO', 'ARRENDATARIO'));

comment on column public.usuarios.rol is
  'Rol del usuario en NEXO. Viaja en el JWT como app_metadata.rol.';

-- 1.2 Normaliza usuarios creados antes de esta extensión.
--     IMPORTANTE: refresh de sesiones para que el JWT transporte el nuevo rol
--     (los app_metadata quedan cacheados hasta el refresh).
update auth.users
set raw_app_meta_data = jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{rol}',
      to_jsonb(coalesce(nullif(raw_app_meta_data ->> 'rol', ''), 'PROPIETARIO'))
    )
where raw_app_meta_data ->> 'rol' is null;

update public.usuarios set rol = 'PROPIETARIO' where rol is null;

-- ----------------------------------------------------------------------------
-- 2. VÍNCULO DE ARRENDATARIOS CON SUS CUENTAS
-- ----------------------------------------------------------------------------
-- El portal del ARRENDATARIO se identifica por auth.uid(); por eso la tabla
-- necesita la misma columna user_id que ya usa public.propietarios.
alter table public.arrendatarios
  add column if not exists user_id uuid unique references public.usuarios (id) on delete set null;

comment on column public.arrendatarios.user_id is
  'Vínculo con la cuenta autenticada (rol ARRENDATARIO). Base de las políticas RLS del portal.';

create index if not exists idx_arrendatarios_user on public.arrendatarios (user_id);

-- Los contratos activos quedan visibles para el arrendatario propietario de la cuenta.
create or replace function public.sincronizar_arrendatario_desde_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- El alta en public.arrendatarios la hace el ADMINISTRADOR; este trigger solo
  -- completa el vínculo cuando el email coincide con una cuenta existente.
  if new.email is not null then
    update public.arrendatarios
       set user_id = new.id
     where user_id is null
       and lower(email) = lower(new.email)
       and estado = 'ACTIVO';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_usuario_arrendatario_vincular on auth.users;
create trigger on_auth_usuario_arrendatario_vincular
  after insert on auth.users
  for each row execute function public.sincronizar_arrendatario_desde_usuario();

-- ----------------------------------------------------------------------------
-- 3. HELPERS DE RLS
-- ----------------------------------------------------------------------------
create or replace function public.es_ejecutivo()
returns boolean
language sql
stable
as $$
  select public.rol_usuario_jwt() = 'EJECUTIVO';
$$;

create or replace function public.es_arrendatario()
returns boolean
language sql
stable
as $$
  select public.rol_usuario_jwt() = 'ARRENDATARIO';
$$;

-- El EJECUTIVO es staff operativo: ve la cartera completa (excepto liquidaciones).
create or replace function public.es_staff()
returns boolean
language sql
stable
as $$
  select public.rol_usuario_jwt() in ('ADMINISTRADOR', 'EJECUTIVO');
$$;

-- ¿El usuario autenticado es el arrendatario (o[]) de alguno de los contratos indicados?
create or replace function public.es_arrendatario_de(contratos_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.contratos c
    join public.arrendatarios a on a.id = c.arrendatario_id
    where c.id = contratos_id
      and a.user_id = auth.uid()
      and c.estado = 'VIGENTE'
  );
$$;

-- Comprobación de propiedad de una entidad por tipo (documentos del arrendatario).
create or replace function public.es_arrendatario_entidad(entidad_tipo text, entidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case entidad_tipo
    when 'CONTRATO' then public.es_arrendatario_de(entidad_id)
    when 'OBLIGACION' then exists (
      select 1 from public.obligaciones o
      where o.id = entidad_id
        and public.es_arrendatario_de(o.contrato_id)
    )
    when 'ARRENDATARIO' then exists (
      select 1 from public.arrendatarios a
      where a.id = entidad_id and a.user_id = auth.uid()
    )
    -- El arrendatario no es dueño de propiedades ni documentos de su arrendador.
    else false
  end;
$$;

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS RLS
-- ----------------------------------------------------------------------------
-- 4.0 usuarios: el EJECUTIVO necesita consultar la cartera de usuarios para
--     operar, pero no puede crear ni cambiar roles (eso queda en el ADMINISTRADOR).
drop policy if exists "usuarios_ejecutivo_lectura" on public.usuarios;
create policy "usuarios_ejecutivo_lectura"
  on public.usuarios for select
  to authenticated
  using (public.es_ejecutivo());

-- 4.1 propiedades: lectura operativa de toda la cartera.
drop policy if exists "propiedades_ejecutivo_lectura" on public.propiedades;
create policy "propiedades_ejecutivo_lectura"
  on public.propiedades for select
  to authenticated
  using (public.es_ejecutivo());

-- 4.2 propietarios y arrendatarios: lectura operativa.
drop policy if exists "propietarios_ejecutivo_lectura" on public.propietarios;
create policy "propietarios_ejecutivo_lectura"
  on public.propietarios for select
  to authenticated
  using (public.es_ejecutivo());

drop policy if exists "arrendatarios_ejecutivo_lectura" on public.arrendatarios;
create policy "arrendatarios_ejecutivo_lectura"
  on public.arrendatarios for select
  to authenticated
  using (public.es_ejecutivo());

-- El ARRENDATARIO ve solo su propia ficha.
drop policy if exists "arrendatarios_ver_propio" on public.arrendatarios;
create policy "arrendatarios_ver_propio"
  on public.arrendatarios for select
  to authenticated
  using (public.es_arrendatario() and user_id = auth.uid());

-- 4.3 contratos: lectura operativa (EJECUTIVO) y lectura del propio arrendatario.
drop policy if exists "contratos_ejecutivo_lectura" on public.contratos;
create policy "contratos_ejecutivo_lectura"
  on public.contratos for select
  to authenticated
  using (public.es_ejecutivo());

drop policy if exists "contratos_arrendatario_lectura" on public.contratos;
create policy "contratos_arrendatario_lectura"
  on public.contratos for select
  to authenticated
  using (public.es_arrendatario_de(id));

-- 4.4 obligaciones: lectura operativa y del propio arrendatario.
--     El EJECUTIVO actualiza el estado (PAGADA / ATRASADA) al conciliar.
drop policy if exists "obligaciones_ejecutivo_operacion" on public.obligaciones;
create policy "obligaciones_ejecutivo_operacion"
  on public.obligaciones for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

drop policy if exists "obligaciones_arrendatario_lectura" on public.obligaciones;
create policy "obligaciones_arrendatario_lectura"
  on public.obligaciones for select
  to authenticated
  using (public.es_arrendatario_de(contrato_id));

-- 4.5 pagos: el EJECUTIVO registra y concilia pagos.
drop policy if exists "pagos_ejecutivo_operacion" on public.pagos;
create policy "pagos_ejecutivo_operacion"
  on public.pagos for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

-- El ARRENDATARIO solo consulta su historial (nunca inserta pagos).
drop policy if exists "pagos_arrendatario_lectura" on public.pagos;
create policy "pagos_arrendatario_lectura"
  on public.pagos for select
  to authenticated
  using (exists (
    select 1
    from public.obligaciones o
    where o.id = public.pagos.obligacion_id
      and public.es_arrendatario_de(o.contrato_id)
  ));

-- 4.6 documentos: carga del EJECUTIVO y lectura de las entidades del arrendatario.
drop policy if exists "documentos_ejecutivo_operacion" on public.documentos;
create policy "documentos_ejecutivo_operacion"
  on public.documentos for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

drop policy if exists "documentos_arrendatario_lectura" on public.documentos;
create policy "documentos_arrendatario_lectura"
  on public.documentos for select
  to authenticated
  using (public.es_arrendatario_entidad(entidad_tipo, entidad_id));

-- 4.7 extracciones_documento: cola de OCR operada por el EJECUTIVO.
drop policy if exists "extracciones_ejecutivo_operacion" on public.extracciones_documento;
create policy "extracciones_ejecutivo_operacion"
  on public.extracciones_documento for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

drop policy if exists "extracciones_arrendatario_lectura" on public.extracciones_documento;
create policy "extracciones_arrendatario_lectura"
  on public.extracciones_documento for select
  to authenticated
  using (exists (
    select 1
    from public.documentos d
    where d.id = public.extracciones_documento.documento_id
      and public.es_arrendatario_entidad(d.entidad_tipo, d.entidad_id)
  ));

-- ----------------------------------------------------------------------------
-- 5. STORAGE
-- ----------------------------------------------------------------------------
-- 5.1 El EJECUTIVO accede a todo el bucket "respaldos" (carga y descarga).
drop policy if exists "respaldos_ejecutivo_todo" on storage.objects;
create policy "respaldos_ejecutivo_todo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'respaldos' and public.es_ejecutivo())
  with check (bucket_id = 'respaldos' and public.es_ejecutivo());

-- 5.2 El ARRENDATARIO descarga los comprobantes que están en su propia carpeta.
drop policy if exists "respaldos_arrendatario_acceso" on storage.objects;
create policy "respaldos_arrendatario_acceso"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'respaldos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.es_arrendatario()
  );

-- ----------------------------------------------------------------------------
-- 6. TODO DE NEGOCIO PENDIENTE
-- ----------------------------------------------------------------------------
-- * public.liquidaciones (base de /admin/liquidaciones, /ejecutivo/liquidaciones y
--   /propietario/liquidaciones). Diseño tentativo:
--     create table public.liquidaciones (
--       id              uuid primary key default gen_random_uuid(),
--       periodo         date not null,                       -- primer día del mes
--       propietario_id  uuid not null references public.propietarios (id) on delete restrict,
--       arriendo_bruto  numeric(12,2) not null default 0,
--       gastos          numeric(12,2) not null default 0,     -- gastos comunes + servicios
--       comision        numeric(12,2) not null default 0,     -- comisión NEXO
--       neto            numeric(12,2) not null default 0,     -- generado: bruto - gastos - comision
--       estado          text not null default 'GENERADA'
--                       check (estado in ('GENERADA','APROBADA','RECHAZADA','PAGADA')),
--       generado_por    uuid references public.usuarios (id) on delete set null,
--       aprobado_por    uuid references public.usuarios (id) on delete set null,
--       observaciones   text,
--       creado_en       timestamptz not null default now(),
--       constraint liquidaciones_periodo_propietario unique (periodo, propietario_id)
--     );
--   + RLS: ADMINISTRADOR todo; EJECUTIVO insert/update (no approve); PROPIETARIO
--     select de las propias.
--
-- * Trigger/función que marque obligaciones como ATRASADA al vencer
--   (hoy las actualiza el EJECUTIVO manualmente en /ejecutivo/conciliacion).
--
-- * Conciliación: tabla opcional public.conciliaciones
--   (pago_id, obligacion_id, monto_aplicado, diferencia, resuelto_por, resuelto_en)
--   para dejar rastro cuando el pago no calza exactamente con la obligación.
--
-- * Cola de OCR: public.extracciones_documento ya sirve de cola; falta el worker
--   (Edge Function o cron) que escriba los campos extraídos en la entidad destino.
--
-- * Comisiones y gastos comunes parametrizables por contrato antes de poder
--   calcular el neto de la liquidación.

commit;