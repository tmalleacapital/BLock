'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import { getHistory } from '@/lib/history';
import type { BlockingRecord } from '@/lib/history';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const day = now.getDay();
  startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return d >= startOfWeek && d <= now;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isToday(iso)) {
    return `Hoy ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días.';
  if (h < 19) return 'Buenas tardes.';
  return 'Buenas noches.';
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22V12h6v10" />
      <circle cx="9" cy="7" r=".5" fill="currentColor" />
      <circle cx="15" cy="7" r=".5" fill="currentColor" />
    </svg>
  );
}

const STAT_CARDS = [
  {
    key: 'today',
    label: 'Hoy',
    description: 'Bloqueos de hoy',
    icon: <SunIcon />,
    iconBg: '#0d9488',
  },
  {
    key: 'week',
    label: 'Esta semana',
    description: 'En los últimos 7 días',
    icon: <CalendarIcon />,
    iconBg: '#3b82f6',
  },
  {
    key: 'total',
    label: 'Total',
    description: 'Historial completo',
    icon: <LayersIcon />,
    iconBg: '#8b5cf6',
  },
];

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
      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
        color: 'var(--accent)',
      }}
    >
      {initials}
    </div>
  );
}

export default function HomePage() {
  const [history, setHistory] = useState<BlockingRecord[]>([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
    const refresh = () => setHistory(getHistory());
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const countToday = history.filter((r) => isToday(r.fecha)).length;
  const countWeek = history.filter((r) => isThisWeek(r.fecha)).length;
  const countTotal = history.length;

  const statValues: Record<string, number> = {
    today: countToday,
    week: countWeek,
    total: countTotal,
  };

  const active = INMOBILIARIAS.filter((inm) => inm.active);
  const inactive = INMOBILIARIAS.filter((inm) => !inm.active);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-8 py-4 border-b flex items-center gap-3"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Inicio
        </p>
      </header>

      <main className="flex-1 px-8 py-8 space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {greeting || 'Bienvenido.'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            Este es tu resumen de B-Lock. Estás en{' '}
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Capital Inteligente</span>.
          </p>
        </div>

        {/* Hero card */}
        <Link
          href={`/${active[0]?.key ?? 'imagina'}`}
          className="block rounded-2xl p-7 transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #6d28d9 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  Bloqueos
                </p>
              </div>
              <p className="text-xl font-bold text-white leading-snug">
                Registra un cliente en minutos
              </p>
              <p className="mt-1.5 text-sm text-white/70 max-w-sm">
                Selecciona un portal y completa el formulario. La automatización se ejecuta al instante.
              </p>
            </div>
            <div className="text-white/60 shrink-0 mt-1">
              <ArrowIcon />
            </div>
          </div>
          <div className="mt-5">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              Ir al portal
              <ArrowIcon />
            </span>
          </div>
        </Link>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAT_CARDS.map((s) => (
            <div
              key={s.key}
              className="rounded-2xl border p-5 flex flex-col gap-3"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${s.iconBg}22`, color: s.iconBg }}
                >
                  {s.icon}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  {s.label}
                </p>
              </div>
              <div>
                <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
                  {statValues[s.key]}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Portales activos */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Portales activos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {active.map((inm) => (
              <Link
                key={inm.key}
                href={`/${inm.key}`}
                className="rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-150"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                    'color-mix(in srgb, var(--accent) 6%, var(--card))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--card)';
                }}
              >
                <div className="flex items-center justify-between">
                  <InmobiliariaInitials name={inm.name} />
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--success) 14%, transparent)',
                      color: 'var(--success)',
                    }}
                  >
                    Activo
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{inm.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Portal de bloqueo</p>
                </div>
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: 'var(--accent)' }}
                >
                  <BuildingIcon />
                  Ir al portal
                  <span className="ml-auto"><ArrowIcon /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Próximamente */}
        {inactive.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Próximamente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {inactive.map((inm) => (
                <div
                  key={inm.key}
                  className="rounded-2xl border p-5 flex flex-col gap-4 opacity-40 cursor-not-allowed select-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                >
                  <div className="flex items-center justify-between">
                    <InmobiliariaInitials name={inm.name} />
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--muted) 14%, transparent)',
                        color: 'var(--muted)',
                      }}
                    >
                      <LockIcon />
                      Pronto
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{inm.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>En desarrollo</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actividad reciente */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Actividad reciente
          </p>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
          >
            {history.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  No hay bloqueos registrados aún. Aparecerán aquí después de cada bloqueo exitoso.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['RUT', 'Nombre', 'Inmobiliaria', 'Fecha'].map((col) => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                        style={{ color: 'var(--muted)' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((rec, idx) => (
                    <tr
                      key={rec.id}
                      style={{ borderTop: idx === 0 ? undefined : '1px solid var(--border)' }}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {rec.rut}
                      </td>
                      <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--foreground)' }}>
                        {rec.nombre}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                            color: 'var(--accent)',
                          }}
                        >
                          {rec.inmobiliariaName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                        {formatDate(rec.fecha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
