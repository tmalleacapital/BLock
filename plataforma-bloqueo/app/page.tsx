'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import type { BlockingRecord } from '@/lib/historyServer';
import { getFavoritos, toggleFavorito, getRecientes } from '@/lib/recientes';

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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

export default function HomePage() {
  const [history, setHistory] = useState<BlockingRecord[]>([]);
  const [greeting] = useState(() => getGreeting());
  const [queueData, setQueueData] = useState<QueueData>({ portals: {}, totalWaiting: 0 });
  const [q, setQ] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [recientes, setRecientes] = useState<string[]>([]);

  // Recientes y favoritos viven en localStorage (por navegador) → se leen al montar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavoritos(getFavoritos());
    setRecientes(getRecientes());
  }, []);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    pollQueue();
    const interval = setInterval(pollQueue, 3000);
    return () => clearInterval(interval);
  }, [pollQueue]);

  const countToday = history.filter((r) => isToday(r.fecha)).length;
  const active = useMemo(
    () => INMOBILIARIAS.filter((inm) => inm.active && !inm.paused),
    [],
  );
  const toggleFav = useCallback((key: string) => setFavoritos(toggleFavorito(key)), []);

  // Lista mostrada: filtrada por búsqueda y con los favoritos arriba.
  const listadas = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtradas = term
      ? active.filter((inm) => inm.name.toLowerCase().includes(term))
      : active;
    const esFav = (k: string) => favoritos.includes(k);
    return [...filtradas].sort((a, b) => Number(esFav(b.key)) - Number(esFav(a.key)));
  }, [active, q, favoritos]);

  // Chips de acceso rápido: últimas usadas (que sigan activas), solo sin búsqueda.
  const recientesActivas = useMemo(
    () => recientes
      .map((k) => active.find((inm) => inm.key === k))
      .filter((inm): inm is (typeof active)[number] => Boolean(inm))
      .slice(0, 5),
    [recientes, active],
  );

  const activeQueuePortals = active.filter((inm) => {
    const s = queueData.portals[inm.key];
    return s && (s.processing || s.waitingCount > 0);
  });
  const hasActiveQueue = activeQueuePortals.length > 0;

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 lg:px-8 py-4 border-b"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Inicio
        </p>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 px-4 lg:px-8 py-6 lg:py-8 min-h-0">

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
            className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
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
              className="col-span-2 lg:col-span-1 rounded-2xl border p-5 space-y-2"
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
            {/* Encabezado + buscador */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Inmobiliarias
              </p>
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar inmobiliaria…"
                  aria-label="Buscar inmobiliaria"
                  className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 placeholder:text-[color:var(--muted)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                />
              </div>
            </div>

            {/* Recientes — acceso rápido a las últimas usadas */}
            {!q.trim() && recientesActivas.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                  Recientes
                </p>
                <div className="flex flex-wrap gap-2">
                  {recientesActivas.map((inm) => (
                    <Link
                      key={inm.key}
                      href={`/${inm.key}`}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)', textDecoration: 'none' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent'; }}
                    >
                      <InmobiliariaInitials name={inm.name} />
                      {inm.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
            >
              {listadas.length === 0 ? (
                <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--muted)' }}>
                  Ninguna inmobiliaria coincide con «{q.trim()}».
                </p>
              ) : listadas.map((inm, idx) => {
                const fav = favoritos.includes(inm.key);
                return (
                  <div
                    key={inm.key}
                    className="flex items-stretch"
                    style={{ borderTop: idx > 0 ? '1px solid var(--border)' : undefined }}
                  >
                    <Link
                      href={`/${inm.key}`}
                      className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0 transition-colors duration-150"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                          'color-mix(in srgb, var(--accent) 4%, transparent)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      <InmobiliariaInitials name={inm.name} />
                      <span className="flex-1 text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                        {inm.name}
                      </span>
                      <span
                        className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        title={inm.emailRecipients?.length ? 'Se bloquea por correo (la inmobiliaria confirma)' : 'Se bloquea directo en el portal'}
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--border) 55%, transparent)',
                          color: 'var(--muted)',
                        }}
                      >
                        {inm.emailRecipients?.length ? 'Correo' : 'Portal'}
                      </span>
                      <PortalStatusBadge stats={queueData.portals[inm.key]} />
                      <span style={{ color: 'var(--muted)' }}>
                        <ArrowIcon />
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleFav(inm.key)}
                      aria-label={fav ? `Quitar ${inm.name} de favoritos` : `Marcar ${inm.name} como favorito`}
                      aria-pressed={fav}
                      className="shrink-0 flex items-center px-4 transition-colors"
                      style={{ color: fav ? 'var(--warning)' : 'var(--muted)' }}
                    >
                      <StarIcon filled={fav} />
                    </button>
                  </div>
                );
              })}
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
                            ? 'Automatizando…'
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

        </div>
      </main>
    </div>
  );
}
