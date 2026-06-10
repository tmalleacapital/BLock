import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'b_lock_session';
const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico', '/logo.svg', '/LogoBLock'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and auth API routes
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
