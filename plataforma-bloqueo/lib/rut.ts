// Validación de RUT chileno mediante el algoritmo de módulo 11.

/** Deja sólo dígitos y el dígito verificador (0-9 o K), en mayúscula. */
function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Valida un RUT chileno con módulo 11.
 * Acepta el RUT con o sin puntos/guion (ej: "12.345.678-5", "123456785").
 */
export function validarRut(rut: string): boolean {
  const clean = limpiarRut(rut);
  if (clean.length < 2) return false;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;

  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dvEsperado === dv;
}
