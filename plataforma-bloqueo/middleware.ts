import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'b_lock_session';
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/logo.svg', '/LogoBLock'];
const AUTH_SECRET = process.env.AUTH_SECRET || 'b-lock-default-secret-please-set-AUTH_SECRET';

function fromB64url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return atob(b64 + pad);
}

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  }
  return keyPromise;
}

// Verifica el mismo token firmado que produce lib/auth.ts (HMAC-SHA256).
async function isValidToken(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [body, sig] = parts;

  let payload: string;
  try {
    payload = fromB64url(body);
  } catch {
    return false;
  }

  const mac = await crypto.subtle.sign('HMAC', await getKey(), new TextEncoder().encode(payload));
  if (bytesToB64url(new Uint8Array(mac)) !== sig) return false;

  const sep = payload.lastIndexOf('|');
  if (sep === -1) return false;
  const email = payload.slice(0, sep);
  const expiresAt = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Estáticos y API de auth: pasar siempre.
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // El resto de /api/* valida su propia sesión en cada handler → no redirigir
  // (evitamos devolver el HTML de login a las llamadas fetch).
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await isValidToken(token) : false;

  // Página de login.
  if (pathname === '/login') {
    if (valid) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    // Cookie inválida/vencida → borrarla para cortar cualquier bucle.
    const res = NextResponse.next();
    if (token) res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Rutas protegidas.
  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
