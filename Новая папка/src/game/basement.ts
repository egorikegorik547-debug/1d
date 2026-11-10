import type { Ctx } from './art';
import type { Game } from './engine';
import { FURN, STRUCTS, type FurnId } from './items';
import { drawStructureShape, defaultShape } from './structures';
import { drawDarkness, type Light } from './lighting';
import { mulberry32 } from './rng';
import { drawBulb, drawElampTop, drawGenerator, drawGeneratorFx, drawWire, genFuelFrac, isConsumer, isPowered, loadOf, rootOf } from './power';
import { GEN_MAX_LOAD } from './items';

export const RW = 900;
export const RH = 560;
export const WALL_TOP = 64;
export const LADDER = { x: RW / 2, y: 40 };
export const ENTRY = { x: RW / 2, y: 118 };
export const MATTRESS = { x: 112, y: 130, w: 84, h: 46 };

export interface Furn {
  id: number;
  type: FurnId;
  x: number;
  y: number;
  rot: 0 | 1;
  used: boolean;
  /** id источника питания (генератор или другая лампа) */
  wire?: number;
  /** генератор: бензин в баке (0..GEN_CAP) и состояние */
  fuel?: number;
  on?: boolean;
  spark?: number;
}

export function furnSize(type: FurnId, rot: number) {
  const d = type === 'workbench' ? STRUCTS.workbench : FURN[type];
  return rot ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}
const isSolid = (type: FurnId) => (type === 'workbench' ? true : FURN[type].solid);

const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export function bsView(g: Game) {
  const sc = Math.max(0.6, Math.min(1.3, Math.min(g.W / (RW + 60), g.H / (RH + 60))));
  return { sc, ox: (g.W - RW * sc) / 2, oy: (g.H - RH * sc) / 2 };
}

export function canPlaceFurn(g: Game, type: FurnId, x: number, y: number, rot: 0 | 1): { ok: boolean; reason: string } {
  const { w, h } = furnSize(type, rot);
  if (x - w / 2 < 18 || x + w / 2 > RW - 18 || y - h / 2 < WALL_TOP || y + h / 2 > RH - 18) return { ok: false, reason: 'За пределами комнаты' };
  const solid = isSolid(type);
  if (solid) {
    if (overlap(x - w / 2, y - h / 2, w, h, ENTRY.x - 36, WALL_TOP, 72, 100)) return { ok: false, reason: 'Проход к лестнице' };
    if (overlap(x - w / 2, y - h / 2, w, h, MATTRESS.x - MATTRESS.w / 2, MATTRESS.y - MATTRESS.h / 2, MATTRESS.w, MATTRESS.h)) return { ok: false, reason: 'Место занято' };
    const p = g.player;
    const nx = Math.max(x - w / 2, Math.min(p.x, x + w / 2));
    const ny = Math.max(y - h / 2, Math.min(p.y, y + h / 2));
    if (Math.hypot(p.x - nx, p.y - ny) < p.r + 2) return { ok: false, reason: 'Вы стоите на месте' };
  }
  for (const f of g.furn) {
    if (!solid && !isSolid(f.type)) {
      if (Math.hypot(f.x - x, f.y - y) < 16 && f.type === type) return { ok: false, reason: 'Занято' };
      continue;
    }
    if (!solid || !isSolid(f.type)) continue;
    const s = furnSize(f.type, f.rot);
    if (overlap(x - w / 2, y - h / 2, w, h, f.x - s.w / 2, f.y - s.h / 2, s.w, s.h)) return { ok: false, reason: 'Место занято' };
  }
  return { ok: true, reason: '' };
}

export function furnAt(g: Game, x: number, y: number): Furn | null {
  let best: Furn | null = null;
  for (const f of g.furn) {
    const s = furnSize(f.type, f.rot);
    if (Math.abs(x - f.x) <= s.w / 2 && Math.abs(y - f.y) <= s.h / 2) best = f;
  }
  return best;
}

