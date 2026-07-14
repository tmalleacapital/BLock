import type { BlockingStatus } from '@/lib/historyServer';

const MAP: Record<BlockingStatus, { label: string; color: string }> = {
  aceptado:  { label: 'Aceptado',  color: 'var(--success)' },
  rechazado: { label: 'Rechazado', color: 'var(--danger)' },
  pendiente: { label: 'Pendiente', color: 'var(--warning)' },
};

export default function EstadoBadge({ status }: { status?: BlockingStatus }) {
  const b = status ? MAP[status] : null;
  if (!b) return <span style={{ color: 'var(--muted)' }}>—</span>;
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ color: b.color, backgroundColor: `color-mix(in srgb, ${b.color} 12%, transparent)` }}
    >
      {b.label}
    </span>
  );
}
