import { describe, it, expect } from 'vitest'
import { formatRut, validarRut } from '@/lib/validaciones'
import { ETIQUETA_ROL, ROLES, normalizarRol } from '@/lib/roles'
import { formatearFecha, formatearMoneda } from '@/lib/format'

describe('validaciones', () => {
  it('valida RUT válido simple', () => {
    // Ejemplo conocido: 12.345.678-5? o 11111111-1 etc. Usamos uno común.
    expect(validarRut('11111111-1')).toBe(true)
  })
  it('reconoce RUT inválido', () => {
    expect(validarRut('11111111-2')).toBe(false)
  })
  it('formatea RUT', () => {
    expect(formatRut('12345678-5')).toBe('12.345.678-5')
  })
})

describe('roles', () => {
  it('normaliza rol inválido a PROPIETARIO', () => {
    expect(normalizarRol('OTRO')).toBe(ROLES.PROPIETARIO)
  })
  it('devuelve etiqueta legible', () => {
    expect(ETIQUETA_ROL[ROLES.ADMINISTRADOR]).toBe('Administrador')
    expect(ETIQUETA_ROL[ROLES.ARRENDATARIO]).toBe('Arrendatario')
  })
})

describe('format', () => {
  it('formatea moneda en CLP', () => {
    const s = formatearMoneda(500000)
    expect(s).toContain('500.000')
  })
  it('formatea fecha YYYY-MM-DD a DD-MM-YYYY', () => {
    const s = formatearFecha('2026-10-01')
    expect(s).toMatch(/\d{2}-\d{2}-\d{4}/)
  })
})
