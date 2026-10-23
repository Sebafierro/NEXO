-- ============================================================================
-- NEXO - Migracion M2: ciclo financiero mensual
-- Complementa 03_mvp.sql (no lo modifica). Idempotente: puede ejecutarse mas
-- de una vez sobre la misma base de datos.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor (despues de 03_mvp.sql)
--
-- Contenido:
--   1. contratos.dia_vencimiento      (M2-1) fecha de vencimiento mensual
--   2. cuentas_servicios.monto_mensual (M2-1) monto esperado del servicio
--   3. indice unico obligaciones(contrato_id, tipo, periodo) -> idempotencia
--   4. normalizacion ATRASADA -> VENCIDA (M2-2, estado canonico)
--   5. generar_obligaciones_periodo(periodo) (M2-1)
--   6. marcar_obligaciones_vencidas()        (M2-2)
--   7. pg_cron: marcado automatico diario de mora (M2-2)
--
-- Reglas de negocio (decididas con el usuario y documentadas en PROJECT_SCOPE.md):
--   * ARRIENDO se genera con el valor_arriendo del contrato vigente.
--   * Servicios se generan desde cuentas_servicios activas usando
--     monto_mensual (cuentas sin monto se omiten y se cuentan como omitidas).
--   * Mapeo tipo_servicio -> tipo de obligacion:
--       AGUA->AGUA, ELECTRICIDAD->ELECTRICIDAD, GASTOS_COMUNES->GASTO_COMUN,
--       GAS->SERVICIO, INTERNET->SERVICIO, OTRO->OTRO
--   * fecha_vencimiento = min(dia_vencimiento, ultimo dia del mes del periodo).
--   * Ambas funciones son idempotentes: re-ejecutarlas no duplica filas.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. contratos.dia_vencimiento
-- ----------------------------------------------------------------------------
alter table public.contratos
  add column if not exists dia_vencimiento integer not null default 5;

alter table public.contratos drop constraint if exists contratos_dia_vencimiento_check;
alter table public.contratos
  add constraint contratos_dia_vencimiento_check
  check (dia_vencimiento between 1 and 28);

comment on column public.contratos.dia_vencimiento is
  'Dia del mes (1-28) en que vence la obligacion de arriendo mensual.';

-- ----------------------------------------------------------------------------
-- 2. cuentas_servicios.monto_mensual
-- ----------------------------------------------------------------------------
alter table public.cuentas_servicios
  add column if not exists monto_mensual numeric(12, 2);

alter table public.cuentas_servicios drop constraint if exists cuentas_servicios_monto_mensual_check;
alter table public.cuentas_servicios
  add constraint cuentas_servicios_monto_mensual_check
  check (monto_mensual is null or monto_mensual >= 0);

comment on column public.cuentas_servicios.monto_mensual is
  'Monto mensual esperado del servicio. Null => la cuenta no genera obligacion hasta tener monto.';

-- ----------------------------------------------------------------------------
-- 3. Indice unico (contrato_id, tipo, periodo)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.obligaciones
    where periodo is not null
    group by contrato_id, tipo, periodo
    having count(*) > 1
    limit 1
  ) then
    raise notice 'ATENCION: existen obligaciones duplicadas (contrato_id, tipo, periodo). No se crea el indice unico.';
  else
    create unique index if not exists uq_obligaciones_contrato_tipo_periodo
      on public.obligaciones (contrato_id, tipo, periodo)
      where periodo is not null;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Normalizacion ATRASADA -> VENCIDA
-- ----------------------------------------------------------------------------
update public.obligaciones
   set estado = 'VENCIDA'
 where estado = 'ATRASADA';

