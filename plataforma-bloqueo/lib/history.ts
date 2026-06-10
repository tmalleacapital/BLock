const STORAGE_KEY = 'block_history';
const MAX_RECORDS = 50;

export interface BlockingRecord {
  id: string;
  inmobiliariaKey: string;
  inmobiliariaName: string;
  rut: string;
  nombre: string;
  fecha: string;
  asesorEmail?: string;
}

export function getHistory(): BlockingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as BlockingRecord[];
  } catch {
    return [];
  }
}

export function saveBlocking(record: Omit<BlockingRecord, 'id' | 'fecha'>): void {
  if (typeof window === 'undefined') return;
  const history = getHistory();
  const newRecord: BlockingRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newRecord, ...history].slice(0, MAX_RECORDS)));
}
