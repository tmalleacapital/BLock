import type { NextRequest } from 'next/server';
import { getSession, COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ email: null }, { status: 401 });

  const session = getSession(token);
  if (!session) return Response.json({ email: null }, { status: 401 });

  return Response.json({ email: session.email });
}
