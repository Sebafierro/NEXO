-- ============================================================================
-- NEXO - Plataforma de Gestión de Cartera Inmobiliaria
-- Script de setup para Supabase (PostgreSQL 15+)
-- Ejecutar de forma completa en: Supabase Dashboard > SQL Editor
--
-- Contenido:
--   1. Tablas transaccionales + FKs
--   2. Triggers de sincronizacion con auth.users (roles en app_metadata)
--   3. Row Level Security con roles via Custom JWT Claims
--   4. Storage bucket "respaldos" + politicas
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Extensiones
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLAS TRANSACCIONALES
-- ============================================================================

-- 1.1 Usuarios: reflejo de auth.users (se sincroniza con trigger).
create table if not exists public.usuarios (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text not null,
  nombres        text,
  apellidos      text,
  telefono       text,
  rol            text not null default 'PROPIETARIO'
                 check (rol in ('ADMINISTRADOR', 'PROPIETARIO')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.usuarios is 'Espejo de auth.users para perfiles públicos de la app.';

-- 1.2 Propietarios (dueños de propiedades). Pueden tener o no cuenta en la app.
create table if not exists public.propietarios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references public.usuarios (id) on delete set null,
  rut         text unique,
  nombres     text not null,
  apellidos   text not null,
  telefono    text,
  email       text,
  estado      text not null default 'ACTIVO'
              check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en   timestamptz not null default now()
);

comment on column public.propietarios.user_id is
  'Vínculo con la cuenta autenticada (rol PROPIETARIO). Se usa para filtrar por RLS.';

-- 1.3 Arrendatarios (inquilinos).
create table if not exists public.arrendatarios (
  id          uuid primary key default gen_random_uuid(),
  rut         text unique,
  nombres     text not null,
  apellidos   text not null,
  telefono    text,
  email       text,
  estado      text not null default 'ACTIVO'
              check (estado in ('ACTIVO', 'INACTIVO')),
  creado_en   timestamptz not null default now()
);

-- 1.4 Propiedades.
create table if not exists public.propiedades (
  id              uuid primary key default gen_random_uuid(),
  propietario_id  uuid not null references public.propietarios (id) on delete cascade,
  nombre          text,
  direccion       text not null,
  comuna          text,
  region          text,
  tipo            text not null default 'DEPARTAMENTO'
                  check (tipo in ('DEPARTAMENTO', 'CASA', 'OFICINA', 'LOCAL', 'BODEGA', 'OTRO')),
  estado          text not null default 'DISPONIBLE'
                  check (estado in ('DISPONIBLE', 'ARRENDADA', 'EN_MANTENIMIENTO', 'INACTIVA')),
  superficie_m2   numeric(10, 2),
  habitaciones    integer,
  banos           integer,
  estacionamientos integer,
  valor_arriendo  numeric(12, 2) not null default 0,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- 1.5 Contratos de arriendo.
create table if not exists public.contratos (
  id               uuid primary key default gen_random_uuid(),
  propiedad_id     uuid not null references public.propiedades (id) on delete restrict,
  arrendatario_id  uuid not null references public.arrendatarios (id) on delete restrict,
  fecha_inicio     date not null,
  fecha_termino    date,
  valor_arriendo   numeric(12, 2) not null,
  garantia_meses   integer not null default 1,
  estado           text not null default 'BORRADOR'
                   check (estado in ('BORRADOR', 'VIGENTE', 'FINALIZADO', 'RESCINDIDO')),
  creado_en        timestamptz not null default now()
);

-- 1.6 Obligaciones financieras de un contrato (arriendos, gastos comunes, etc.).
create table if not exists public.obligaciones (
  id                 uuid primary key default gen_random_uuid(),
  contrato_id        uuid not null references public.contratos (id) on delete cascade,
  tipo               text not null default 'ARRIENDO'
                     check (tipo in ('ARRIENDO', 'GASTO_COMUN', 'SERVICIO', 'OTRO')),
  descripcion        text,
  monto              numeric(12, 2) not null,
  fecha_vencimiento  date not null,
  estado             text not null default 'PENDIENTE'
                     check (estado in ('PENDIENTE', 'PAGADA', 'ATRASADA')),
  creado_en          timestamptz not null default now()
);

-- 1.7 Pagos aplicados a obligaciones.
create table if not exists public.pagos (
  id             uuid primary key default gen_random_uuid(),
  obligacion_id  uuid not null references public.obligaciones (id) on delete restrict,
  monto          numeric(12, 2) not null,
  fecha_pago     timestamptz not null default now(),
  metodo_pago    text check (metodo_pago in ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'OTRO')),
  referencia     text,
  registrado_por uuid references public.usuarios (id) on delete set null,
  creado_en      timestamptz not null default now()
);

-- 1.8 Documentos subidos al bucket "respaldos".
-- TODO: evaluar FKs parciales por entidad (ej. trigger de validación entidad_tipo/entidad_id).
create table if not exists public.documentos (
  id            uuid primary key default gen_random_uuid(),
  entidad_tipo  text not null
                check (entidad_tipo in ('PROPIEDAD', 'CONTRATO', 'PROPIETARIO', 'ARRENDATARIO', 'OBLIGACION')),
  entidad_id    uuid not null,
  tipo_documento text not null
                check (tipo_documento in ('CONTRATO', 'RENOVACION', 'PODER', 'INFORME_AVALUO', 'COMPROBANTE_PAGO', 'OTRO')),
  nombre        text not null,
  archivo_url   text not null,
  bucket        text not null default 'respaldos',
  subido_por    uuid references public.usuarios (id) on delete set null,
  creado_en     timestamptz not null default now()
);

-- 1.9 Registro de extracciones de documentos (auditoría).
create table if not exists public.extracciones_documento (
  id             uuid primary key default gen_random_uuid(),
  documento_id   uuid not null references public.documentos (id) on delete cascade,
  solicitado_por uuid not null references public.usuarios (id) on delete cascade,
  objetivo       text,
  estado         text not null default 'SOLICITADA'
                 check (estado in ('SOLICITADA', 'EN_PROCESO', 'EXTRAIDA', 'RECHAZADA')),
  creado_en      timestamptz not null default now(),
  extraida_en    timestamptz
);

-- ----------------------------------------------------------------------------
-- Índices para el acceso por FK
-- ----------------------------------------------------------------------------
create index if not exists idx_propiedades_propietario on public.propiedades (propietario_id);
create index if not exists idx_contratos_propiedad      on public.contratos (propiedad_id);
create index if not exists idx_contratos_arrendatario   on public.contratos (arrendatario_id);
create index if not exists idx_obligaciones_contrato    on public.obligaciones (contrato_id);
create index if not exists idx_obligaciones_vencimiento on public.obligaciones (fecha_vencimiento);
create index if not exists idx_pagos_obligacion         on public.pagos (obligacion_id);
create index if not exists idx_documentos_entidad       on public.documentos (entidad_tipo, entidad_id);
create index if not exists idx_propietarios_user        on public.propietarios (user_id);

-- ----------------------------------------------------------------------------
-- Trigger para actualizar actualizado_en
-- ----------------------------------------------------------------------------
create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_actualizado on public.usuarios;
create trigger trg_usuarios_actualizado
  before update on public.usuarios
  for each row execute function public.set_actualizado_en();

drop trigger if exists trg_propiedades_actualizado on public.propiedades;
create trigger trg_propiedades_actualizado
  before update on public.propiedades
  for each row execute function public.set_actualizado_en();

-- ============================================================================
-- 2. ROLES COMO CUSTOM JWT CLAIMS (app_metadata)
--    El rol viaja en el JWT como: app_metadata.rol
--    El signup debe enviar el rol en user_metadata (por defecto PROPIETARIO).
-- ============================================================================

-- 2.1 Inyecta app_metadata.rol antes de insertar el usuario.
create or replace function public.inyectar_rol_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.raw_app_meta_data := jsonb_set(
    coalesce(new.raw_app_meta_data, '{}'::jsonb),
    '{rol}',
    to_jsonb(coalesce(nullif(new.raw_user_meta_data ->> 'rol', ''), 'PROPIETARIO'))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_rol_inyectar on auth.users;
create trigger on_auth_user_rol_inyectar
  before insert on auth.users
  for each row execute function public.inyectar_rol_app_metadata();

-- 2.2 Sincroniza la fila en public.usuarios al crear el auth user.
create or replace function public.sincronizar_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, email, rol, nombres, apellidos)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data ->> 'rol', 'PROPIETARIO'),
    nullif(new.raw_user_meta_data ->> 'nombres', ''),
    nullif(new.raw_user_meta_data ->> 'apellidos', '')
  )
  on conflict (id) do update
    set email          = excluded.email,
        rol            = excluded.rol,
        nombres        = coalesce(excluded.nombres, public.usuarios.nombres),
        apellidos      = coalesce(excluded.apellidos, public.usuarios.apellidos);
  return new;
