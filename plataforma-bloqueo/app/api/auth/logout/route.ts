import type { NextRequest } from 'next/server';
import { deleteSession, COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) deleteSession(token);

  const response = Response.json({ ok: true });
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}
