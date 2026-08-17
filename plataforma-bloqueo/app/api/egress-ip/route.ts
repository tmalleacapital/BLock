import { cookies } from 'next/headers';
import { getSession, COOKIE_NAME, isAdmin } from '@/lib/auth';

// Diagnóstico solo-admin: revela la IP de salida del servidor (la que ve paz.cl
// y que habría que pedirle a Paz que agregue a su whitelist) y prueba, DESDE EL
// PROPIO SERVIDOR, si se puede llegar a paz.cl. Sirve para confirmar el bloqueo
// por IP/país y para obtener el valor exacto a whitelistear.
export const dynamic = 'force-dynamic';

async function probar(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const inicio = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual', cache: 'no-store' });
    return { ok: true, status: res.status, ms: Date.now() - inicio };
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: `${err.name}: ${err.message}`, ms: Date.now() - inicio };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;
  if (!session || !isAdmin(session.email)) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }

  let egressIp = 'desconocida';
  try {
    const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    egressIp = ((await r.json()) as { ip: string }).ip;
  } catch (e) {
    egressIp = `error: ${(e as Error).message}`;
  }

  // 12s: si paz.cl bloquea la IP del servidor, ni siquiera conecta.
  const paz = await probar('https://www.paz.cl/brokers/login', 12_000);

  return Response.json({ egressIp, pazReachable: paz.ok, paz });
}
