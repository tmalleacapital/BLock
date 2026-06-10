import type { NextRequest } from 'next/server';
import { isAllowedEmail, canSendOtp, generateOtp, sendOtpEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email?: string };

  if (!email || !isAllowedEmail(email)) {
    return Response.json(
      { error: 'El correo debe ser @capitalinteligente.cl o @capitalinteligente.me' },
      { status: 400 },
    );
  }

  if (!canSendOtp(email)) {
    return Response.json(
      { error: 'Espera un momento antes de solicitar otro código.' },
      { status: 429 },
    );
  }

  const code = generateOtp(email);

  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    return Response.json(
      { error: `No se pudo enviar el correo: ${err instanceof Error ? err.message : 'error desconocido'}` },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
