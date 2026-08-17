import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getJob } from '@/lib/queue';
import { getSession, COOKIE_NAME } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !getSession(token)) {
    return Response.json({ status: 'error', message: 'No autenticado.' }, { status: 401 });
  }

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