/** Движение игрока в подвале */
export function moveBasement(g: Game, dt: number) {
  const p = g.player;
  let mx = 0;
  let my = 0;
  if (g.keys.has('KeyW') || g.keys.has('ArrowUp')) my -= 1;
  if (g.keys.has('KeyS') || g.keys.has('ArrowDown')) my += 1;
  if (g.keys.has('KeyA') || g.keys.has('ArrowLeft')) mx -= 1;
  if (g.keys.has('KeyD') || g.keys.has('ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    const sp = g.keys.has('ShiftLeft') ? 240 : 185;
    p.x += (mx / len) * sp * dt;
    p.y += (my / len) * sp * dt;
    p.phase += dt * 12;
  }
  p.x = Math.max(26, Math.min(RW - 26, p.x));
  p.y = Math.max(WALL_TOP + 14, Math.min(RH - 26, p.y));
  for (let it = 0; it < 2; it++) {
    for (const f of g.furn) {
      if (!isSolid(f.type)) continue;
      const s = furnSize(f.type, f.rot);
      const rx = f.x - s.w / 2;
      const ry = f.y - s.h / 2;
      const nx = Math.max(rx, Math.min(p.x, rx + s.w));
      const ny = Math.max(ry, Math.min(p.y, ry + s.h));
      const dx = p.x - nx;
      const dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < p.r * p.r) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          p.x += (dx / d) * (p.r - d);
          p.y += (dy / d) * (p.r - d);
        } else p.y = ry - p.r;
      }
    }
  }
  // мышь → комната
  const v = bsView(g);
  const wx = (g.mouse.x - v.ox) / v.sc;
  const wy = (g.mouse.y - v.oy) / v.sc;
  p.angle = Math.atan2(wy - p.y, wx - p.x);
}

export function updateBasement(g: Game, dt: number) {
  moveBasement(g, dt);
  const p = g.player;
  // буржуйка лечит
  for (const f of g.furn) {
    if (f.type === 'stove' && Math.hypot(p.x - f.x, p.y - f.y) < 110 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + dt * 1.2);
    }
  }
  if (p.hurt > 0) p.hurt -= dt;
}

export interface BsTarget {
  kind: 'ladder' | 'mattress' | 'bed' | 'medcab' | 'armorstand' | 'workbench' | 'generator';
  f?: Furn;
  text: string;
}

