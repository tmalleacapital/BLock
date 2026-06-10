import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export interface BlockingRecord {
  id: string;
  inmobiliariaKey: string;
  inmobiliariaName: string;
  rut: string;
  nombre: string;
  fecha: string;
  asesorEmail?: string;
}

type HistoryGlobal = {
  __history_records: BlockingRecord[];
  __history_loaded: boolean;
};

const g = global as typeof global & Partial<HistoryGlobal>;
g.__history_records ??= [];
g.__history_loaded  ??= false;

const DATA_DIR  = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'historial.json');

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadFromDisk(): BlockingRecord[] {
  try {
    ensureDir();
    if (!existsSync(DATA_FILE)) return [];
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as BlockingRecord[];
  } catch {
    return [];
  }
}

function writeToDisk(records: BlockingRecord[]): void {
  try {
    ensureDir();
    writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch {
    // write failed — data stays in memory, will retry on next write
  }
}

function getRecords(): BlockingRecord[] {
  if (!g.__history_loaded) {
    g.__history_records = loadFromDisk();
    g.__history_loaded  = true;
  }
  return g.__history_records!;
}

export function getAllHistory(): BlockingRecord[] {
  return [...getRecords()].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function addRecord(
  record: Omit<BlockingRecord, 'id' | 'fecha'>,
): BlockingRecord {
  const records = getRecords();
  const newRecord: BlockingRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
  };
  records.unshift(newRecord);
  writeToDisk(records);
  return newRecord;
}

export function isDuplicate(rut: string, inmobiliariaKey: string): boolean {
  const norm = (r: string) => r.replace(/[.\-]/g, '').toLowerCase();
  return getRecords().some(
    (r) => norm(r.rut) === norm(rut) && r.inmobiliariaKey === inmobiliariaKey,
  );
}
