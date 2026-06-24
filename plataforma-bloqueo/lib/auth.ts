import { randomInt, createHmac, timingSafeEqual } from 'crypto';
import nodemailer from 'nodemailer';

// ── Global state (sólo OTP; las sesiones son stateless y firmadas) ────────────

const MAX_OTP_ATTEMPTS = 5;

type AuthGlobal = {
  __auth_otps: Map<string, { code: string; expiresAt: number; sentAt: number; attempts: number }>;
};

const g = global as typeof global & Partial<AuthGlobal>;
g.__auth_otps ??= new Map();

const otps = g.__auth_otps!;

// Secreto para firmar las cookies de sesión. Debe ser ESTABLE entre deploys
// (configúralo en Railway → Variables como AUTH_SECRET). El valor por defecto
// mantiene las sesiones válidas aunque no se configure, pero es menos seguro.
const AUTH_SECRET = process.env.AUTH_SECRET || 'b-lock-default-secret-please-set-AUTH_SECRET';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;   // 8 h
const OTP_TTL_MS     = 10 * 60 * 1000;        // 10 min
const OTP_RATE_MS    = 60 * 1000;             // 1 min entre reenvíos

export const COOKIE_NAME = 'b_lock_session';

export const ALLOWED_DOMAINS = ['capitalinteligente.cl', 'capitalinteligente.me'];

export const ADMIN_EMAILS = [
  'vpedrerop@capitalinteligente.cl',
  'tmallea@capitalinteligente.cl',
  'amarisio@capitalinteligente.cl',
  'djerez@capitalinteligente.cl',
  'cgonzalez@capitalinteligente.cl',
];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// ── Domain validation ─────────────────────────────────────────────────────────

export function isAllowedEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return ALLOWED_DOMAINS.some((d) => lower.endsWith(`@${d}`));
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export function canSendOtp(email: string): boolean {
  const existing = otps.get(email);
  if (!existing) return true;
  return Date.now() - existing.sentAt >= OTP_RATE_MS;
}

export function generateOtp(email: string): string {
  const code = String(randomInt(100000, 1000000));
  otps.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, sentAt: Date.now(), attempts: 0 });
  return code;
}

export function verifyOtp(email: string, code: string): boolean {
  const entry = otps.get(email);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otps.delete(email); return false; }
  if (entry.code !== code.trim()) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_OTP_ATTEMPTS) otps.delete(email);
    return false;
  }
  otps.delete(email);
  return true;
}

// ── Session ───────────────────────────────────────────────────────────────────

// Las sesiones son tokens firmados (HMAC-SHA256), sin estado en el servidor.
// Sobreviven a reinicios/deploys porque sólo dependen de AUTH_SECRET.
// Formato: base64url(payload) + "." + base64url(HMAC(payload))
//          payload = "email|expiresAtMs"

function signPayload(payload: string): string {
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

export function createSession(email: string): string {
  const payload = `${email}|${Date.now() + SESSION_TTL_MS}`;
  const body = Buffer.from(payload, 'utf8').toString('base64url');
  return `${body}.${signPayload(payload)}`;
}

export function getSession(token: string): { email: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let payload: string;
  try {
    payload = Buffer.from(body, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = signPayload(payload);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  const sep = payload.lastIndexOf('|');
  if (sep === -1) return null;
  const email = payload.slice(0, sep);
  const expiresAt = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { email };
}

// Stateless: no hay nada que borrar en el servidor; el logout limpia la cookie.
export function deleteSession(token: string): void {
  void token;
}

// ── Email sender ──────────────────────────────────────────────────────────────

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;
  if (!user || !pass) throw new Error('GMAIL_USER / GMAIL_PASS no configurados en .env');
  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
  return _transporter;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  if (!user) throw new Error('GMAIL_USER / GMAIL_PASS no configurados en .env');

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"B-Lock · Capital Inteligente" <${user}>`,
    to,
    subject: `[B-Lock] Código de acceso: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1a3066;margin-bottom:8px;">Código de acceso</h2>
        <p style="color:#555;font-size:14px;margin-bottom:24px;">
          Ingresa este código en la plataforma B-Lock para iniciar sesión.
          Válido por <strong>10 minutos</strong>.
        </p>
        <div style="background:#f4f6fa;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#1a3066;">${code}</span>
        </div>
        <p style="color:#999;font-size:12px;">
          Si no solicitaste este código, puedes ignorar este mensaje.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#999;font-size:11px;">Capital Inteligente · stock@capitalinteligente.cl</p>
      </div>
    `,
  });
}

export async function sendConfirmationEmail(params: {
  to: string;
  rut: string;
  nombre: string;
  inmobiliariaName: string;
  fecha: string;
}): Promise<void> {
  const senderUser = process.env.GMAIL_USER;
  if (!senderUser) return;

  const transporter = getTransporter();
  const fechaFmt = new Date(params.fecha).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await transporter.sendMail({
    from: `"B-Lock · Capital Inteligente" <${senderUser}>`,
    to: params.to,
    subject: `[B-Lock] Bloqueo registrado — ${params.rut} · ${params.inmobiliariaName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1a3066;margin-bottom:8px;">Bloqueo registrado</h2>
        <p style="color:#555;font-size:14px;margin-bottom:24px;">
          El siguiente cliente fue bloqueado correctamente en el portal.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#888;width:130px;">RUT</td>
            <td style="padding:10px 0;color:#111;font-weight:600;">${params.rut}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#888;">Nombre</td>
            <td style="padding:10px 0;color:#111;">${params.nombre || '—'}</td>
          </tr>
          <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:10px 0;color:#888;">Portal</td>
            <td style="padding:10px 0;color:#111;">${params.inmobiliariaName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888;">Fecha</td>
            <td style="padding:10px 0;color:#111;">${fechaFmt}</td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
        <p style="color:#999;font-size:11px;">Capital Inteligente · B-Lock · stock@capitalinteligente.cl</p>
      </div>
    `,
  });
}
