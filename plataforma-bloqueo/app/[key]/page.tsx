import { notFound } from 'next/navigation';
import { getSchema, INMOBILIARIAS } from '@/lib/inmobiliarias/schemas';
import FichaForm from '@/components/FichaForm';
import type { UnidadEntry } from '@/lib/inmobiliarias/types';

interface Props {
  params: Promise<{ key: string }>;
}

export function generateStaticParams() {
  return INMOBILIARIAS.map((inm) => ({ key: inm.key }));
}

export default async function InmobiliariaPage({ params }: Props) {
  const { key } = await params;
  const inm = INMOBILIARIAS.find((i) => i.key === key);
  const schema = getSchema(key);

  if (!inm || !schema) notFound();

  let stockData: Record<string, UnidadEntry[]> | undefined;
  if (key === 'ecasa') {
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
    stockData = await fetchFundamentaStock();
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header
        className="sticky top-0 z-10 px-8 py-5 border-b"
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

      <main className="flex-1 px-8 py-7">
        <FichaForm inmobiliariaKey={key} inmobiliariaName={inm.name} schema={schema} stockData={stockData} />
      </main>
    </div>
  );
}
