/**
 * Vigencia de un bloqueo.
 *
 * Un cliente bloqueado (por portal o por correo) queda tomado por 15 días
 * corridos contados desde la fecha del bloqueo. Pasado ese plazo el cliente se
 * libera y se puede volver a bloquear.
 */

export const DIAS_BLOQUEO = 15;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha en que el bloqueo expira y el cliente queda liberado. */
export function venceEl(fechaIso: string): Date {
  const d = new Date(fechaIso);
  d.setDate(d.getDate() + DIAS_BLOQUEO);
  return d;
}

/** Días que faltan para que se libere (0 si ya venció). */
export function diasRestantes(fechaIso: string, ahora: Date = new Date()): number {
  const ms = venceEl(fechaIso).getTime() - ahora.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / MS_POR_DIA);
}

/** true mientras el bloqueo siga tomando al cliente. */
export function estaVigente(fechaIso: string, ahora: Date = new Date()): boolean {
  return venceEl(fechaIso).getTime() > ahora.getTime();
}
