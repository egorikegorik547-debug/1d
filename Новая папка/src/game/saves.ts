/* Сохранения: localStorage (мгновенно) + PostgreSQL через /api/saves (между устройствами) */

export interface SaveSummary {
  day: number;
  wave: number;
  money: number;
  kills: number;
  phase: 'day' | 'night';
  loc: 'surface' | 'basement';
  weapons: number;
  structures: number;
  time: number;
  difficulty: string;
}

export interface SaveEntry {
  slot: number;
  summary: SaveSummary;
  updatedAt: number;
}

export const AUTO_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3];

const CID_KEY = 'dead-city-client-id';
const key = (slot: number) => `dead-city-save-${slot}`;

export function getClientId(): string {
  try {
    let id = localStorage.getItem(CID_KEY);
    if (!id || id.length < 8) {
      id = (crypto.randomUUID?.() ?? `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`) as string;
      localStorage.setItem(CID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous-client';
  }
}

interface Stored {
  data: unknown;
  summary: SaveSummary;
  updatedAt: number;
}

function readLocal(slot: number): Stored | null {
  try {
    const raw = localStorage.getItem(key(slot));
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

export function hasAnyLocalSave(): boolean {
  return [AUTO_SLOT, ...MANUAL_SLOTS].some((s) => readLocal(s));
}

export async function listSaves(): Promise<SaveEntry[]> {
  const map = new Map<number, SaveEntry>();
  for (const s of [AUTO_SLOT, ...MANUAL_SLOTS]) {
    const l = readLocal(s);
    if (l) map.set(s, { slot: s, summary: l.summary, updatedAt: l.updatedAt });
  }
  return [...map.values()].sort((a, b) => a.slot - b.slot);
}

export async function writeSave(slot: number, data: unknown, summary: SaveSummary): Promise<void> {
  const updatedAt = Date.now();
  try {
    localStorage.setItem(key(slot), JSON.stringify({ data, summary, updatedAt } satisfies Stored));
  } catch {
    /* ignore */
  }
}

export async function readSave(slot: number): Promise<unknown | null> {
  const local = readLocal(slot);
  return local ? local.data : null;
}

export async function deleteSave(slot: number): Promise<void> {
  try {
    localStorage.removeItem(key(slot));
  } catch {
    /* ignore */
  }
}
