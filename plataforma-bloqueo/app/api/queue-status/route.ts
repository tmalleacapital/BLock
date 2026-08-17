import { cookies } from 'next/headers';
import { getPortalStats } from '@/lib/queue';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import { getSession, COOKIE_NAME } from '@/lib/auth';

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !getSession(token)) {
    return Response.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const portals: Record<string, { waitingCount: number; processing: boolean }> = {};
  let totalWaiting = 0;

  for (const inm of INMOBILIARIAS.filter((i) => i.active)) {
    const stats = getPortalStats(inm.key);
    portals[inm.key] = stats;
    totalWaiting += stats.waitingCount;
  }

  return Response.json({ portals, totalWaiting });
}
