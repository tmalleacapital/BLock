/**
 * Recientes y favoritos de inmobiliarias — por navegador (localStorage).
 *
 * Son preferencias de navegación del asesor, no datos del servidor: viven solo
 * en el dispositivo. Todas las funciones son no-op seguras en SSR.
 */

const K_FAV = 'block_favoritos';
const K_REC = 'block_recientes';
const MAX_REC = 6;

function leer(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

function guardar(key: string, valor: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(valor));
  } catch {
    // storage lleno o bloqueado — se ignora
  }
}

export function getFavoritos(): string[] {
  return leer(K_FAV);
}

export function toggleFavorito(key: string): string[] {
  const cur = leer(K_FAV);
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
  guardar(K_FAV, next);
  return next;
}

export function getRecientes(): string[] {
  return leer(K_REC);
}

/** Registra que se usó una inmobiliaria (la deja de primera, sin duplicar). */
export function pushReciente(key: string): void {
  const cur = leer(K_REC).filter((k) => k !== key);
  guardar(K_REC, [key, ...cur].slice(0, MAX_REC));
}
