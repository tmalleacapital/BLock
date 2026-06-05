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
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-8 pt-8 pb-6 border-b border-border bg-card/60">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
          Inmobiliaria {inm.name}
        </p>
        <h1
          className="text-2xl font-semibold leading-tight"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Bloqueo de cliente
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
          Rellena los datos del cliente y presiona &ldquo;Bloquear cliente&rdquo; para
          registrarlo en el portal.
        </p>
      </header>

      <main className="flex-1 px-8 py-7">
        <FichaForm inmobiliariaKey={key} schema={schema} stockData={stockData} />
      </main>
    </div>
  );
}
