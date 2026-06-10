import { randomUUID } from 'crypto';
import type { RunResult } from '@/lib/inmobiliarias/types';

export type QueueJobStatus = 'en_cola' | 'procesando' | 'completado';

export interface JobState {
  id: string;
  inmobiliaria: string;
  status: QueueJobStatus;
  position: number;
  result?: RunResult;
  createdAt: number;
}

export interface PortalQueueStats {
  waitingCount: number;
  processing: boolean;
}

// Anclar el estado en `global` para que sea compartido entre todos los módulos
// del proceso Node.js, evitando el problema de aislamiento de módulos en Next.js dev.
type QueueGlobal = {
  __queue_jobs: Map<string, JobState>;
  __queue_waiting: Map<string, string[]>;
  __queue_tails: Map<string, Promise<void>>;
  __queue_active: Set<string>;
};

const g = global as typeof global & Partial<QueueGlobal>;

g.__queue_jobs    ??= new Map<string, JobState>();
g.__queue_waiting ??= new Map<string, string[]>();
g.__queue_tails   ??= new Map<string, Promise<void>>();
g.__queue_active  ??= new Set<string>();

const jobs    = g.__queue_jobs!;
const waiting = g.__queue_waiting!;
const tails   = g.__queue_tails!;
const active  = g.__queue_active!;

const JOB_TTL_MS = 60 * 60 * 1000;

export function enqueue(
  inmobiliaria: string,
  fn: () => Promise<RunResult>,
): string {
  const jobId = randomUUID();

  if (!waiting.has(inmobiliaria)) waiting.set(inmobiliaria, []);
  const queue = waiting.get(inmobiliaria)!;
  queue.push(jobId);

  const job: JobState = {
    id: jobId,
    inmobiliaria,
    status: 'en_cola',
    position: queue.length,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);
  setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);

  const tail = tails.get(inmobiliaria) ?? Promise.resolve();

  const next: Promise<void> = tail.then(async () => {
    const j = jobs.get(jobId);
    if (!j) return;

    const q = waiting.get(inmobiliaria) ?? [];
    const idx = q.indexOf(jobId);
    if (idx !== -1) q.splice(idx, 1);
    q.forEach((id, i) => {
      const w = jobs.get(id);
      if (w) w.position = i + 1;
    });

    j.status = 'procesando';
    j.position = 0;
    active.add(inmobiliaria);

    try {
      j.result = await fn();
    } catch (err) {
      j.result = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
    j.status = 'completado';
    active.delete(inmobiliaria);
  });

  tails.set(inmobiliaria, next);
  return jobId;
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

export function getPortalStats(inmobiliaria: string): PortalQueueStats {
  return {
    waitingCount: waiting.get(inmobiliaria)?.length ?? 0,
    processing: active.has(inmobiliaria),
  };
}