export function basementTarget(g: Game): BsTarget | null {
  const p = g.player;
  if (Math.hypot(p.x - LADDER.x, p.y - ENTRY.y) < 70 && p.y < ENTRY.y + 30) return { kind: 'ladder', text: 'Подняться на поверхность' };
  let best: BsTarget | null = null;
  let bd = 62;
  const consider = (d: number, t: BsTarget) => {
    if (d < bd) {
      bd = d;
      best = t;
    }
  };
  const dist = (x: number, y: number, w: number, h: number) => {
    const nx = Math.max(x - w / 2, Math.min(p.x, x + w / 2));
    const ny = Math.max(y - h / 2, Math.min(p.y, y + h / 2));
    return Math.hypot(p.x - nx, p.y - ny);
  };
  consider(dist(MATTRESS.x, MATTRESS.y, MATTRESS.w, MATTRESS.h), { kind: 'mattress', text: 'Лечь спать на матрас (до утра)' });
  for (const f of g.furn) {
    const s = furnSize(f.type, f.rot);
    const d = dist(f.x, f.y, s.w, s.h);
    if (f.type === 'bed') consider(d, { kind: 'bed', f, text: 'Лечь спать в кровать (до утра)' });
    else if (f.type === 'medcab') consider(d, { kind: 'medcab', f, text: f.used ? 'Шкаф пуст до завтра' : 'Взять бинты и лекарства' });
    else if (f.type === 'armorstand') consider(d, { kind: 'armorstand', f, text: f.used ? 'Броня уже починена сегодня' : 'Починить бронежилет' });
    else if (f.type === 'workbench') consider(d, { kind: 'workbench', f, text: 'Работать за верстаком' });
    else if (f.type === 'generator') {
      const pct = Math.round(genFuelFrac(f) * 100);
      consider(d, {
        kind: 'generator',
        f,
        text: `Генератор: бак ${pct}% · ${f.on ? 'E — остановить' : 'E — запустить'} · F — заправить (бензин: ${g.res.gas})`,
      });
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
let floor: HTMLCanvasElement | null = null;

function makeFloor(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = RW;
  c.height = RH;
  const x = c.getContext('2d')!;
  const r = mulberry32(4242);
  x.fillStyle = '#3a3a37';
  x.fillRect(0, 0, RW, RH);
  // бетонные плиты
  for (let j = 0; j < RH; j += 70) {
    for (let i = 0; i < RW; i += 90) {
      const v = r.range(-6, 6);
      x.fillStyle = `rgb(${58 + v},${58 + v},${54 + v})`;
      x.fillRect(i + 1, j + 1, 88, 68);
    }
  }
  x.strokeStyle = 'rgba(0,0,0,0.4)';
  x.lineWidth = 1.5;
  for (let j = 0; j <= RH; j += 70) {
    x.beginPath();
    x.moveTo(0, j);
    x.lineTo(RW, j);
    x.stroke();
  }
  for (let i = 0; i <= RW; i += 90) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i, RH);
    x.stroke();
  }
  // пятна и трещины
  for (let k = 0; k < 140; k++) {
    x.fillStyle = r.chance(0.5) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
    x.beginPath();
    x.ellipse(r.range(0, RW), r.range(0, RH), r.range(2, 14), r.range(2, 9), r.range(0, 3), 0, Math.PI * 2);
    x.fill();
  }
  x.strokeStyle = 'rgba(0,0,0,0.35)';
  x.lineWidth = 1;
  for (let k = 0; k < 10; k++) {
    let cx = r.range(0, RW);
    let cy = r.range(WALL_TOP, RH);
    x.beginPath();
    x.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += r.range(-14, 14);
      cy += r.range(4, 16);
      x.lineTo(cx, cy);
    }
    x.stroke();
  }
  // стена (кирпич)
  x.fillStyle = '#4a3a30';
  x.fillRect(0, 0, RW, WALL_TOP);
  for (let j = 0; j < WALL_TOP; j += 10) {
    for (let i = (j / 10) % 2 ? -14 : 0; i < RW; i += 28) {
      const v = r.range(-10, 10);
      x.fillStyle = `rgb(${96 + v},${68 + v},${54 + v})`;
      x.fillRect(i + 1, j + 1, 26, 8);
    }
  }
  const sh = x.createLinearGradient(0, WALL_TOP - 14, 0, WALL_TOP + 16);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sh;
  x.fillRect(0, WALL_TOP - 14, RW, 30);
  // трубы по стене
  x.fillStyle = '#6a6e70';
  x.fillRect(0, 14, RW, 6);
  x.fillStyle = '#8a8f92';
  x.fillRect(0, 14, RW, 2);
  x.fillStyle = '#4a4d4f';
  for (let i = 80; i < RW; i += 190) x.fillRect(i, 11, 5, 12);
  x.fillStyle = '#7a3a2a';
  x.fillRect(0, 34, RW, 4);
  // боковые стены
  const side = x.createLinearGradient(0, 0, 36, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.6)');
  side.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = side;
  x.fillRect(0, WALL_TOP, 36, RH);
  const side2 = x.createLinearGradient(RW, 0, RW - 36, 0);
  side2.addColorStop(0, 'rgba(0,0,0,0.6)');
  side2.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = side2;
  x.fillRect(RW - 36, WALL_TOP, 36, RH);
  const bot = x.createLinearGradient(0, RH, 0, RH - 30);
  bot.addColorStop(0, 'rgba(0,0,0,0.55)');
  bot.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = bot;
  x.fillRect(0, RH - 30, RW, 30);
  return c;
}

