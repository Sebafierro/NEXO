-- Seeds de prueba reproducibles M1-M4 (datos sintéticos) - SOLO ENTORNOS DE TESTING
insert into public.propietarios (id, rut, nombres, apellidos, telefono, email, estado)
values ('11111111-1111-1111-1111-111111111111', '11111111-1', 'Carlos', 'Pérez', '+56911111111', 'propietario.test@nexo.cl', 'ACTIVO')
on conflict (id) do nothing;

insert into public.arrendatarios (id, rut, nombres, apellidos, telefono, email, estado, direccion)
values ('22222222-2222-2222-2222-222222222222', '22222222-2', 'María', 'González', '+56922222222', 'arrendatario.test@nexo.cl', 'ACTIVO', 'Av. Test 123')
on conflict (id) do nothing;

insert into public.propiedades (id, propietario_id, nombre, direccion, comuna, region, tipo, estado, valor_arriendo)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Depto Test', 'Calle Ficticia 456', 'Santiago', 'Metropolitana', 'DEPARTAMENTO', 'ARRENDADA', 500000)
on conflict (id) do nothing;

insert into public.contratos (id, propiedad_id, arrendatario_id, fecha_inicio, fecha_termino, valor_arriendo, garantia_meses, estado, dia_vencimiento, comision_porcentaje)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', current_date - interval '3 months', current_date + interval '9 months', 500000, 1, 'VIGENTE', 5, 10)
on conflict (id) do nothing;

insert into public.cuentas_servicios (id, propiedad_id, tipo_servicio, empresa, numero_cliente, numero_cuenta, activo)
values ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'AGUA', 'EmpresaTest', 'CLI-TEST-001', 'CTA-TEST-001', true)
on conflict (id) do nothing;
