import { cookies } from 'next/headers';
import net from 'node:net';
import tls from 'node:tls';
import dnsp from 'node:dns/promises';
import { getSession, COOKIE_NAME, isAdmin } from '@/lib/auth';

// Diagnóstico solo-admin del bloqueo por IP de paz.cl.
//
// El endpoint viejo solo hacía un fetch y devolvía "fetch failed", que no
// distingue si el problema es DNS, TCP, TLS o HTTP. Este prueba capa por capa y
// contra CADA IP de paz.cl por separado (el dominio resuelve a dos), más
// controles contra hosts que sabemos abiertos para demostrar que la salida de
// Railway sí funciona. Así se puede decirle a Paz exactamente qué falla.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 6_000;

type Probe = { ok: boolean; ms: number; detalle?: string; error?: string };

function ahora() {
  return Date.now();
}

/** Conexión TCP cruda. Distingue DROP (timeout) de REJECT (ECONNREFUSED/RST). */
function tcp(host: string, port: number, ms = TIMEOUT_MS): Promise<Probe> {
  return new Promise((resolve) => {
    const inicio = ahora();
    const sock = new net.Socket();
    let listo = false;
    const cerrar = (r: Probe) => {
      if (listo) return;
      listo = true;
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(ms);
    sock.once('connect', () => cerrar({ ok: true, ms: ahora() - inicio, detalle: 'conectó' }));
    sock.once('timeout', () =>
      cerrar({ ok: false, ms: ahora() - inicio, error: 'timeout (sin respuesta = firewall DROP)' }),
    );
    sock.once('error', (e: NodeJS.ErrnoException) =>
      cerrar({ ok: false, ms: ahora() - inicio, error: `${e.code || e.name}: ${e.message}` }),
    );
    sock.connect(port, host);
  });
}

/** Handshake TLS contra una IP concreta, con SNI del dominio real. */
function tlsHandshake(ip: string, servername: string, ms = TIMEOUT_MS): Promise<Probe> {
  return new Promise((resolve) => {
    const inicio = ahora();
    let listo = false;
    const sock = tls.connect({ host: ip, port: 443, servername, rejectUnauthorized: false });
    const cerrar = (r: Probe) => {
      if (listo) return;
      listo = true;
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(ms);
    sock.once('secureConnect', () => {
      const cert = sock.getPeerCertificate();
      cerrar({
        ok: true,
        ms: ahora() - inicio,
        detalle: `${sock.getProtocol() || '?'} · cert CN=${cert?.subject?.CN || '?'}`,
      });
    });
    sock.once('timeout', () => cerrar({ ok: false, ms: ahora() - inicio, error: 'timeout en handshake TLS' }));
    sock.once('error', (e: NodeJS.ErrnoException) =>
      cerrar({ ok: false, ms: ahora() - inicio, error: `${e.code || e.name}: ${e.message}` }),
    );
  });
}

/** GET HTTP completo, con user-agent de navegador real. */
async function http(url: string, ms = TIMEOUT_MS): Promise<Probe> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const inicio = ahora();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
    });
    return {
      ok: true,
      ms: ahora() - inicio,
      detalle: `HTTP ${res.status} · server=${res.headers.get('server') || '?'}`,
    };
  } catch (e) {
    const err = e as Error;
    const causa = (e as { cause?: Error }).cause;
    return {
      ok: false,
      ms: ahora() - inicio,
      error: `${err.name}: ${err.message}${causa ? ` (causa: ${causa.message})` : ''}`,
    };
  } finally {
    clearTimeout(t);
  }
}

/** Llama a ipify varias veces: revela si Railway rota entre las IPs del pool. */
async function egressIps(intentos = 6): Promise<{ vistas: string[]; error?: string }> {
  const vistas = new Set<string>();
  let error: string | undefined;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      vistas.add(((await r.json()) as { ip: string }).ip);
    } catch (e) {
      error = (e as Error).message;
    }
  }
  return { vistas: [...vistas].sort(), error };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;
  if (!session || !isAdmin(session.email)) {
    return Response.json({ error: 'No autorizado.' }, { status: 403 });
  }

  // 1. IPs de salida (varias muestras: el pool estático de Railway tiene 3).
  const salida = await egressIps();

  // 2. DNS de paz.cl desde el propio servidor.
  const dns: { a: string[]; aaaa: string[]; error?: string } = { a: [], aaaa: [] };
  try {
    dns.a = await dnsp.resolve4('www.paz.cl');
  } catch (e) {
    dns.error = `A: ${(e as Error).message}`;
  }
  try {
    dns.aaaa = await dnsp.resolve6('www.paz.cl');
  } catch {
    /* sin AAAA es lo esperado */
  }

  // 3. Controles: si estos fallan, el problema es de Railway, no de Paz.
  const control = {
    'api.ipify.org:443': await tcp('api.ipify.org', 443),
    // Otro host chileno con IIS, para descartar bloqueo país/rango genérico.
    'www.sii.cl:443': await tcp('www.sii.cl', 443),
  };

  // 4. Prueba por IP de Paz: TCP 443, TCP 80 y TLS. Si TCP 443 da timeout y el
  //    control conecta, es filtrado del lado de Paz para esta IP de salida.
  const ips = dns.a.length ? dns.a : ['190.96.7.190', '190.96.7.246'];
  const porIp: Record<string, Record<string, Probe>> = {};
  for (const ip of ips) {
    porIp[ip] = {
      'tcp:443': await tcp(ip, 443),
      'tcp:80': await tcp(ip, 80),
      'tls:443': await tlsHandshake(ip, 'www.paz.cl'),
    };
  }

  // 5. HTTP por nombre, con y sin www (por si el whitelist se aplicó a un host).
  const porUrl = {
    'https://www.paz.cl/brokers/login': await http('https://www.paz.cl/brokers/login'),
    'https://paz.cl/': await http('https://paz.cl/'),
    'http://www.paz.cl/': await http('http://www.paz.cl/'),
  };

  const alcanzable = Object.values(porUrl).some((p) => p.ok);

  // 6. Metadatos de Railway: la región determina desde dónde sale el tráfico y
  //    qué país geolocaliza la IP (clave si Paz filtra por país).
  const railway = {
    region: process.env.RAILWAY_REPLICA_REGION || process.env.RAILWAY_REGION || null,
    entorno: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || null,
    servicio: process.env.RAILWAY_SERVICE_NAME || null,
  };

  return Response.json({
    resumen: {
      pazReachable: alcanzable,
      railwayRegion: railway.region,
      ipsDeSalida: salida.vistas,
      egressIp: salida.vistas[0] ?? 'desconocida',
      controlesOk: Object.values(control).every((p) => p.ok),
      tcpAbiertoEnAlgunaIpDePaz: Object.values(porIp).some((p) => p['tcp:443'].ok),
    },
    salidaError: salida.error,
    railway,
    dns,
    control,
    paz: { porIp, porUrl },
  });
}