-- ----------------------------------------------------------------------------
-- 5. generar_obligaciones_periodo
-- ----------------------------------------------------------------------------
create or replace function public.generar_obligaciones_periodo(p_periodo date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periodo       date := date_trunc('month', coalesce(p_periodo, current_date))::date;
  v_fin_mes       date := (date_trunc('month', v_periodo) + interval '1 month - 1 day')::date;
  v_contratos     int := 0;
  v_creadas       int := 0;
  v_omitidas      int := 0;
  rec             record;
  s               record;
begin
  for rec in
    select c.id as contrato_id,
           c.propiedad_id,
           c.valor_arriendo,
           c.dia_vencimiento,
           c.fecha_inicio,
           c.fecha_termino
      from public.contratos c
     where c.estado = 'VIGENTE'
       and c.fecha_inicio <= v_fin_mes
       and (c.fecha_termino is null or c.fecha_termino >= v_periodo)
  loop
    v_contratos := v_contratos + 1;

    -- 5.1 ARRIENDO
    if not exists (
      select 1 from public.obligaciones o
       where o.contrato_id = rec.contrato_id
         and o.tipo = 'ARRIENDO'
         and o.periodo = v_periodo
    ) then
      insert into public.obligaciones
        (contrato_id, tipo, descripcion, monto, fecha_vencimiento, estado, periodo, propiedad_id, monto_pagado)
      values
        (rec.contrato_id, 'ARRIENDO', 'Arriendo mensual',
         rec.valor_arriendo,
         least(v_periodo + (rec.dia_vencimiento - 1), v_fin_mes),
         'PENDIENTE', v_periodo, rec.propiedad_id, 0);
      v_creadas := v_creadas + 1;
    end if;

    -- 5.2 Servicios
    for s in
      select cs.tipo_servicio, cs.monto_mensual
        from public.cuentas_servicios cs
       where cs.propiedad_id = rec.propiedad_id
         and cs.activo = true
    loop
      if s.monto_mensual is null or s.monto_mensual <= 0 then
        v_omitidas := v_omitidas + 1;
        continue;
      end if;

      if not exists (
        select 1 from public.obligaciones o
         where o.contrato_id = rec.contrato_id
           and o.tipo = case s.tipo_servicio
                          when 'AGUA'           then 'AGUA'
                          when 'ELECTRICIDAD'   then 'ELECTRICIDAD'
                          when 'GASTOS_COMUNES' then 'GASTO_COMUN'
                          when 'GAS'            then 'SERVICIO'
                          when 'INTERNET'       then 'SERVICIO'
                          else 'OTRO'
                        end
           and o.periodo = v_periodo
      ) then
        insert into public.obligaciones
          (contrato_id, tipo, descripcion, monto, fecha_vencimiento, estado, periodo, propiedad_id, monto_pagado)
        values
          (rec.contrato_id,
           case s.tipo_servicio
             when 'AGUA'           then 'AGUA'
             when 'ELECTRICIDAD'   then 'ELECTRICIDAD'
             when 'GASTOS_COMUNES' then 'GASTO_COMUN'
             when 'GAS'            then 'SERVICIO'
             when 'INTERNET'       then 'SERVICIO'
             else 'OTRO'
           end,
           'Servicio ' || s.tipo_servicio,
           s.monto_mensual,
           least(v_periodo + (rec.dia_vencimiento - 1), v_fin_mes),
           'PENDIENTE', v_periodo, rec.propiedad_id, 0);
        v_creadas := v_creadas + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'periodo',  v_periodo,
    'contratos', v_contratos,
    'creadas',   v_creadas,
    'omitidas',  v_omitidas
  );
end;
$$;

comment on function public.generar_obligaciones_periodo(date) is
  'Genera obligaciones mensuales (ARRIENDO + servicios activos) para contratos vigentes. Idempotente.';

-- ----------------------------------------------------------------------------
-- 6. marcar_obligaciones_vencidas
-- ----------------------------------------------------------------------------
create or replace function public.marcar_obligaciones_vencidas(p_hoy date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy   date := coalesce(p_hoy, current_date);
  v_count integer;
begin
  update public.obligaciones
     set estado = 'VENCIDA'
   where estado in ('PENDIENTE', 'PAGO_PARCIAL')
     and fecha_vencimiento < v_hoy
     and saldo > 0;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.marcar_obligaciones_vencidas(date) is
  'Marca VENCIDA toda obligacion no pagada con fecha de vencimiento pasada. Idempotente.';

-- ----------------------------------------------------------------------------
-- 7. pg_cron
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (
      select 1 from cron.job where jobname = 'nexo-marcar-obligaciones-vencidas'
    ) then
      perform cron.schedule(
        'nexo-marcar-obligaciones-vencidas',
        '0 3 * * *',
        'select public.marcar_obligaciones_vencidas()'
      );
    end if;
  else
    raise notice 'pg_cron no esta instalado.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. Trigger auditoria obligaciones
-- ----------------------------------------------------------------------------
drop trigger if exists trg_audit_obligaciones on public.obligaciones;
create trigger trg_audit_obligaciones
  after insert or update or delete on public.obligaciones
  for each row execute function public.audit_row();

commit;
