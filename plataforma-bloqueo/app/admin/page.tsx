import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, COOKIE_NAME, isAdmin } from '@/lib/auth';
import { getAllHistory, type BlockingStatus } from '@/lib/historyServer';
import ExportButton from './ExportButton';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function estadoBadge(status?: BlockingStatus): { label: string; color: string } | null {
  if (status === 'aceptado')  return { label: 'Aceptado',  color: 'var(--success)' };
  if (status === 'rechazado') return { label: 'Rechazado', color: 'var(--danger)' };
  if (status === 'pendiente') return { label: 'Pendiente', color: 'var(--warning)' };
  return null; // inmobiliarias por portal: bloqueo directo, sin estado
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;

  if (!session || !isAdmin(session.email)) {
    redirect('/');
  }

  const records = getAllHistory().slice().reverse(); // newest first

  // Stats
  const byPortal = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.inmobiliariaName] = (acc[r.inmobiliariaName] ?? 0) + 1;
    return acc;
  }, {});

  const byAsesor = records.reduce<Record<string, number>>((acc, r) => {
    const key = r.asesorEmail ?? 'Desconocido';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

  return (
    <main className="px-4 lg:px-6 py-6 lg:py-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-400">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--foreground)' }}
          >
            Administración
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {records.length} bloqueo{records.length !== 1 ? 's' : ''} registrado{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ExportButton records={records} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Total */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Total bloqueos
          </p>
          <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>
            {records.length}
          </p>
        </div>

        {/* Por portal */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Por portal
          </p>
          <ul className="space-y-1.5">
            {Object.entries(byPortal).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <li key={name} className="flex items-center justify-between gap-2 text-sm">
                <span style={{ color: 'var(--foreground)' }}>{name}</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>{count}</span>
              </li>
            ))}
            {Object.keys(byPortal).length === 0 && (
              <li className="text-sm" style={{ color: 'var(--muted)' }}>Sin datos</li>
            )}
          </ul>
        </div>

        {/* Por asesor */}
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Por asesor
          </p>
          <ul className="space-y-1.5">
            {Object.entries(byAsesor).sort((a, b) => b[1] - a[1]).map(([email, count]) => (
              <li key={email} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate min-w-0" style={{ color: 'var(--foreground)' }}>
                  {email.split('@')[0]}
                </span>
                <span className="font-semibold tabular-nums shrink-0" style={{ color: 'var(--accent)' }}>{count}</span>
              </li>
            ))}
            {Object.keys(byAsesor).length === 0 && (
              <li className="text-sm" style={{ color: 'var(--muted)' }}>Sin datos</li>
            )}
          </ul>
        </div>
      </div>

      {/* History table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
      >
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Historial completo
          </p>
        </div>
        {records.length === 0 ? (
          <p className="px-6 py-10 text-sm text-center" style={{ color: 'var(--muted)' }}>
            No hay bloqueos registrados todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Fecha', 'RUT', 'Nombre', 'Portal', 'Asesor', 'Estado'].map((h) => (
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
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
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
                      {(() => {
                        const b = estadoBadge(r.status);
                        return b ? (
                          <span
                            className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                            style={{ color: b.color, backgroundColor: `color-mix(in srgb, ${b.color} 12%, transparent)` }}
                          >
                            {b.label}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
