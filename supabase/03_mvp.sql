-- ============================================================================
-- NEXO - Migracion MVP (M1): esquema de tablas nuevas y extensiones
-- Complementa backend_setup.sql y 02_roles_extension.sql (no los modifica).
-- Idempotente: puede ejecutarse mas de una vez sobre la misma base de datos.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 02_roles_extension.sql)
--
-- Contenido:
--   1. Tablas nuevas: cuentas_servicios, liquidaciones, liquidacion_items,
--      conciliaciones, audit_log
--   2. Extensiones a: obligaciones, pagos, documentos, extracciones_documento
--   3. Indices y constraints
--
-- NOTA de nomenclatura: se conservan los valores existentes 'ATRASADA'
-- (estado de obligacion) y 'GASTO_COMUN' (tipo de obligacion) para no romper
-- el codigo actual. Se agregan los nuevos tipos/estados del MVP.
-- ============================================================================

begin;

-- ============================================================================
-- 1. TABLAS NUEVAS
-- ============================================================================

-- 1.1 Cuentas de servicios: permiten asociar automaticamente una boleta
--     (identificada por numero_cliente) con una propiedad.
create table if not exists public.cuentas_servicios (
  id             uuid primary key default gen_random_uuid(),
  propiedad_id   uuid not null references public.propiedades (id) on delete cascade,
  tipo_servicio  text not null
                 check (tipo_servicio in ('AGUA', 'ELECTRICIDAD', 'GAS', 'GASTOS_COMUNES', 'INTERNET', 'OTRO')),
  empresa        text not null,
  numero_cliente text not null,
  numero_cuenta  text,
  activo         boolean not null default true,
  creado_en      timestamptz not null default now()
);

comment on table public.cuentas_servicios is
  'Cuentas de servicios por propiedad. Se usan para asociar boletas OCR por numero_cliente.';

-- 1.2 Liquidaciones: cierre mensual por contrato/propietario.
create table if not exists public.liquidaciones (
  id              uuid primary key default gen_random_uuid(),
  periodo         date not null,                       -- primer dia del mes
  contrato_id     uuid not null references public.contratos (id) on delete restrict,
  propietario_id  uuid not null references public.propietarios (id) on delete restrict,
  arriendo_bruto  numeric(12, 2) not null default 0,
  gastos          numeric(12, 2) not null default 0,
  comision        numeric(12, 2) not null default 0,
  neto            numeric(12, 2) not null default 0,
  estado          text not null default 'GENERADA'
                  check (estado in ('GENERADA', 'APROBADA', 'RECHAZADA', 'PAGADA')),
  generado_por    uuid references public.usuarios (id) on delete set null,
  aprobado_por    uuid references public.usuarios (id) on delete set null,
  pdf_url         text,
  observaciones   text,
  aprobado_en     timestamptz,
  creado_en       timestamptz not null default now(),
  constraint liquidaciones_periodo_contrato unique (periodo, contrato_id)
);

-- 1.3 Items de liquidacion: desglose de conceptos (arriendo, comision, etc.).
create table if not exists public.liquidacion_items (
  id             uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references public.liquidaciones (id) on delete cascade,
  tipo           text not null
                 check (tipo in ('ARRIENDO', 'COMISION', 'REPARACION', 'REEMBOLSO', 'GASTO_COMUN', 'SERVICIO', 'OTRO')),
  concepto       text,
  monto          numeric(12, 2) not null default 0,
  signo          smallint not null default -1 check (signo in (-1, 1)),
  creado_en      timestamptz not null default now()
);

-- 1.4 Conciliaciones: rastro del cruce pago <-> obligacion.
create table if not exists public.conciliaciones (
  id             uuid primary key default gen_random_uuid(),
  pago_id        uuid not null references public.pagos (id) on delete cascade,
  obligacion_id  uuid not null references public.obligaciones (id) on delete cascade,
  monto_aplicado numeric(12, 2) not null default 0,
  diferencia     numeric(12, 2) not null default 0,
  estado         text not null default 'CONCILIADO'
                 check (estado in ('CONCILIADO', 'CON_DIFERENCIA', 'RECHAZADO')),
  resuelto_por   uuid references public.usuarios (id) on delete set null,
  resuelto_en    timestamptz not null default now(),
  observacion    text,
  creado_en      timestamptz not null default now()
);

-- 1.5 Auditoria y trazabilidad.
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid references public.usuarios (id) on delete set null,
  accion          text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  entidad         text not null,
  entidad_id      uuid,
  fecha           timestamptz not null default now(),
  ip              text,
  valor_anterior  jsonb,
  valor_nuevo     jsonb
);

comment on table public.audit_log is
  'Bitacora de cambios en entidades sensibles. Se escribe via triggers security definer.';

-- ============================================================================
-- 2. EXTENSIONES A TABLAS EXISTENTES
-- ============================================================================

-- 2.1 obligaciones
alter table public.obligaciones
  add column if not exists periodo      date,
  add column if not exists propiedad_id uuid references public.propiedades (id) on delete set null,
  add column if not exists monto_pagado numeric(12, 2) not null default 0;

