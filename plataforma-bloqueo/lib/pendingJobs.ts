const KEY = 'b_lock_pending_jobs';
const JOB_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface PendingJob {
  jobId: string;
  inmobiliaria: string;
  inmobiliariaName: string;
  rut: string;
  nombre: string;
  asesorEmail: string;
  submittedAt: number;
}

function read(): PendingJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const jobs: PendingJob[] = raw ? (JSON.parse(raw) as PendingJob[]) : [];
    const cutoff = Date.now() - JOB_MAX_AGE_MS;
    return jobs.filter((j) => j.submittedAt > cutoff);
  } catch {
    return [];
  }
}

function write(jobs: PendingJob[]): void {
  localStorage.setItem(KEY, JSON.stringify(jobs));
}

export function savePendingJob(job: PendingJob): void {
  if (typeof window === 'undefined') return;
  write([...read().filter((j) => j.jobId !== job.jobId), job]);
}

export function getPendingJobs(): PendingJob[] {
  return read();
}

export function claimPendingJob(jobId: string): PendingJob | undefined {
  if (typeof window === 'undefined') return undefined;
  const jobs = read();
  const idx = jobs.findIndex((j) => j.jobId === jobId);
  if (idx === -1) return undefined;
  const [claimed] = jobs.splice(idx, 1);
  write(jobs);
  return claimed;
}
