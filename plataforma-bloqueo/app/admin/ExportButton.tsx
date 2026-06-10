'use client';

import type { BlockingRecord } from '@/lib/historyServer';

export default function ExportButton({ records }: { records: BlockingRecord[] }) {
  function handleExport() {
    const header = ['ID', 'Fecha', 'RUT', 'Nombre', 'Portal', 'Asesor'];
    const rows = records.map((r) => [
      r.id,
      r.fecha,
      r.rut,
      r.nombre,
      r.inmobiliariaName,
      r.asesorEmail ?? '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-bloqueos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Exportar CSV
    </button>
  );
}