-- saldo derivado (columna generada) para evitar desincronizacion.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'obligaciones'
      and column_name = 'saldo'
  ) then
    alter table public.obligaciones
      add column saldo numeric(12, 2)
      generated always as (monto - monto_pagado) stored;
  end if;
end;
$$;

-- Ampliar CHECK de tipo.
alter table public.obligaciones drop constraint if exists obligaciones_tipo_check;
alter table public.obligaciones
  add constraint obligaciones_tipo_check
  check (tipo in ('ARRIENDO', 'GASTO_COMUN', 'SERVICIO', 'AGUA', 'ELECTRICIDAD', 'MULTA', 'REPARACION', 'OTRO'));

-- Ampliar CHECK de estado (se conserva ATRASADA y se agregan los nuevos).
alter table public.obligaciones drop constraint if exists obligaciones_estado_check;
alter table public.obligaciones
  add constraint obligaciones_estado_check
  check (estado in ('PENDIENTE', 'PAGO_PARCIAL', 'PAGADA', 'ATRASADA', 'VENCIDA', 'EN_REVISION'));

-- Backfill de periodo y propiedad_id a partir del contrato.
update public.obligaciones o
   set periodo = date_trunc('month', o.fecha_vencimiento)::date
 where o.periodo is null;

update public.obligaciones o
   set propiedad_id = c.propiedad_id
  from public.contratos c
 where o.contrato_id = c.id
   and o.propiedad_id is null;

-- El CHECK original no admitia los nuevos tipos/estados: se re-crean arriba.

-- 2.2 pagos
alter table public.pagos
  add column if not exists estado_validacion text not null default 'PENDIENTE',
  add column if not exists documento_id      uuid references public.documentos (id) on delete set null,
  add column if not exists motivo_rechazo    text;

alter table public.pagos drop constraint if exists pagos_estado_validacion_check;
alter table public.pagos
  add constraint pagos_estado_validacion_check
  check (estado_validacion in ('PENDIENTE', 'VALIDADO', 'RECHAZADO'));

-- 2.3 documentos
alter table public.documentos
  add column if not exists periodo      date,
  add column if not exists hash_archivo text,
  add column if not exists estado       text not null default 'PENDIENTE',
  add column if not exists propiedad_id uuid references public.propiedades (id) on delete set null;

alter table public.documentos drop constraint if exists documentos_estado_check;
alter table public.documentos
  add constraint documentos_estado_check
  check (estado in ('PENDIENTE', 'EXTRAIDO', 'VALIDADO', 'RECHAZADO'));

-- 2.4 extracciones_documento
alter table public.extracciones_documento
  add column if not exists empresa_detectada    text,
  add column if not exists numero_cliente       text,
  add column if not exists monto_detectado      numeric(12, 2),
  add column if not exists fecha_vencimiento    date,
  add column if not exists saldo_detectado      numeric(12, 2),
  add column if not exists confianza_ocr        numeric(5, 2),
  add column if not exists resultado_validacion text,
  add column if not exists datos_crudos         jsonb;

alter table public.extracciones_documento drop constraint if exists extracciones_resultado_validacion_check;
alter table public.extracciones_documento
  add constraint extracciones_resultado_validacion_check
  check (resultado_validacion in ('CONSISTENTE', 'INCONSISTENTE', 'REVISAR'));

-- ============================================================================
-- 3. INDICES Y CONSTRAINTS
-- ============================================================================
create index if not exists idx_cuentas_servicios_propiedad on public.cuentas_servicios (propiedad_id);
create index if not exists idx_cuentas_servicios_numero    on public.cuentas_servicios (numero_cliente);

create index if not exists idx_liquidaciones_propietario   on public.liquidaciones (propietario_id);
create index if not exists idx_liquidaciones_periodo       on public.liquidaciones (periodo);
create index if not exists idx_liquidaciones_estado        on public.liquidaciones (estado);
create index if not exists idx_liquidacion_items_liq        on public.liquidacion_items (liquidacion_id);

create index if not exists idx_conciliaciones_pago         on public.conciliaciones (pago_id);
create index if not exists idx_conciliaciones_obligacion   on public.conciliaciones (obligacion_id);

create index if not exists idx_audit_log_entidad           on public.audit_log (entidad, entidad_id);
create index if not exists idx_audit_log_fecha             on public.audit_log (fecha desc);

create index if not exists idx_obligaciones_periodo        on public.obligaciones (periodo);
create index if not exists idx_obligaciones_propiedad      on public.obligaciones (propiedad_id);
create index if not exists idx_pagos_estado_validacion     on public.pagos (estado_validacion);
create index if not exists idx_documentos_propiedad        on public.documentos (propiedad_id);
create index if not exists idx_documentos_estado           on public.documentos (estado);

-- Evita subir dos veces el mismo archivo (hash global, no nulo).
create unique index if not exists uq_documentos_hash_archivo
  on public.documentos (hash_archivo)
  where hash_archivo is not null;

commit;
