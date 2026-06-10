import { getPortalStats } from '@/lib/queue';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';

export async function GET() {
  const portals: Record<string, { waitingCount: number; processing: boolean }> = {};
  let totalWaiting = 0;

  for (const inm of INMOBILIARIAS.filter((i) => i.active)) {
    const stats = getPortalStats(inm.key);
    portals[inm.key] = stats;
    totalWaiting += stats.waitingCount;
  }

  return Response.json({ portals, totalWaiting });
}
