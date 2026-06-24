import type { UnidadEntry } from './types';

const ORED_URL = 'https://ored.cl/api/public/stock/disponibles';
const TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 500;

interface OredRow {
  proyecto: string;
  unidad: string;
  tipologia: string;
}

interface OredResponse {
  total: number;
  rows: OredRow[];
}

interface CacheEntry {
  data: Record<string, UnidadEntry[]>;
  fetchedAt: number;
}

const g = globalThis as typeof globalThis & {
  __oredStockCache?: Map<number, CacheEntry>;
};
if (!g.__oredStockCache) g.__oredStockCache = new Map();

export async function fetchOredStock(inmobiliariaId: number): Promise<Record<string, UnidadEntry[]>> {
  const now = Date.now();
  const cached = g.__oredStockCache!.get(inmobiliariaId);
  if (cached && now - cached.fetchedAt < TTL_MS) return cached.data;

  const allRows: OredRow[] = [];
  let total = Infinity;

  while (allRows.length < total) {
    const res = await fetch(
      `${ORED_URL}?inmobiliaria_id=${inmobiliariaId}&limit=${PAGE_SIZE}&offset=${allRows.length}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) throw new Error(`ORED API error: ${res.status}`);
    const data: OredResponse = await res.json();
    total = data.total;
    if (data.rows.length === 0) break;
    allRows.push(...data.rows);
  }

  const stock: Record<string, UnidadEntry[]> = {};
  for (const row of allRows) {
    if (!row.proyecto) continue;
    if (!stock[row.proyecto]) stock[row.proyecto] = [];
    stock[row.proyecto].push({ unidad: row.unidad, tipologia: row.tipologia });
  }

  g.__oredStockCache!.set(inmobiliariaId, { data: stock, fetchedAt: now });
  return stock;
}
