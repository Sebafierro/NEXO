-- ============================================================================
-- NEXO - M5: Importación masiva + vista de auditoría
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- 1) VISTA FILTRABLE DE AUDITORÍA PARA ADMINISTRADOR
-- ----------------------------------------------------------------------------
drop view if exists public.vista_auditoria;
create or replace view public.vista_auditoria as
select
  al.id,
  al.fecha,
  al.accion,
  al.entidad,
  al.entidad_id,
  al.usuario_id,
  al.ip,
  al.valor_anterior,
  al.valor_nuevo,
  u.email as usuario_email,
  coalesce(trim(concat_ws(' ', u.nombres, u.apellidos)), u.email) as usuario_nombre,
  u.rol as usuario_rol
from public.audit_log al
left join public.usuarios u on u.id = al.usuario_id;

comment on view public.vista_auditoria is
  'Vista filtrable de auditoría para el panel de administrador (usuario, acción, entidad, fecha, valor anterior/nuevo).';

grant select on public.vista_auditoria to authenticated;

-- RLS no se aplica directamente a vistas en el mismo sentido; el acceso se controla
-- vía las políticas de las tablas subyacentes y por autorización en la aplicación.
-- Aseguramos que solo administradores puedan consultarla desde el frontend (exigirRol).

commit;
