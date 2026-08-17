// Secreto compartido para firmar sesiones (lib/auth.ts), tokens de confirmación
// (lib/confirmToken.ts) y validar rutas (middleware.ts). Todos deben usar EXACTAMENTE
// el mismo valor, por eso vive en un único lugar.
//
// En producción DEBE estar definido: si falta la variable o quedó el default del
// repositorio, la app se niega a operar. Así evitamos el peor escenario (cualquiera
// podría forjar cookies de admin o firmar tokens de confirmación arbitrarios).
const DEFAULT_SECRET = 'b-lock-default-secret-please-set-AUTH_SECRET';

function resolveSecret(): string {
  const secret = process.env.AUTH_SECRET;
  // El candado aplica en RUNTIME de producción, no durante `next build`
  // (en el build la variable puede no estar y no queremos romper la compilación).
  const enBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (!enBuild && process.env.NODE_ENV === 'production' && (!secret || secret === DEFAULT_SECRET)) {
    throw new Error(
      'AUTH_SECRET no está configurado en producción. Define la variable de entorno ' +
        'AUTH_SECRET con un valor secreto y aleatorio.',
    );
  }
  return secret || DEFAULT_SECRET; // en desarrollo cae al default por comodidad
}

export const AUTH_SECRET = resolveSecret();
