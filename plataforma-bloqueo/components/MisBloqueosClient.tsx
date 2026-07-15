'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BlockingRecord } from '@/lib/historyServer';
import EstadoBadge from './EstadoBadge';

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';
const REFRESH_MS = 15_000;

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const selectCls = 'rounded-lg border px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2';
const selectStyle = {
  borderColor: 'var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--foreground)',
} as const;

export default function MisBloqueosClient({ initial }: { initial: BlockingRecord[] }) {
  const [records, setRecords] = useState<BlockingRecord[]>(initial);
  const [inmo, setInmo] = useState('');
  const [estado, setEstado] = useState('');
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/history?mine=1', { cache: 'no-store' });
      if (res.ok) setRecords((await res.json()) as BlockingRecord[]);
    } catch {
      // fallo transitorio — se reintenta en el siguiente ciclo
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh periódico + cuando el formulario avisa que registró un bloqueo.
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    const onUpdated = () => { void refresh(); };
    window.addEventListener('history:updated', onUpdated);
    return () => {
      clearInterval(id);
      window.removeEventListener('history:updated', onUpdated);
    };
  }, [refresh]);

  const inmobiliarias = useMemo(
    () => [...new Set(records.map((r) => r.inmobiliariaName))].sort(),
    [records],
  );

  const filtered = useMemo(
    () => records.filter((r) => {
      if (inmo && r.inmobiliariaName !== inmo) return false;
      if (estado === 'sin' && r.status) return false;
      if (estado && estado !== 'sin' && r.status !== estado) return false;
      if (q.trim()) {
        const hay = `${r.rut} ${r.nombre}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    }),
    [records, inmo, estado, q],
  );

  const pendientes = records.filter((r) => r.status === 'pendiente').length;
  const hayFiltro = Boolean(inmo || estado || q.trim());

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--foreground)' }}
          >
            Mis bloqueos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {records.length} solicitud{records.length !== 1 ? 'es' : ''}
            {pendientes > 0 && (
              <>
                {' · '}
                <span style={{ color: 'var(--warning)' }}>
                  {pendientes} pendiente{pendientes !== 1 ? 's' : ''} de confirmación
                </span>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--card)' }}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por RUT o nombre…"
          className={`${selectCls} flex-1 min-w-[200px] placeholder:text-[color:var(--muted)]`}
          style={selectStyle}
        />
        <select value={inmo} onChange={(e) => setInmo(e.target.value)} className={selectCls} style={selectStyle}>
          <option value="">Todas las inmobiliarias</option>
          {inmobiliarias.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls} style={selectStyle}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aceptado">Aceptado</option>
          <option value="rechazado">Rechazado</option>
          <option value="sin">Sin estado (portal)</option>
        </select>
        {hayFiltro && (
          <button
            type="button"
            onClick={() => { setInmo(''); setEstado(''); setQ(''); }}
            className="text-xs font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
      >
        {records.length === 0 ? (
          <p className="px-6 py-12 text-sm text-center" style={{ color: 'var(--muted)' }}>
            Todavía no has registrado bloqueos. Cuando bloquees un cliente aparecerá aquí con su estado.
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-sm text-center" style={{ color: 'var(--muted)' }}>
            Ningún bloqueo coincide con los filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'RUT', 'Nombre', 'Inmobiliaria', 'Estado'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-4 py-3 tabular-nums text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {fmt(r.fecha)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold" style={{ color: 'var(--foreground)' }}>
                      {r.rut}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                      {r.nombre || '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>
                      {r.inmobiliariaName}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
