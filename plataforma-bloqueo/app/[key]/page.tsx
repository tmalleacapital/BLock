import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSchema, INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import { getSession, COOKIE_NAME } from '@/lib/auth';
import FichaForm from '@/components/FichaForm';
import type { UnidadEntry } from '@/lib/inmobiliarias/types';

interface Props {
  params: Promise<{ key: string }>;
}

export const dynamic = 'force-dynamic';

export default async function InmobiliariaPage({ params }: Props) {
  const { key } = await params;
  const inm = INMOBILIARIAS.find((i) => i.key === key);
  const schema = getSchema(key);

  if (!inm || !schema) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const asesorEmail = token ? (getSession(token)?.email ?? '') : '';

  let stockData: Record<string, UnidadEntry[]> | undefined;
  try {
    if (key === 'convet') {
      const { fetchConvetStock } = await import('@/lib/inmobiliarias/convet/stock');
      stockData = await fetchConvetStock();
    } else if (key === 'ecasa') {
      const { fetchEcasaStock } = await import('@/lib/inmobiliarias/ecasa/stock');
      stockData = await fetchEcasaStock();
    } else if (key === 'paz') {
      const { fetchPazStock } = await import('@/lib/inmobiliarias/paz/stock');
      stockData = await fetchPazStock();
    } else if (key === 'sento') {
      const { fetchSentoStock } = await import('@/lib/inmobiliarias/sento/stock');
      stockData = await fetchSentoStock();
    } else if (key === 'fai') {
      const { fetchFaiStock } = await import('@/lib/inmobiliarias/fai/stock');
      stockData = await fetchFaiStock();
    } else if (key === 'viva') {
      const { fetchVivaStock } = await import('@/lib/inmobiliarias/viva/stock');
      stockData = await fetchVivaStock();
    } else if (key === 'fundamenta') {
      const { fetchFundamentaStock } = await import('@/lib/inmobiliarias/fundamenta/stock');
      const raw = await fetchFundamentaStock();
      if (Object.keys(raw).length > 0) stockData = raw;
    } else if (key === 'danacorp') {
      const { fetchDanacorpStock } = await import('@/lib/inmobiliarias/danacorp/stock');
      stockData = await fetchDanacorpStock();
    } else if (key === 'deisa') {
      const { fetchDeisaStock } = await import('@/lib/inmobiliarias/deisa/stock');
      stockData = await fetchDeisaStock();
    } else if (key === 'leben') {
      const { fetchLebenStock } = await import('@/lib/inmobiliarias/leben/stock');
      stockData = await fetchLebenStock();
    } else if (key === 'maestra') {
      const { fetchMaestraStock } = await import('@/lib/inmobiliarias/maestra/stock');
      const raw = await fetchMaestraStock();
      if (Object.keys(raw).length > 0) stockData = raw;
    }
  } catch {
    // ORED API no disponible — el formulario carga sin datos de stock
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 lg:px-8 py-4 lg:py-5 border-b"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {inm.name}
            </span>
            <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              Bloqueo de cliente
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              Rellena los datos del cliente y presiona &ldquo;Bloquear cliente&rdquo; para registrarlo en el portal.
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 lg:px-8 py-5 lg:py-7">
        <FichaForm
          inmobiliariaKey={key}
          inmobiliariaName={inm.name}
          schema={schema}
          stockData={stockData}
          emailRecipients={inm.emailRecipients}
          asesorEmail={asesorEmail}
        />
      </main>
    </div>
  );
}
