'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import type { BlockingRecord } from '@/lib/historyServer';

interface PortalStats {
  waitingCount: number;
  processing: boolean;
}

interface QueueData {
  portals: Record<string, PortalStats>;
  totalWaiting: number;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(iso)) {
    return `Hoy ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días.';
  if (h < 19) return 'Buenas tardes.';
  return 'Buenas noches.';
}

function InmobiliariaInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
        color: 'var(--accent)',
      }}
    >
      {initials}
    </div>
  );
}

function PortalStatusBadge({ stats }: { stats?: PortalStats }) {
  if (!stats || (!stats.processing && stats.waitingCount === 0)) {
    return (
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        Libre
      </span>
    );
  }
  if (stats.processing) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
          color: 'var(--success)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Procesando
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--warning) 12%, transparent)',
        color: 'var(--warning)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {stats.waitingCount} en cola
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

export default function HomePage() {
  const [history, setHistory] = useState<BlockingRecord[]>([]);
  const [greeting, setGreeting] = useState('');
  const [queueData, setQueueData] = useState<QueueData>({ portals: {}, totalWaiting: 0 });
  const [search, setSearch] = useState('');

  const pollQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue-status');
      if (res.ok) setQueueData(await res.json() as QueueData);
    } catch { /* ignore */ }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) setHistory(await res.json() as BlockingRecord[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setGreeting(getGreeting());
    void refreshHistory();
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshHistory(); };
    const onUpdated = () => void refreshHistory();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('history:updated', onUpdated);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('history:updated', onUpdated);
    };
  }, [refreshHistory]);

  useEffect(() => {
    pollQueue();
    const interval = setInterval(pollQueue, 3000);
    return () => clearInterval(interval);
  }, [pollQueue]);

  const countToday = history.filter((r) => isToday(r.fecha)).length;
  const active = INMOBILIARIAS.filter((inm) => inm.active);

  const filteredHistory = search.trim()
    ? history.filter((rec) => {
        const q = search.toLowerCase();
        const rutNorm = rec.rut.replace(/[.\-]/g, '').toLowerCase();
        const qNorm = q.replace(/[.\-]/g, '');
        return (
          rutNorm.includes(qNorm) ||
          rec.nombre.toLowerCase().includes(q) ||
          rec.inmobiliariaName.toLowerCase().includes(q)
        );
      })
    : history;

  const activeQueuePortals = active.filter((inm) => {
    const s = queueData.portals[inm.key];
    return s && (s.processing || s.waitingCount > 0);
  });
  const hasActiveQueue = activeQueuePortals.length > 0;

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-8 py-4 border-b"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Inicio
        </p>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 px-8 py-8 min-h-0">

        {/* ── Columna principal ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Saludo */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
              {greeting || 'Bienvenido.'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Panel operacional de{' '}
              <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Capital Inteligente</span>.
            </p>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '50ms' }}
          >
            {/* Hoy */}
            <div
              className="rounded-2xl border p-5 space-y-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Hoy
              </p>
              <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                {countToday}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Bloqueos del día</p>
            </div>

            {/* En cola — live */}
            <div
              className="rounded-2xl border p-5 space-y-2 transition-colors duration-500"
              style={{
                borderColor: queueData.totalWaiting > 0
                  ? 'color-mix(in srgb, var(--warning) 40%, transparent)'
                  : 'var(--border)',
                backgroundColor: queueData.totalWaiting > 0
                  ? 'color-mix(in srgb, var(--warning) 5%, var(--card))'
                  : 'var(--card)',
                boxShadow: cardShadow,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  En cola
                </p>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: queueData.totalWaiting > 0 ? 'var(--warning)' : 'var(--muted)' }}
                />
              </div>
              <p
                className="text-4xl font-bold tabular-nums"
                style={{ color: queueData.totalWaiting > 0 ? 'var(--warning)' : 'var(--foreground)' }}
              >
                {queueData.totalWaiting}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Solicitudes en espera</p>
            </div>

            {/* Total */}
            <div
              className="rounded-2xl border p-5 space-y-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Total
              </p>
              <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                {history.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Historial completo</p>
            </div>
          </div>

          {/* Lista de portales */}
          <section
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: '100ms' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              Portales activos
            </p>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
            >
              {active.map((inm, idx) => (
                <Link
                  key={inm.key}
                  href={`/${inm.key}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-150"
                  style={{
                    borderTop: idx > 0 ? `1px solid var(--border)` : undefined,
                    color: 'inherit',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                      'color-mix(in srgb, var(--accent) 4%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <InmobiliariaInitials name={inm.name} />
                  <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {inm.name}
                  </span>
                  <PortalStatusBadge stats={queueData.portals[inm.key]} />
                  <span style={{ color: 'var(--muted)' }}>
                    <ArrowIcon />
                  </span>
                </Link>
              ))}
            </div>
          </section>

        </div>

        {/* ── Rail derecho ── */}
        <div
          className="w-full lg:w-72 shrink-0 space-y-4 animate-in fade-in slide-in-from-right-3 duration-400"
        >

          {/* Cola activa (solo cuando hay actividad) */}
          {hasActiveQueue && (
            <div
              className="rounded-2xl border p-5 animate-in fade-in zoom-in-95 duration-300"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning) 40%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--warning) 4%, var(--card))',
                boxShadow: cardShadow,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--warning)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--warning)' }}>
                  Cola activa
                </p>
              </div>
              <div className="space-y-3">
                {activeQueuePortals.map((inm) => {
                  const s = queueData.portals[inm.key];
                  return (
                    <Link
                      key={inm.key}
                      href={`/${inm.key}`}
                      className="flex items-center gap-3 transition-opacity hover:opacity-80"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <InmobiliariaInitials name={inm.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                          {inm.name}
                        </p>
                        <p className="text-xs" style={{ color: s.processing ? 'var(--success)' : 'var(--warning)' }}>
                          {s.processing
                            ? 'Automatizando...'
                            : `${s.waitingCount} solicitud${s.waitingCount !== 1 ? 'es' : ''} en espera`}
                        </p>
                      </div>
                      {s.processing && (
                        <span
                          className="w-3 h-3 border-2 rounded-full animate-spin shrink-0"
                          style={{ borderColor: 'var(--success)', borderTopColor: 'transparent' }}
                        />
                      )}
                      {!s.processing && (
                        <span
                          className="text-xs font-bold tabular-nums shrink-0"
                          style={{ color: 'var(--warning)' }}
                        >
                          {s.waitingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Historial reciente */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              Actividad reciente
            </p>

            {history.length > 0 && (
              <div className="relative mb-3">
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--muted)' }}
                >
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por RUT, nombre…"
                  className="w-full rounded-lg border pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    // @ts-expect-error CSS custom property
                    '--tw-ring-color': 'color-mix(in srgb, var(--accent) 22%, transparent)',
                  }}
                />
              </div>
            )}

            {history.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
                Los bloqueos exitosos aparecerán aquí.
              </p>
            ) : filteredHistory.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
                Sin resultados para &ldquo;{search}&rdquo;.
              </p>
            ) : (
              <div className="space-y-0">
                {filteredHistory.slice(0, 12).map((rec, idx) => (
                  <div
                    key={rec.id}
                    className="flex items-start gap-3 py-3"
                    style={{ borderTop: idx > 0 ? `1px solid var(--border)` : undefined }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: 'var(--success)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono tabular-nums font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {rec.rut}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {rec.nombre || '—'}
                      </p>
                      {rec.asesorEmail && (
                        <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                          {rec.asesorEmail}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                          color: 'var(--accent)',
                        }}
                      >
                        {rec.inmobiliariaName}
                      </span>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {formatDate(rec.fecha)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
