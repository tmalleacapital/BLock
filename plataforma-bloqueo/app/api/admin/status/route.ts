import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getSession, COOKIE_NAME, isAdmin } from '@/lib/auth';
import { setStatusById, type BlockingStatus } from '@/lib/historyServer';

// Acción manual del admin: cambiar el estado de un bloqueo concreto (por id).
// Solo admins. Estados permitidos: aceptado, rechazado, liberado, pendiente.
export const dynamic = 'force-dynamic';

const PERMITIDOS: BlockingStatus[] = ['aceptado', 'rechazado', 'liberado', 'pendiente'];

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;

  if (!session) return Response.json({ error: 'No autenticado.' }, { status: 401 });
  if (!isAdmin(session.email)) return Response.json({ error: 'No autorizado.' }, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null;
  const id = body?.id;
  const status = body?.status as BlockingStatus | undefined;

  if (!id || !status || !PERMITIDOS.includes(status)) {
    return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const updated = setStatusById(id, status);
  if (!updated) return Response.json({ error: 'Bloqueo no encontrado.' }, { status: 404 });

  return Response.json(updated);
}
