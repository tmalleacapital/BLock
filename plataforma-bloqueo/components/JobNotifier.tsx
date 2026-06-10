'use client';

import { useEffect, useRef } from 'react';
import { getPendingJobs, claimPendingJob } from '@/lib/pendingJobs';
import { useToast } from '@/components/Toast';
import type { RunResult } from '@/lib/inmobiliarias/types';

interface ApiJobState {
  id: string;
  status: 'en_cola' | 'procesando' | 'completado';
  result?: RunResult;
}

export default function JobNotifier() {
  const { addToast } = useToast();
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const poll = () => {
      const jobs = getPendingJobs();
      for (const job of jobs) {
        if (inFlightRef.current.has(job.jobId)) continue;
        inFlightRef.current.add(job.jobId);

        fetch(`/api/bloquear/status/${job.jobId}`)
          .then(async (res) => {
            if (!res.ok) return;
            const state = (await res.json()) as ApiJobState;
            if (state.status !== 'completado') return;

            const claimed = claimPendingJob(job.jobId);
            if (!claimed) return;

            const result = state.result ?? { status: 'error' as const, message: 'Sin respuesta.' };

            if (result.status === 'success') {
              void fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  inmobiliariaKey: claimed.inmobiliaria,
                  inmobiliariaName: claimed.inmobiliariaName,
                  rut: claimed.rut,
                  nombre: claimed.nombre,
                  asesorEmail: claimed.asesorEmail,
                }),
              }).then(() => {
                window.dispatchEvent(new CustomEvent('history:updated'));
              });
              addToast({
                type: 'success',
                title: 'Cliente bloqueado',
                message: `${claimed.rut} · ${claimed.inmobiliariaName}`,
              });
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Cliente bloqueado', {
                  body: `${claimed.nombre} · ${claimed.inmobiliariaName}`,
                  icon: '/logo.svg',
                });
              }
            } else {
              addToast({
                type: 'error',
                title: 'Error en bloqueo',
                message: `${claimed.inmobiliariaName}: ${result.message}`,
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            inFlightRef.current.delete(job.jobId);
          });
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [addToast]);

  return null;
}
