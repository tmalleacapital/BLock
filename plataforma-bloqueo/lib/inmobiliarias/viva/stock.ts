import type { UnidadEntry } from '../types';

const INMOBILIARIA_ID = 31;
const ORED_URL = 'https://ored.cl/api/public/stock/disponibles';

interface OredRow {
  proyecto: string;
  unidad: string;
  tipologia: string;
}

interface OredResponse {
  total: number;
  limit: number;
  offset: number;
  rows: OredRow[];
}

export async function fetchVivaStock(): Promise<Record<string, UnidadEntry[]>> {
  const res = await fetch(
    `${ORED_URL}?inmobiliaria_id=${INMOBILIARIA_ID}&limit=20000`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error(`ORED API error: ${res.status}`);

  const data: OredResponse = await res.json();
  const stock: Record<string, UnidadEntry[]> = {};

  for (const row of data.rows) {
    if (!stock[row.proyecto]) stock[row.proyecto] = [];
    stock[row.proyecto].push({ unidad: row.unidad, tipologia: row.tipologia });
  }

  return stock;
}