end;
$$;

drop trigger if exists on_auth_usuario_sincronizar on auth.users;
create trigger on_auth_usuario_sincronizar
  after insert on auth.users
  for each row execute function public.sincronizar_usuario();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- 3.0 Funciones de apoyo (basadas en auth.jwt())
create or replace function public.rol_usuario_jwt()
returns text
language sql
stable
as $$
  select coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'rol', ''), 'PROPIETARIO');
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
as $$
  select public.rol_usuario_jwt() = 'ADMINISTRADOR';
$$;

-- Comprueba si el usuario autenticado es dueño de una propiedad.
create or replace function public.es_propietario_de(propiedad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.propiedades p
    join public.propietarios pr on pr.id = p.propietario_id
    where p.id = propiedad_id
      and pr.user_id = auth.uid()
  );
$$;

-- Comprueba si el usuario autenticado es dueño de una entidad (documentos).
create or replace function public.es_propietario_entidad(entidad_tipo text, entidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case entidad_tipo
    when 'PROPIEDAD' then exists (
      select 1 from public.propiedades p
      join public.propietarios pr on pr.id = p.propietario_id
      where p.id = entidad_id and pr.user_id = auth.uid())
    when 'CONTRATO' then exists (
      select 1 from public.contratos c
      join public.propiedades p on p.id = c.propiedad_id
      join public.propietarios pr on pr.id = p.propietario_id
      where c.id = entidad_id and pr.user_id = auth.uid())
    when 'OBLIGACION' then exists (
      select 1 from public.obligaciones o
      join public.contratos c on c.id = o.contrato_id
      join public.propiedades p on p.id = c.propiedad_id
      join public.propietarios pr on pr.id = p.propietario_id
      where o.id = entidad_id and pr.user_id = auth.uid())
    when 'PROPIETARIO' then exists (
      select 1 from public.propietarios pr
      where pr.id = entidad_id and pr.user_id = auth.uid())
    when 'ARRENDATARIO' then exists (
      select 1 from public.contratos c
      join public.propiedades p on p.id = c.propiedad_id
      join public.propietarios pr on pr.id = p.propietario_id
      where c.arrendatario_id = entidad_id and pr.user_id = auth.uid())
    else false
  end;
$$;

-- ----------------------------------------------------------------------------
-- 3.1 RLS: usuarios
-- ----------------------------------------------------------------------------
alter table public.usuarios enable row level security;

drop policy if exists "usuarios_admin_todo" on public.usuarios;
create policy "usuarios_admin_todo"
  on public.usuarios for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "usuarios_ver_propio" on public.usuarios;
create policy "usuarios_ver_propio"
  on public.usuarios for select
  to authenticated
  using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3.2 RLS: propietarios
-- ----------------------------------------------------------------------------
alter table public.propietarios enable row level security;

drop policy if exists "propietarios_admin_todo" on public.propietarios;
create policy "propietarios_admin_todo"
  on public.propietarios for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "propietarios_ver_propio" on public.propietarios;
create policy "propietarios_ver_propio"
  on public.propietarios for select
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3.3 RLS: arrendatarios
-- ----------------------------------------------------------------------------
alter table public.arrendatarios enable row level security;

drop policy if exists "arrendatarios_admin_todo" on public.arrendatarios;
create policy "arrendatarios_admin_todo"
  on public.arrendatarios for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "arrendatarios_propietario_ver" on public.arrendatarios;
create policy "arrendatarios_propietario_ver"
  on public.arrendatarios for select
  to authenticated
  using (exists (
    select 1 from public.contratos c
    join public.propiedades p on p.id = c.propiedad_id
    join public.propietarios pr on pr.id = p.propietario_id
    where c.arrendatario_id = public.arrendatarios.id
      and pr.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 3.4 RLS: propiedades  (política de ejemplo solicitada)
--    ADMINISTRADOR -> ve todo
--    PROPIETARIO   -> solo las propiedades vinculadas a su usuario
-- ----------------------------------------------------------------------------
alter table public.propiedades enable row level security;

drop policy if exists "propiedades_admin_todo" on public.propiedades;
create policy "propiedades_admin_todo"
  on public.propiedades for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "propiedades_propietario_acceso" on public.propiedades;
create policy "propiedades_propietario_acceso"
  on public.propiedades for all
  to authenticated
  using (public.es_propietario_de(id))
  with check (exists (
    select 1 from public.propietarios pr
    where pr.id = propietario_id
      and pr.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 3.5 RLS: contratos
-- ----------------------------------------------------------------------------
alter table public.contratos enable row level security;

drop policy if exists "contratos_admin_todo" on public.contratos;
create policy "contratos_admin_todo"
  on public.contratos for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "contratos_propietario_acceso" on public.contratos;
create policy "contratos_propietario_acceso"
  on public.contratos for all
  to authenticated
  using (public.es_propietario_de(propiedad_id))
  with check (public.es_propietario_de(propiedad_id));

-- ----------------------------------------------------------------------------
-- 3.6 RLS: obligaciones
-- ----------------------------------------------------------------------------
alter table public.obligaciones enable row level security;

drop policy if exists "obligaciones_admin_todo" on public.obligaciones;
create policy "obligaciones_admin_todo"
  on public.obligaciones for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "obligaciones_propietario_acceso" on public.obligaciones;
create policy "obligaciones_propietario_acceso"
  on public.obligaciones for all
  to authenticated
  using (exists (
    select 1 from public.contratos c
    join public.propiedades p on p.id = c.propiedad_id
    join public.propietarios pr on pr.id = p.propietario_id
    where c.id = public.obligaciones.contrato_id
      and pr.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.contratos c
    join public.propiedades p on p.id = c.propiedad_id
    join public.propietarios pr on pr.id = p.propietario_id
    where c.id = public.obligaciones.contrato_id
      and pr.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 3.7 RLS: pagos
-- ----------------------------------------------------------------------------
alter table public.pagos enable row level security;

drop policy if exists "pagos_admin_todo" on public.pagos;
create policy "pagos_admin_todo"
  on public.pagos for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "pagos_propietario_acceso" on public.pagos;
create policy "pagos_propietario_acceso"
  on public.pagos for all
  to authenticated
  using (exists (
    select 1 from public.obligaciones o
    join public.contratos c on c.id = o.contrato_id
    join public.propiedades p on p.id = c.propiedad_id
    join public.propietarios pr on pr.id = p.propietario_id
    where o.id = public.pagos.obligacion_id
      and pr.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.obligaciones o
    join public.contratos c on c.id = o.contrato_id
    join public.propiedades p on p.id = c.propiedad_id
    join public.propietarios pr on pr.id = p.propietario_id
    where o.id = public.pagos.obligacion_id
      and pr.user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- 3.8 RLS: documentos
-- ----------------------------------------------------------------------------
alter table public.documentos enable row level security;

drop policy if exists "documentos_admin_todo" on public.documentos;
create policy "documentos_admin_todo"
  on public.documentos for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "documentos_propietario_acceso" on public.documentos;
create policy "documentos_propietario_acceso"
  on public.documentos for all
  to authenticated
  using (public.es_propietario_entidad(entidad_tipo, entidad_id))
  with check (public.es_propietario_entidad(entidad_tipo, entidad_id));

-- ----------------------------------------------------------------------------
-- 3.9 RLS: extracciones_documento
-- ----------------------------------------------------------------------------
alter table public.extracciones_documento enable row level security;

drop policy if exists "extracciones_admin_todo" on public.extracciones_documento;
create policy "extracciones_admin_todo"
  on public.extracciones_documento for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "extracciones_propietario_propias" on public.extracciones_documento;
create policy "extracciones_propietario_propias"
  on public.extracciones_documento for all
  to authenticated
  using (solicitado_por = auth.uid())
  with check (solicitado_por = auth.uid());

-- ============================================================================
-- 4. STORAGE: bucket "respaldos"
--    Convención de ruta: {user_id}/{entidad_tipo}/{archivo}
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('respaldos', 'respaldos', false)
on conflict (id) do nothing;

drop policy if exists "respaldos_admin_todo" on storage.objects;
create policy "respaldos_admin_todo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'respaldos' and public.es_administrador())
  with check (bucket_id = 'respaldos' and public.es_administrador());

drop policy if exists "respaldos_propietario_acceso" on storage.objects;
create policy "respaldos_propietario_acceso"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'respaldos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'respaldos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 5. DATOS SEMILLA (opcional / demo)
-- ----------------------------------------------------------------------------
-- TODO: crear ADMINISTRADOR inicial (invitación por email desde el dashboard
-- de Supabase con raw_app_meta_data.rol = 'ADMINISTRADOR').

-- ============================================================================
-- 6. TODO DE NEGOCIO PENDIENTE
--   * Trigger/función para marcar obligaciones como ATRASADA automáticamente.
--   * Función de mora: sum(monto) obligaciones ATRASADAS por contrato.
--   * Job de reminder de vencimientos (pg_cron).
--   * Validación de existencia de entidad en public.documentos.
-- ============================================================================

commit;