-- ============================================================================
-- NEXO - Migracion MVP (M1): RLS de tablas nuevas + auditoria
-- Complementa 03_mvp.sql. Idempotente.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 03_mvp.sql)
--
-- Contenido:
--   1. RLS: cuentas_servicios, liquidaciones, liquidacion_items,
--           conciliaciones, audit_log
--   2. Funcion generica audit_row() + triggers sobre entidades sensibles
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helpers de propiedad de liquidacion (para PROPIETARIO)
-- ----------------------------------------------------------------------------
create or replace function public.es_propietario_de_liquidacion(propietario_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.propietarios pr
    where pr.id = propietario_id
      and pr.user_id = auth.uid()
  );
$$;

-- ============================================================================
-- 1. RLS
-- ============================================================================

-- 1.1 cuentas_servicios
alter table public.cuentas_servicios enable row level security;

drop policy if exists "cuentas_servicios_admin_todo" on public.cuentas_servicios;
create policy "cuentas_servicios_admin_todo"
  on public.cuentas_servicios for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "cuentas_servicios_ejecutivo_lectura" on public.cuentas_servicios;
create policy "cuentas_servicios_ejecutivo_lectura"
  on public.cuentas_servicios for select
  to authenticated
  using (public.es_ejecutivo());

drop policy if exists "cuentas_servicios_propietario_lectura" on public.cuentas_servicios;
create policy "cuentas_servicios_propietario_lectura"
  on public.cuentas_servicios for select
  to authenticated
  using (public.es_propietario_de(propiedad_id));

-- 1.2 liquidaciones
alter table public.liquidaciones enable row level security;

drop policy if exists "liquidaciones_admin_todo" on public.liquidaciones;
create policy "liquidaciones_admin_todo"
  on public.liquidaciones for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- El EJECUTIVO genera y ajusta, pero no puede aprobar.
drop policy if exists "liquidaciones_ejecutivo_operacion" on public.liquidaciones;
create policy "liquidaciones_ejecutivo_operacion"
  on public.liquidaciones for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo() and estado <> 'APROBADA');

-- El PROPIETARIO solo ve sus liquidaciones.
drop policy if exists "liquidaciones_propietario_lectura" on public.liquidaciones;
create policy "liquidaciones_propietario_lectura"
  on public.liquidaciones for select
  to authenticated
  using (public.es_propietario_de_liquidacion(propietario_id));

-- 1.3 liquidacion_items
alter table public.liquidacion_items enable row level security;

drop policy if exists "liquidacion_items_admin_todo" on public.liquidacion_items;
create policy "liquidacion_items_admin_todo"
  on public.liquidacion_items for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "liquidacion_items_ejecutivo_operacion" on public.liquidacion_items;
create policy "liquidacion_items_ejecutivo_operacion"
  on public.liquidacion_items for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

drop policy if exists "liquidacion_items_propietario_lectura" on public.liquidacion_items;
create policy "liquidacion_items_propietario_lectura"
  on public.liquidacion_items for select
  to authenticated
  using (exists (
    select 1 from public.liquidaciones l
    where l.id = public.liquidacion_items.liquidacion_id
      and public.es_propietario_de_liquidacion(l.propietario_id)
  ));

-- 1.4 conciliaciones
alter table public.conciliaciones enable row level security;

drop policy if exists "conciliaciones_admin_todo" on public.conciliaciones;
create policy "conciliaciones_admin_todo"
  on public.conciliaciones for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

drop policy if exists "conciliaciones_ejecutivo_operacion" on public.conciliaciones;
create policy "conciliaciones_ejecutivo_operacion"
  on public.conciliaciones for all
  to authenticated
  using (public.es_ejecutivo())
  with check (public.es_ejecutivo());

drop policy if exists "conciliaciones_arrendatario_lectura" on public.conciliaciones;
create policy "conciliaciones_arrendatario_lectura"
  on public.conciliaciones for select
  to authenticated
  using (exists (
    select 1 from public.obligaciones o
    where o.id = public.conciliaciones.obligacion_id
      and public.es_arrendatario_de(o.contrato_id)
  ));

-- 1.5 audit_log (solo lectura para ADMIN; la escritura es via trigger)
alter table public.audit_log enable row level security;

drop policy if exists "audit_log_admin_lectura" on public.audit_log;
create policy "audit_log_admin_lectura"
  on public.audit_log for select
  to authenticated
  using (public.es_administrador());

-- ============================================================================
-- 2. AUDITORIA
-- ============================================================================
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old   jsonb;
  v_new   jsonb;
  v_id    uuid;
  v_ip    text;
begin
  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old);
  end if;
  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new);
  end if;

  v_id := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);

  begin
    v_ip := (nullif(current_setting('request.headers', true), ''))::jsonb ->> 'x-forwarded-for';
  exception when others then
    v_ip := null;
  end;

  insert into public.audit_log (
    usuario_id, accion, entidad, entidad_id, ip, valor_anterior, valor_nuevo
  ) values (
    auth.uid(), tg_op, tg_table_name, v_id, v_ip, v_old, v_new
  );

  return coalesce(new, old);
end;
$$;

-- Triggers sobre entidades sensibles.
drop trigger if exists trg_audit_usuarios on public.usuarios;
create trigger trg_audit_usuarios
  after insert or update or delete on public.usuarios
  for each row execute function public.audit_row();

drop trigger if exists trg_audit_contratos on public.contratos;
create trigger trg_audit_contratos
  after insert or update or delete on public.contratos
  for each row execute function public.audit_row();

drop trigger if exists trg_audit_pagos on public.pagos;
create trigger trg_audit_pagos
  after insert or update or delete on public.pagos
  for each row execute function public.audit_row();

drop trigger if exists trg_audit_liquidaciones on public.liquidaciones;
create trigger trg_audit_liquidaciones
  after insert or update or delete on public.liquidaciones
  for each row execute function public.audit_row();

commit;
