import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, COOKIE_NAME } from '@/lib/auth';
import { getAllHistory } from '@/lib/historyServer';
import EstadoBadge from '@/components/EstadoBadge';

export const dynamic = 'force-dynamic';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function MisBloqueosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;
  if (!session) redirect('/login');

  const email = session.email.toLowerCase();
  // getAllHistory ya viene con el más nuevo primero.
  const records = getAllHistory().filter((r) => (r.asesorEmail ?? '').toLowerCase() === email);
  const pendientes = records.filter((r) => r.status === 'pendiente').length;

  const cardShadow = '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)';

  return (
    <main className="px-4 lg:px-6 py-6 lg:py-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">

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

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', boxShadow: cardShadow }}
      >
        {records.length === 0 ? (
          <p className="px-6 py-12 text-sm text-center" style={{ color: 'var(--muted)' }}>
            Todavía no has registrado bloqueos. Cuando bloquees un cliente aparecerá aquí con su estado.
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
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < records.length - 1 ? '1px solid var(--border)' : 'none' }}
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

      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        El estado se actualiza cuando la inmobiliaria responde. Las inmobiliarias por portal se bloquean
        directo, por eso no muestran estado.
      </p>
    </main>
  );
}
