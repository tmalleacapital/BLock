'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { BlockingRecord, BlockingStatus } from '@/lib/historyServer';
import { estaVigente, diasRestantes } from '@/lib/vigencia';
import EstadoBadge from '@/components/EstadoBadge';

const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';
const POR_PAGINA = 25;

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Un bloqueo ya no toma al cliente si fue rechazado, liberado o venció. */
function estaLibre(r: BlockingRecord): boolean {
  return r.status === 'rechazado' || r.status === 'liberado' || !estaVigente(r.fecha);
}

const selectCls = 'rounded-lg border px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2';
const selectStyle = {
  borderColor: 'var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--foreground)',
} as const;

type Accion = { label: string; status: BlockingStatus; color: string };

const ACCIONES: Accion[] = [
  { label: 'Marcar aceptado',  status: 'aceptado',  color: 'var(--success)' },
  { label: 'Marcar rechazado', status: 'rechazado', color: 'var(--danger)' },
  { label: 'Liberar ahora',    status: 'liberado',  color: 'var(--muted)' },
  { label: 'Marcar pendiente', status: 'pendiente', color: 'var(--warning)' },
];

export default function AdminHistorialClient({ initial }: { initial: BlockingRecord[] }) {
  const [records, setRecords] = useState<BlockingRecord[]>(initial);
  const [inmo, setInmo] = useState('');
  const [estado, setEstado] = useState('');
  const [asesor, setAsesor] = useState('');
  const [vig, setVig] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/history', { cache: 'no-store' });
      if (res.ok) setRecords((await res.json()) as BlockingRecord[]);
    } catch {
      // fallo transitorio — el admin puede reintentar
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Cerrar el menú de acciones al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuId(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuId]);

  const inmobiliarias = useMemo(
    () => [...new Set(records.map((r) => r.inmobiliariaName))].sort(),
    [records],
  );
  const asesores = useMemo(
    () => [...new Set(records.map((r) => r.asesorEmail).filter(Boolean) as string[])].sort(),
    [records],
  );

  const filtered = useMemo(
    () => records.filter((r) => {
      if (inmo && r.inmobiliariaName !== inmo) return false;
      if (asesor && r.asesorEmail !== asesor) return false;
      if (estado === 'sin' && r.status) return false;
      if (estado && estado !== 'sin' && r.status !== estado) return false;
      if (vig === 'vigente' && estaLibre(r)) return false;
      if (vig === 'liberado' && !estaLibre(r)) return false;
      if (q.trim()) {
        const hay = `${r.rut} ${r.nombre} ${r.asesorEmail ?? ''}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    }),
    [records, inmo, asesor, estado, vig, q],
  );

  // Al cambiar cualquier filtro, volver a la primera página (sin useEffect,
  // para no disparar renders en cascada).
  const setFiltro = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  }, []);
  const limpiarFiltros = useCallback(() => {
    setInmo(''); setAsesor(''); setEstado(''); setVig(''); setQ(''); setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = (pageSafe - 1) * POR_PAGINA;
  const visible = filtered.slice(pageStart, pageStart + POR_PAGINA);

  const hayFiltro = Boolean(inmo || asesor || estado || vig || q.trim());

  const cambiarEstado = useCallback(async (rec: BlockingRecord, status: BlockingStatus) => {
    setMenuId(null);
    if (rec.status === status) return;
    setBusyId(rec.id);
    try {
      const res = await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rec.id, status }),
      });
      if (res.ok) {
        const updated = (await res.json()) as BlockingRecord;
        setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
    } catch {
      // sin cambios; el admin puede reintentar
    } finally {
      setBusyId(null);
    }
  }, []);

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
    >
      {/* Encabezado + filtros */}
      <div className="px-4 lg:px-6 py-4 border-b space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Historial completo
            <span className="ml-2 font-normal" style={{ color: 'var(--muted)' }}>
              {filtered.length} de {records.length}
            </span>
          </p>
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

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={q}
            onChange={(e) => setFiltro(setQ)(e.target.value)}
            placeholder="Buscar por RUT, nombre o asesor…"
            className={`${selectCls} flex-1 min-w-[200px] placeholder:text-[color:var(--muted)]`}
            style={selectStyle}
          />
          <select value={inmo} onChange={(e) => setFiltro(setInmo)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">Todas las inmobiliarias</option>
            {inmobiliarias.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={asesor} onChange={(e) => setFiltro(setAsesor)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">Todos los asesores</option>
            {asesores.map((a) => <option key={a} value={a}>{a.split('@')[0]}</option>)}
          </select>
          <select value={estado} onChange={(e) => setFiltro(setEstado)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
            <option value="liberado">Liberado</option>
            <option value="sin">Sin estado (portal)</option>
          </select>
          <select value={vig} onChange={(e) => setFiltro(setVig)(e.target.value)} className={selectCls} style={selectStyle}>
            <option value="">Vigentes y liberados</option>
            <option value="vigente">Solo vigentes</option>
            <option value="liberado">Solo liberados</option>
          </select>
          {hayFiltro && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {records.length === 0 ? (
        <p className="px-6 py-10 text-sm text-center" style={{ color: 'var(--muted)' }}>
          No hay bloqueos registrados todavía.
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-6 py-10 text-sm text-center" style={{ color: 'var(--muted)' }}>
          Ningún bloqueo coincide con los filtros.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'RUT', 'Nombre', 'Portal', 'Asesor', 'Estado', 'Vigencia', ''].map((h, idx) => (
                    <th
                      key={h || `acc-${idx}`}
                      className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: 'var(--muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none' }}
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
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {r.asesorEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {estaLibre(r) ? (
                        <span style={{ color: 'var(--muted)' }}>
                          {r.status === 'rechazado' ? '—' : 'Liberado'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--success)' }}>
                          {diasRestantes(r.fecha)} día{diasRestantes(r.fecha) !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        type="button"
                        onClick={() => setMenuId(menuId === r.id ? null : r.id)}
                        disabled={busyId === r.id}
                        aria-label="Acciones"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-colors disabled:opacity-50 hover:bg-[color:var(--background)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      >
                        {busyId === r.id ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
                          </svg>
                        )}
                      </button>
                      {menuId === r.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-4 top-11 z-10 w-48 rounded-xl border py-1 text-left"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 8px 24px -6px rgb(0 0 0 / 0.18)' }}
                        >
                          {ACCIONES.map((a) => (
                            <button
                              key={a.status}
                              type="button"
                              onClick={() => void cambiarEstado(r, a.status)}
                              disabled={r.status === a.status}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:opacity-40 hover:bg-[color:var(--background)]"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                              {a.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {pageStart + 1}–{Math.min(pageStart + POR_PAGINA, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--card)' }}
                >
                  Anterior
                </button>
                <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                  {pageSafe} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--card)' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
