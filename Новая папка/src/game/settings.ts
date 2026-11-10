import { useSyncExternalStore } from 'react';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';
export type Quality = 'low' | 'med' | 'high';
export type CrosshairStyle = 'cross' | 'dot' | 'circle';
export type CrosshairColor = 'white' | 'lime' | 'red' | 'amber' | 'cyan';

export interface Settings {
  master: number;
  sfx: number;
  music: number;
  shake: number;
  particles: Quality;
  vignette: number;
  look: number;
  minimap: boolean;
  dmgNumbers: boolean;
  fps: boolean;
  crosshair: CrosshairStyle;
  crosshairColor: CrosshairColor;
  difficulty: Difficulty;
}

export const DEFAULTS: Settings = {
  master: 0.8,
  sfx: 0.9,
  music: 0.5,
  shake: 1,
  particles: 'high',
  vignette: 1,
  look: 0.22,
  minimap: true,
  dmgNumbers: true,
  fps: false,
  crosshair: 'cross',
  crosshairColor: 'white',
  difficulty: 'normal',
};

export const DIFFICULTY: Record<
  Difficulty,
  { name: string; desc: string; hp: number; dmg: number; count: number; reward: number; money: number; color: string }
> = {
  easy: { name: 'Новичок', desc: 'Слабее враги, больше денег', hp: 0.8, dmg: 0.7, count: 0.8, reward: 1.2, money: 300, color: '#8fbf6a' },
  normal: { name: 'Выживший', desc: 'Классический опыт', hp: 1, dmg: 1, count: 1, reward: 1, money: 150, color: '#d8c778' },
  hard: { name: 'Ветеран', desc: 'Крепче и злее', hp: 1.3, dmg: 1.3, count: 1.2, reward: 0.9, money: 100, color: '#d98a3a' },
  nightmare: { name: 'Кошмар', desc: 'Город хочет вас убить', hp: 1.7, dmg: 1.75, count: 1.5, reward: 0.8, money: 50, color: '#c0392b' },
};

const KEY = 'dead-city-settings-v2';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

/** Живой объект — движок читает его напрямую */
export const settings: Settings = load();

let snapshot: Settings = { ...settings };
const listeners = new Set<() => void>();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  settings[key] = value;
  snapshot = { ...settings };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS);
  snapshot = { ...settings };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeSettings(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, () => snapshot, () => snapshot);
}

export const QUALITY_MUL: Record<Quality, number> = { low: 0.35, med: 0.7, high: 1 };

export const CROSSHAIR_COLORS: Record<CrosshairColor, string> = {
  white: '235,230,210',
  lime: '150,255,120',
  red: '255,90,80',
  amber: '255,200,80',
  cyan: '110,230,255',
};
