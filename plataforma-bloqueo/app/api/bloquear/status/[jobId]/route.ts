import type { NextRequest } from 'next/server';
import { getJob } from '@/lib/queue';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return Response.json(
      { status: 'error', message: 'Solicitud no encontrada o expirada.' },
      { status: 404 },
    );
  }

  return Response.json(job);
}
