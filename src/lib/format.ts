const formato = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
});

export function formatearMoneda(valor: number) {
  return formato.format(valor);
}