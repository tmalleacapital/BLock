import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSession, COOKIE_NAME } from '@/lib/auth';
import { getAllHistory } from '@/lib/historyServer';
import MisBloqueosClient from '@/components/MisBloqueosClient';

export const dynamic = 'force-dynamic';

export default async function MisBloqueosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? getSession(token) : null;
  if (!session) redirect('/login');

  const email = session.email.toLowerCase();
  // getAllHistory ya viene con el más nuevo primero.
  const records = getAllHistory().filter((r) => (r.asesorEmail ?? '').toLowerCase() === email);

  return (
    <main className="px-4 lg:px-6 py-6 lg:py-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
      <MisBloqueosClient initial={records} />

      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        El estado se actualiza cuando la inmobiliaria responde. Las inmobiliarias por portal se bloquean
        directo, por eso no muestran estado. Esta vista se refresca sola cada 15 segundos.
      </p>
    </main>
  );
}
