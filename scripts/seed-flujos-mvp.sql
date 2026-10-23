-- SEED IDÉNTICO PARA PROBAR FLUJOS M1-M4
-- Idempotente. Ejecutar en SQL Editor de Supabase (entorno de testing)
-- saldo es columna GENERADA (monto - monto_pagado), NO insertar

BEGIN;

-- 1) PROPIETARIO
INSERT INTO public.propietarios (id, rut, nombres, apellidos, telefono, email, estado)
VALUES ('11111111-1111-1111-1111-111111111111', '11111111-1', 'Carlos', 'Pérez', '+56911111111', 'propietario.test@nexo.cl', 'ACTIVO')
ON CONFLICT (id) DO UPDATE SET nombres=EXCLUDED.nombres, apellidos=EXCLUDED.apellidos, estado=EXCLUDED.estado;

-- 2) ARRENDATARIO
INSERT INTO public.arrendatarios (id, rut, nombres, apellidos, telefono, email, estado, direccion)
VALUES ('22222222-2222-2222-2222-222222222222', '22222222-2', 'María', 'González', '+56922222222', 'arrendatario.test@nexo.cl', 'ACTIVO', 'Av. Test 123')
ON CONFLICT (id) DO UPDATE SET nombres=EXCLUDED.nombres, apellidos=EXCLUDED.apellidos, estado=EXCLUDED.estado;

-- 3) PROPIEDAD
INSERT INTO public.propiedades (id, propietario_id, nombre, direccion, comuna, region, tipo, estado, valor_arriendo)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Depto Test', 'Calle Ficticia 456', 'Santiago', 'Metropolitana', 'DEPARTAMENTO', 'ARRENDADA', 500000)
ON CONFLICT (id) DO UPDATE SET propietario_id=EXCLUDED.propietario_id, estado=EXCLUDED.estado, valor_arriendo=EXCLUDED.valor_arriendo;

-- 4) CONTRATO VIGENTE
INSERT INTO public.contratos (id, propiedad_id, arrendatario_id, fecha_inicio, fecha_termino, valor_arriendo, garantia_meses, estado, dia_vencimiento, comision_porcentaje)
VALUES ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 
        current_date - interval '3 months', current_date + interval '9 months', 500000, 1, 'VIGENTE', 5, 10)
ON CONFLICT (id) DO UPDATE SET estado=EXCLUDED.estado, valor_arriendo=EXCLUDED.valor_arriendo, comision_porcentaje=EXCLUDED.comision_porcentaje;

-- 5) CUENTA SERVICIO
INSERT INTO public.cuentas_servicios (id, propiedad_id, tipo_servicio, empresa, numero_cliente, numero_cuenta, activo, monto_mensual)
VALUES ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'AGUA', 'EmpresaTest', 'CLI-TEST-001', 'CTA-TEST-001', true, 15000)
ON CONFLICT (id) DO UPDATE SET numero_cliente=EXCLUDED.numero_cliente, activo=EXCLUDED.activo, monto_mensual=EXCLUDED.monto_mensual;

-- 6) OBLIGACIONES PARA CONCILIACIÓN (saldo es generado)
INSERT INTO public.obligaciones (id, contrato_id, propiedad_id, tipo, periodo, monto, monto_pagado, estado, fecha_vencimiento)
VALUES ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 
        'ARRIENDO', date_trunc('month', current_date), 500000, 0, 'PENDIENTE', (date_trunc('month', current_date) + interval '10 days')::date)
ON CONFLICT DO NOTHING;

INSERT INTO public.obligaciones (id, contrato_id, propiedad_id, tipo, periodo, monto, monto_pagado, estado, fecha_vencimiento)
VALUES ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 
        'ARRIENDO', date_trunc('month', current_date - interval '1 month'), 500000, 0, 'VENCIDA', (date_trunc('month', current_date - interval '1 month') + interval '5 days')::date)
ON CONFLICT DO NOTHING;

COMMIT;

-- VERIFICACIÓN
SELECT 'propietarios' as tabla, count(*) FROM public.propietarios WHERE id IN ('11111111-1111-1111-1111-111111111111')
UNION ALL SELECT 'arrendatarios', count(*) FROM public.arrendatarios WHERE id IN ('22222222-2222-2222-2222-222222222222')
UNION ALL SELECT 'propiedades', count(*) FROM public.propiedades WHERE id IN ('33333333-3333-3333-3333-333333333333')
UNION ALL SELECT 'contratos', count(*) FROM public.contratos WHERE id IN ('44444444-4444-4444-4444-444444444444')
UNION ALL SELECT 'cuentas_servicios', count(*) FROM public.cuentas_servicios WHERE id IN ('55555555-5555-5555-5555-555555555555')
UNION ALL SELECT 'obligaciones', count(*) FROM public.obligaciones WHERE id IN ('66666666-6666-6666-6666-666666666666','77777777-7777-7777-7777-777777777777');
