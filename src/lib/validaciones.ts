export function normalizarRut(rut: string) {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

export function validarRut(rut: string) {
  const r = normalizarRut(rut);
  if (r.length < 2) return false;
  const cuerpo = r.slice(0, -1);
  const dv = r.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = suma % 11;
  const dvCalc = 11 - resto === 11 ? "0" : 11 - resto === 10 ? "K" : String(11 - resto);
  return dvCalc === dv;
}

export function formatRut(rut: string) {
  const r = normalizarRut(rut);
  if (r.length < 2) return rut;
  const cuerpo = r.slice(0, -1);
  const dv = r.slice(-1);
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
}

export function isEmail(val: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
}

export function toNumero(val: unknown) {
  if (typeof val === "number") return val;
  if (typeof val === "string") return Number(val);
  return NaN;
}

export function fechaValida(val: string | null | undefined) {
  if (!val) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}
