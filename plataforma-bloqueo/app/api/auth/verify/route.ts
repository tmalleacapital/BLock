import type { NextRequest } from 'next/server';
import { verifyOtp, createSession, COOKIE_NAME } from '@/lib/auth';

const SESSION_MAX_AGE = 8 * 60 * 60; // 8 h in seconds

export async function POST(request: NextRequest) {
  const { email, code } = (await request.json()) as { email?: string; code?: string };

  if (!email || !code) {
    return Response.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  if (!verifyOtp(email, code)) {
    return Response.json({ error: 'Código incorrecto o expirado.' }, { status: 401 });
  }

  const token = createSession(email);

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const response = Response.json({ ok: true, email });
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
  return response;
}
