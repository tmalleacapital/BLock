import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, COOKIE_NAME, sendConfirmationEmail } from '@/lib/auth';
import { getAllHistory, addRecord, isDuplicate } from '@/lib/historyServer';
import type { BlockingRecord } from '@/lib/historyServer';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? getSession(token) : null;
}

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return Response.json({ error: 'No autenticado.' }, { status: 401 });

  const all = getAllHistory();
  // ?mine=1 → solo los bloqueos del asesor de la sesión (vista "Mis bloqueos").
  const mine = new URL(request.url).searchParams.get('mine') === '1';
  if (mine) {
    const email = session.email.toLowerCase();
    return Response.json(all.filter((r) => (r.asesorEmail ?? '').toLowerCase() === email));
  }
  return Response.json(all);
}

export async function POST(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return Response.json({ error: 'No autenticado.' }, { status: 401 });

  const body = (await request.json()) as Partial<Omit<BlockingRecord, 'id' | 'fecha'>>;

  if (!body.inmobiliariaKey || !body.rut) {
    return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  // Las inmobiliarias por correo esperan confirmación → arrancan "pendiente".
  const esPorCorreo = !!INMOBILIARIAS.find((i) => i.key === body.inmobiliariaKey)?.emailRecipients?.length;

  const record = addRecord({
    inmobiliariaKey: body.inmobiliariaKey,
    inmobiliariaName: body.inmobiliariaName ?? body.inmobiliariaKey,
    rut: body.rut,
    nombre: body.nombre ?? '',
    asesorEmail: body.asesorEmail,
    status: esPorCorreo ? 'pendiente' : undefined,
  });

  // Enviar confirmación al asesor sin bloquear la respuesta
  if (body.asesorEmail) {
    sendConfirmationEmail({
      to: body.asesorEmail,
      rut: record.rut,
      nombre: record.nombre,
      inmobiliariaName: record.inmobiliariaName,
      fecha: record.fecha,
      pendiente: esPorCorreo,
    }).catch(() => {});
  }

  return Response.json(record, { status: 201 });
}

export async function HEAD(request: NextRequest) {
  const session = await requireAuth();
  if (!session) return new Response(null, { status: 401 });

  const url = new URL(request.url);
  const rut = url.searchParams.get('rut') ?? '';
  const key = url.searchParams.get('key') ?? '';

  return new Response(null, {
    status: 200,
    headers: { 'x-duplicate': isDuplicate(rut, key) ? '1' : '0' },
  });
}
