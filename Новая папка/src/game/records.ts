export interface Records {
  bestWave: number;
  bestKills: number;
  bestTime: number;
  games: number;
  totalKills: number;
  found: string[];
}

const KEY = 'dead-city-records-v2';
const EMPTY: Records = { bestWave: 0, bestKills: 0, bestTime: 0, games: 0, totalKills: 0, found: [] };

export function getRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...EMPTY, found: [] };
}

function save(r: Records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function saveRun(wave: number, kills: number, time: number) {
  const r = getRecords();
  r.games++;
  r.totalKills += kills;
  r.bestWave = Math.max(r.bestWave, wave);
  r.bestKills = Math.max(r.bestKills, kills);
  r.bestTime = Math.max(r.bestTime, time);
  save(r);
}

export function markFound(id: string) {
  const r = getRecords();
  if (!r.found.includes(id)) {
    r.found.push(id);
    save(r);
  }
}
