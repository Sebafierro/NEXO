-- ============================================================================
-- NEXO - Restablece el escenario de demostracion M1-M4
--
-- SOLO ENTORNOS DE DESARROLLO / TESTING. NO ejecutar en produccion.
--
-- Borra unicamente filas del seed (UUIDs fijos y contratos demo) para poder
-- volver a cargar supabase/11_seed_demo.sql desde un estado conocido.
-- No toca auth.users ni public.usuarios: las 4 cuentas de login se conservan.
--
-- Orden: hijas -> padres, respetando FKs (pagos restrict, liquidaciones restrict).
-- ============================================================================

begin;

-- Liquidaciones generadas durante la demo (unicidad periodo+contrato).
delete from public.liquidacion_items
 where liquidacion_id in (
   select id from public.liquidaciones
    where contrato_id in (
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444445'
    )
 );

delete from public.liquidaciones
 where contrato_id in (
   '44444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444445'
 );

delete from public.conciliaciones
 where pago_id in (
   '77777777-7777-7777-7777-777777777777',
   '77777777-7777-7777-7777-777777777778'
 )
    or obligacion_id in (
      select id from public.obligaciones
       where contrato_id in (
         '44444444-4444-4444-4444-444444444444',
         '44444444-4444-4444-4444-444444444445'
       )
    )
    or id = '99999999-9999-9999-9999-999999999999';

delete from public.pagos
 where obligacion_id in (
   select id from public.obligaciones
    where contrato_id in (
      '44444444-4444-4444-4444-444444444444',
      '44444444-4444-4444-4444-444444444445'
    )
 )
    or id in (
      '77777777-7777-7777-7777-777777777777',
      '77777777-7777-7777-7777-777777777778'
    );

delete from public.extracciones_documento
 where documento_id in (
   '88888888-8888-8888-8888-888888888888',
   '88888888-8888-8888-8888-888888888889'
 )
    or id = '12121212-1212-1212-1212-121212121212';

delete from public.documentos
 where id in (
   '88888888-8888-8888-8888-888888888888',
   '88888888-8888-8888-8888-888888888889'
 )
    or (
      entidad_tipo = 'OBLIGACION'
      and entidad_id in (
        select id from public.obligaciones
         where contrato_id in (
           '44444444-4444-4444-4444-444444444444',
           '44444444-4444-4444-4444-444444444445'
         )
      )
    );

delete from public.obligaciones
 where contrato_id in (
   '44444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444445'
 );

delete from public.cuentas_servicios
 where id in (
   '55555555-5555-5555-5555-555555555555',
   '55555555-5555-5555-5555-555555555556',
   '55555555-5555-5555-5555-555555555557'
 );

delete from public.contratos
 where id in (
   '44444444-4444-4444-4444-444444444444',
   '44444444-4444-4444-4444-444444444445'
 );

-- Las propiedades y fichas se re-upsertan en 11_seed_demo.sql; no se borran
-- para no romper otras filas que un operador haya creado a mano sobre los
-- mismos UUID. 11 actualiza nombre/estado/valor.

commit;

-- Siguiente paso: ejecutar supabase/11_seed_demo.sql
select 'reset_demo_ok' as estado;
