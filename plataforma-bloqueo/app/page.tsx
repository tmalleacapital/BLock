'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import { getHistory } from '@/lib/history';
import type { BlockingRecord } from '@/lib/history';

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

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
      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
        color: 'var(--accent)',
      }}
    >
      {initials}
    </div>
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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-1"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
        {value}
      </p>
    </div>
  );
}

export default function HomePage() {
  const [history, setHistory] = useState<BlockingRecord[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const countToday = history.filter((r) => isToday(r.fecha)).length;
  const countWeek = history.filter((r) => isThisWeek(r.fecha)).length;

  const active = INMOBILIARIAS.filter((inm) => inm.active);
  const inactive = INMOBILIARIAS.filter((inm) => !inm.active);

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-8 py-5 border-b"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
          Menú principal
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Selecciona una inmobiliaria para registrar un bloqueo de cliente.
        </p>
      </header>

      <main className="flex-1 px-8 py-7 space-y-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-sm">
          <StatCard label="Hoy" value={countToday} />
          <StatCard label="Esta semana" value={countWeek} />
          <StatCard label="Total" value={history.length} />
        </div>

        {/* Cards activas */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Inmobiliarias activas
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {active.map((inm) => (
              <Link
                key={inm.key}
                href={`/${inm.key}`}
                className="rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-150"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                    '0 4px 16px 0 color-mix(in srgb, var(--accent) 18%, transparent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = cardShadow;
                }}
              >
                <div className="flex items-center justify-between">
                  <InmobiliariaInitials name={inm.name} />
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)',
                      color: 'var(--success)',
                    }}
                  >
                    Activo
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{inm.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Portal de bloqueo</p>
                </div>
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold mt-auto"
                  style={{ color: 'var(--accent)' }}
                >
                  Bloquear cliente
                  <ArrowIcon />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cards inactivas */}
        {inactive.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Próximamente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inactive.map((inm) => (
                <div
                  key={inm.key}
                  className="rounded-2xl border p-5 flex flex-col gap-4 opacity-50 cursor-not-allowed select-none"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
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

        {/* Historial reciente */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Actividad reciente
          </p>
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
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
                            backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
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
