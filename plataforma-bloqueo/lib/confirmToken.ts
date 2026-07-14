import { createHmac, timingSafeEqual } from 'crypto';

// Token firmado (HMAC-SHA256) para los enlaces "Aceptar / Rechazar" que recibe
// la inmobiliaria en el correo. Es una capacidad: quien tiene el enlace puede
// responder esa solicitud puntual, pero no puede falsificar ni alterar los datos.

const AUTH_SECRET = process.env.AUTH_SECRET || 'b-lock-default-secret-please-set-AUTH_SECRET';

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export interface ConfirmPayload {
  k: string;       // inmobiliariaKey
  rut: string;
  nombre: string;
  asesor: string;  // email del asesor
  exp: number;     // vencimiento (ms epoch)
}

function sign(payload: string): string {
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

export function signConfirm(data: Omit<ConfirmPayload, 'exp'>): string {
  const payload = JSON.stringify({ ...data, exp: Date.now() + TTL_MS });
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  return `${body}.${sign(payload)}`;
}

export function verifyConfirm(token: string): ConfirmPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let payload: string;
  try {
    payload = Buffer.from(body, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = sign(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const data = JSON.parse(payload) as ConfirmPayload;
    if (!data.k || !data.rut || !data.asesor || !Number.isFinite(data.exp)) return null;
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}