function drawLadder(ctx: Ctx, time: number, night: boolean) {
  const x = LADDER.x;
  // люк (свет сверху)
  const g = ctx.createLinearGradient(0, 0, 0, 130);
  g.addColorStop(0, night ? 'rgba(120,150,210,0.38)' : 'rgba(255,240,190,0.38)');
  g.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 24, 0);
  ctx.lineTo(x + 24, 0);
  ctx.lineTo(x + 54, 140);
  ctx.lineTo(x - 54, 140);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#17120e';
  ctx.fillRect(x - 24, 0, 48, WALL_TOP);
  ctx.strokeStyle = '#a8adb2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 15, 0);
  ctx.lineTo(x - 15, WALL_TOP + 10);
  ctx.moveTo(x + 15, 0);
  ctx.lineTo(x + 15, WALL_TOP + 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let y = 6; y < WALL_TOP + 8; y += 11) {
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.03 * Math.sin(time * 2)})`;
  ctx.fillRect(x - 24, 0, 48, 6);
}

function drawMattress(ctx: Ctx) {
  const { x, y, w, h } = MATTRESS;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  ctx.fillStyle = '#7a7466';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#8f897a';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + (i * w) / 4, -h / 2 + 2);
    ctx.lineTo(-w / 2 + (i * w) / 4, h / 2 - 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#6a5a48';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, 20, h - 6);
  ctx.fillStyle = '#4f5a44';
  ctx.fillRect(-w / 2 + 22, -h / 2 + 2, w - 24, h - 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 30, -h / 2 + 2);
  ctx.quadraticCurveTo(-w / 2 + 40, 0, -w / 2 + 28, h / 2 - 2);
  ctx.stroke();
  ctx.restore();
}

/** Точка подключения провода: у генератора — розетка, у ламп — центр */
function portOf(f: Furn) {
  if (f.type === 'generator') return { x: f.x + 14, y: f.y + 18 };
  return { x: f.x, y: f.y };
}

function drawFurn(ctx: Ctx, f: Furn, time: number, lit = false) {
  const { w, h } = furnSize(f.type, 0);
  ctx.save();
  ctx.translate(f.x, f.y);
  if (f.rot) ctx.rotate(Math.PI / 2);
  const sh = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
  };
  switch (f.type) {
    case 'bed': {
      sh();
      ctx.fillStyle = '#5a3f26';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#e8e2d2';
      ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      ctx.fillStyle = '#c8c2b0';
      ctx.fillRect(-w / 2 + 6, -h / 2 + 7, 22, h - 14);
      ctx.fillStyle = '#9a3a32';
      ctx.fillRect(-w / 2 + 30, -h / 2 + 3, w - 33, h - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 34 + i * 10, -h / 2 + 4);
        ctx.lineTo(-w / 2 + 34 + i * 10, h / 2 - 4);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-w / 2 + 30, -h / 2 + 3, w - 33, 3);
      break;
    }
    case 'medcab': {
      sh();
      ctx.fillStyle = '#d8d6cc';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#7a7a72';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
      ctx.fillStyle = f.used ? '#8a7a7a' : '#b0302c';
      ctx.fillRect(-2.5, -9, 5, 18);
      ctx.fillRect(-9, -2.5, 18, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-w / 2, -h / 2, w, 3);
      break;
    }
    case 'armorstand': {
      sh();
      ctx.fillStyle = '#3a3d41';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.used ? '#5a6050' : '#4b5340';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#25291f';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#7a8268';
      ctx.fillRect(-9, -5, 18, 3);
      ctx.fillStyle = '#c8a37e';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'stove': {
      sh();
      ctx.fillStyle = '#25272a';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#3a3d41';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      ctx.fillStyle = '#17181a';
      ctx.beginPath();
      ctx.arc(-4, -3, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a5f65';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const fl = 0.7 + 0.3 * Math.sin(time * 14);
      ctx.fillStyle = `rgba(255,${Math.round(150 * fl)},40,0.95)`;
      ctx.fillRect(-w / 2 + 4, h / 2 - 6, 12, 3);
      ctx.fillStyle = '#6a3a2a';
      ctx.fillRect(w / 2 - 10, -h / 2 + 3, 6, 6);
      break;
    }
    case 'generator': {
      drawGenerator(ctx, time, { on: !!f.on, fuel: genFuelFrac(f), sputter: !!f.on && genFuelFrac(f) < 0.08, spark: f.spark });
      break;
    }
    case 'bulb': {
      const fl = lit ? 0.86 + 0.1 * Math.sin(time * 15 + f.id) + 0.04 * Math.sin(time * 37) : 1;
      drawBulb(ctx, time, lit, fl);
      break;
    }
    case 'lamp': {
      if (f.wire !== undefined) {
        drawElampTop(ctx, time, lit, lit ? 0.9 + 0.1 * Math.sin(time * 13 + f.id) : 1);
        break;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(2, 3, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a4d52';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath();
      ctx.arc(-1, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rug': {
      ctx.fillStyle = '#6a2a2a';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#8a3a30';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
      ctx.strokeStyle = '#d8b44a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
      ctx.fillStyle = '#d8b44a';
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(-24 + i * 24, 0);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      }
      ctx.fillStyle = '#3a1818';
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(-w / 2 - 3, -h / 2 + 3 + i * 5.6, 3, 2);
        ctx.fillRect(w / 2, -h / 2 + 3 + i * 5.6, 3, 2);
      }
      break;
    }
    case 'shelf': {
      sh();
      ctx.fillStyle = '#5a4128';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#6e5232';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      const cols = ['#a0392e', '#6b7a3a', '#c9b052', '#4a5f78', '#8a8a82'];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-w / 2 + 5 + i * 8, -h / 2 + 5, 6, h - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-w / 2 + 5 + i * 8, -h / 2 + 5, 6, 2);
      }
      break;
    }
    case 'table': {
      sh();
      ctx.fillStyle = '#6e5232';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = '#3a2814';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#d8cfa8';
      ctx.fillRect(-w / 2 + 7, -h / 2 + 6, w - 22, h - 12);
      ctx.strokeStyle = '#7a6a48';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 12, -h / 2 + 22);
      ctx.bezierCurveTo(-8, -h / 2 + 10, 8, h / 2 - 8, w / 2 - 20, -4);
      ctx.stroke();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(-4, -2, 2.4, 0, Math.PI * 2);
      ctx.arc(14, 4, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3d41';
      ctx.fillRect(w / 2 - 12, -5, 7, 10);
      ctx.fillStyle = '#ffd890';
      ctx.fillRect(w / 2 - 10, -3, 3, 6);
      break;
    }
    case 'workbench': {
      const o = defaultShape();
      o.rot = 0;
      drawStructureShape(ctx, 'workbench', o);
      break;
    }
  }
  ctx.restore();
}

export function drawBasement(g: Game, ctx: Ctx, ghost?: { type: FurnId; x: number; y: number; rot: 0 | 1; ok: boolean }) {
  const { W, H } = g;
  const v = bsView(g);
  const night = g.phase === 'night';
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(v.ox, v.oy);
  ctx.scale(v.sc, v.sc);
  if (!floor) floor = makeFloor();
  ctx.drawImage(floor, 0, 0);
  drawLadder(ctx, g.time, night);
  // ковры под всем
  for (const f of g.furn) if (f.type === 'rug') drawFurn(ctx, f, g.time);
  drawMattress(ctx);
  // провода лежат на полу
  for (const f of g.furn) {
    if (f.wire === undefined) continue;
    const up = g.furn.find((q) => q.id === f.wire);
    if (!up) continue;
    const a = portOf(up);
    drawWire(ctx, a.x, a.y, f.x, f.y, isPowered(g, f), g.time);
  }
  if (g.wirePending !== null && ghost === undefined) {
    const src = g.furn.find((q) => q.id === g.wirePending);
    if (src) {
      const a = portOf(src);
      const m = g.mouseWorld();
      drawWire(ctx, a.x, a.y, m.x, m.y, false, g.time, 0.1);
    }
  }
  const sorted = g.furn.filter((f) => f.type !== 'rug').sort((a, b) => a.y - b.y);
  for (const f of sorted) drawFurn(ctx, f, g.time, isPowered(g, f));
  if (g.buildSel === 'wire') {
    const m = g.mouseWorld();
    const hv = furnAt(g, m.x, m.y);
    if (hv) {
      const zs = furnSize(hv.type, hv.rot);
      ctx.strokeStyle = g.ghost.ok ? 'rgba(140,255,160,0.95)' : 'rgba(255,120,90,0.95)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(hv.x - zs.w / 2 - 3, hv.y - zs.h / 2 - 3, zs.w + 6, zs.h + 6);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,230,120,0.9)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // эффекты генераторов: дым, искры, свечение
  for (const f of g.furn) {
    if (f.type !== 'generator') continue;
    ctx.save();
    ctx.translate(f.x, f.y);
    drawGeneratorFx(ctx, g.time, { on: !!f.on, fuel: genFuelFrac(f), sputter: !!f.on && genFuelFrac(f) < 0.08, spark: f.spark }, f.id);
    ctx.restore();
    // табло уровня топлива
    const near = Math.hypot(g.player.x - f.x, g.player.y - f.y) < 130;
    if (near || f.on) {
      const fr = genFuelFrac(f);
      const bx = f.x - 28;
      const by = f.y - 44;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(bx - 1, by - 1, 58, 8);
      ctx.fillStyle = fr < 0.15 ? '#ff4a2a' : fr < 0.4 ? '#ffb02a' : '#ffd860';
      ctx.fillRect(bx, by, 56 * fr, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 8px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⛽ ${Math.round(fr * 100)}% · ⚡${loadOf(g, f)}/${GEN_MAX_LOAD}`, f.x, by - 3);
    }
  }
  g.drawPlayer(ctx);
  if (ghost) {
    const s = furnSize(ghost.type, ghost.rot);
    ctx.save();
    ctx.globalAlpha = 0.6;
    drawFurn(ctx, { id: -1, type: ghost.type, x: ghost.x, y: ghost.y, rot: ghost.rot, used: false }, g.time);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ghost.ok ? 'rgba(90,230,110,0.2)' : 'rgba(240,70,50,0.3)';
    ctx.fillRect(ghost.x - s.w / 2, ghost.y - s.h / 2, s.w, s.h);
    ctx.strokeStyle = ghost.ok ? 'rgba(130,255,150,0.9)' : 'rgba(255,100,80,0.95)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ghost.x - s.w / 2, ghost.y - s.h / 2, s.w, s.h);
    ctx.setLineDash([]);
    ctx.restore();
  }
  // подсветка цели
  const tg = basementTarget(g);
  if (tg && !ghost) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    const tx = tg.kind === 'ladder' ? LADDER.x : tg.kind === 'mattress' ? MATTRESS.x : tg.f!.x;
    const ty = tg.kind === 'ladder' ? ENTRY.y - 34 : tg.kind === 'mattress' ? MATTRESS.y - 36 : tg.f!.y - furnSize(tg.f!.type, tg.f!.rot).h / 2 - 12;
    ctx.fillText('E', tx, ty + Math.sin(g.time * 5) * 2);
  }
  ctx.restore();

  // освещение
  const lights: Light[] = [];
  const sx = (x: number) => v.ox + x * v.sc;
  const sy = (y: number) => v.oy + y * v.sc;
  lights.push({ x: sx(LADDER.x), y: sy(110), r: 230 * v.sc, k: 0.8, warm: night ? 'rgba(80,100,160,0.12)' : 'rgba(255,235,180,0.15)' });
  lights.push({ x: sx(g.player.x), y: sy(g.player.y), r: 95 * v.sc, k: 0.55 });
  for (const f of g.furn) {
    if (f.type === 'lamp' && f.wire === undefined) lights.push({ x: sx(f.x), y: sy(f.y), r: 260 * v.sc, k: 1, warm: 'rgba(255,200,110,0.18)' });
    if (isConsumer(f.type) && isPowered(g, f)) {
      const root = rootOf(g, f);
      const low = root && genFuelFrac(root) < 0.08 ? (Math.sin(g.time * 9 + f.id * 2) > 0.2 ? 1 : 0.3) : 1;
      const fl = (0.94 + 0.06 * Math.sin(g.time * 17 + f.id)) * low;
      if (f.type === 'lamp') lights.push({ x: sx(f.x), y: sy(f.y), r: 330 * v.sc, k: 1.15 * fl, warm: 'rgba(255,244,214,0.2)' });
      else lights.push({ x: sx(f.x), y: sy(f.y), r: 240 * v.sc, k: 1.0 * fl, warm: 'rgba(255,236,190,0.18)' });
    }
    if (f.type === 'generator' && f.on) lights.push({ x: sx(f.x), y: sy(f.y), r: 130 * v.sc, k: 0.6, warm: `rgba(255,150,60,${0.14 + 0.04 * Math.sin(g.time * 10)})` });
    if (f.type === 'stove') lights.push({ x: sx(f.x), y: sy(f.y), r: 190 * v.sc, k: 0.85, warm: `rgba(255,120,40,${0.16 + 0.05 * Math.sin(g.time * 12)})` });
  }
  const lamps = g.furn.filter((f) => (f.type === 'lamp' && f.wire === undefined) || ((f.type === 'lamp' || f.type === 'bulb') && isPowered(g, f))).length;
  drawDarkness(ctx, W, H, Math.max(0.35, 0.8 - lamps * 0.1), [4, 6, 10], lights);
}
