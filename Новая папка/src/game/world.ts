import { mulberry32, type Rng } from './rng';
import {
  CAR_H,
  CAR_W,
  DEAD,
  GREENS,
  LIGHT_GREENS,
  drawBarrier,
  drawBrick,
  drawBush,
  drawCarShape,
  drawChunk,
  drawCrack,
  drawGrass,
  drawVine,
  type Ctx,
} from './art';

export const CELL = 520;
export const GRID = 6;
export const WORLD = CELL * GRID;
export const LOT_MIN = 70;
export const LOT_MAX = 450;
export const CENTER = { x: WORLD / 2, y: WORLD / 2 };
export const SAFE_RADIUS = 175;
/** Днём город ограничен кольцом, ночью границы расширяются на всю карту */
export const DAY_RADIUS = 1000;
export const NIGHT_RADIUS = 2300;
const T = 18; // толщина стен
const SIDEWALK = 12;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type ColliderType = 'wall' | 'rubble' | 'car' | 'prop' | 'tree' | 'struct';
export interface Collider extends Rect {
  type: ColliderType;
  stamp?: number;
  /** ссылка на сооружение игрока (для type === 'struct') */
  ref?: unknown;
}
export interface Building {
  id: number;
  rect: Rect;
  kind: 'damaged' | 'ruined';
  roof: HTMLCanvasElement | null;
  roofX: number;
  roofY: number;
  alpha: number;
}
export interface Tree {
  x: number;
  y: number;
  s: number;
  v: number;
}
export interface Cell {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
export interface Access {
  id: number;
  buildingId: number;
  kind: 'upper' | 'cellar';
  x: number;
  y: number;
  seed: number;
}
export interface Camp {
  id: number;
  buildingId: number;
  x: number;
  y: number;
  seed: number;
}
export interface World {
  accesses: Access[];
  camps: Camp[];
  colliders: Collider[];
  grid: ColliderGrid;
  buildings: Building[];
  trees: Tree[];
  cells: Cell[][];
  lootSpots: { x: number; y: number }[];
  minimap: HTMLCanvasElement;
  awning: { canvas: HTMLCanvasElement; x: number; y: number };
  treeSprites: HTMLCanvasElement[];
  trader: { x: number; y: number };
  /** сид внешнего кольца: ночью оно генерируется заново */
  nightSeed: number;
  core: Layer;
  ring: Layer;
}

/** Слой города: ядро (днём) или кольцо (ночью, каждый раз новое) */
export interface Layer {
  colliders: Collider[];
  buildings: Building[];
  trees: Tree[];
  accesses: Access[];
  camps: Camp[];
  lootSpots: { x: number; y: number }[];
  under: Drawable[];
  over: Drawable[];
  props: Rect[];
}

export interface Drawable extends Rect {
  draw: (ctx: Ctx) => void;
}

interface Acc {
  colliders: Collider[];
  under: Drawable[];
  over: Drawable[];
  trees: Tree[];
  loot: { x: number; y: number }[];
  buildings: Building[];
}

/* ------------------------------------------------------------------ */
/* Сетка коллайдеров                                                   */
/* ------------------------------------------------------------------ */
export class ColliderGrid {
  size = 128;
  cols: number;
  cells: Collider[][];
  stamp = 0;
  constructor(list: Collider[]) {
    this.cols = Math.ceil(WORLD / this.size) + 1;
    this.cells = Array.from({ length: this.cols * this.cols }, () => []);
    for (const c of list) {
      const x0 = Math.max(0, Math.floor(c.x / this.size));
      const x1 = Math.min(this.cols - 1, Math.floor((c.x + c.w) / this.size));
      const y0 = Math.max(0, Math.floor(c.y / this.size));
      const y1 = Math.min(this.cols - 1, Math.floor((c.y + c.h) / this.size));
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) this.cells[j * this.cols + i].push(c);
    }
  }
  private range(c: Collider) {
    return {
      x0: Math.max(0, Math.floor(c.x / this.size)),
      x1: Math.min(this.cols - 1, Math.floor((c.x + c.w) / this.size)),
      y0: Math.max(0, Math.floor(c.y / this.size)),
      y1: Math.min(this.cols - 1, Math.floor((c.y + c.h) / this.size)),
    };
  }
  add(c: Collider) {
    const r = this.range(c);
    for (let j = r.y0; j <= r.y1; j++) for (let i = r.x0; i <= r.x1; i++) this.cells[j * this.cols + i].push(c);
  }
  remove(c: Collider) {
    const r = this.range(c);
    for (let j = r.y0; j <= r.y1; j++) {
      for (let i = r.x0; i <= r.x1; i++) {
        const list = this.cells[j * this.cols + i];
        const k = list.indexOf(c);
        if (k >= 0) list.splice(k, 1);
      }
    }
  }
  query(x0: number, y0: number, x1: number, y1: number, out: Collider[]) {
    out.length = 0;
    this.stamp++;
    const a = Math.max(0, Math.floor(x0 / this.size));
    const b = Math.min(this.cols - 1, Math.floor(x1 / this.size));
    const c = Math.max(0, Math.floor(y0 / this.size));
    const d = Math.min(this.cols - 1, Math.floor(y1 / this.size));
    for (let j = c; j <= d; j++) {
      for (let i = a; i <= b; i++) {
        const list = this.cells[j * this.cols + i];
        for (let k = 0; k < list.length; k++) {
          const col = list[k];
          if (col.stamp !== this.stamp) {
            col.stamp = this.stamp;
            out.push(col);
          }
        }
      }
    }
  }
  /** Пуля попала в препятствие? (деревья не блокируют) */
  blockedPoint(x: number, y: number): boolean {
    const i = Math.floor(x / this.size);
    const j = Math.floor(y / this.size);
    if (i < 0 || j < 0 || i >= this.cols || j >= this.cols) return true;
    const list = this.cells[j * this.cols + i];
    for (let k = 0; k < list.length; k++) {
      const c = list[k];
      if (c.type === 'tree' || c.type === 'struct') continue;
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return true;
    }
    return false;
  }
  circleBlocked(x: number, y: number, r: number): boolean {
    const i = Math.floor(x / this.size);
    const j = Math.floor(y / this.size);
    for (let jj = j - 1; jj <= j + 1; jj++) {
      for (let ii = i - 1; ii <= i + 1; ii++) {
        if (ii < 0 || jj < 0 || ii >= this.cols || jj >= this.cols) continue;
        const list = this.cells[jj * this.cols + ii];
        for (let k = 0; k < list.length; k++) {
          const c = list[k];
          const nx = Math.max(c.x, Math.min(x, c.x + c.w));
          const ny = Math.max(c.y, Math.min(y, c.y + c.h));
          if ((nx - x) ** 2 + (ny - y) ** 2 < r * r) return true;
        }
      }
    }
    return false;
  }
  hasLOS(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    const n = Math.ceil(d / 14);
    for (let i = 1; i < n; i++) {
      if (this.blockedPoint(x1 + (dx * i) / n, y1 + (dy * i) / n)) return false;
    }
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Стены и сегменты                                                    */
/* ------------------------------------------------------------------ */
interface Side {
  horiz: boolean;
  ox: number;
  oy: number;
  len: number;
}
interface Seg {
  side: Side;
  a: number;
  b: number;
  rect: Rect;
}

function sidesOf(x: number, y: number, w: number, h: number): Side[] {
  return [
    { horiz: true, ox: x, oy: y, len: w },
    { horiz: true, ox: x, oy: y + h - T, len: w },
    { horiz: false, ox: x, oy: y + T, len: h - 2 * T },
    { horiz: false, ox: x + w - T, oy: y + T, len: h - 2 * T },
  ];
}

function segRect(s: Side, a: number, b: number): Rect {
  return s.horiz ? { x: s.ox + a, y: s.oy, w: b - a, h: T } : { x: s.ox, y: s.oy + a, w: T, h: b - a };
}

function cut(len: number, gaps: [number, number][]): [number, number][] {
  gaps.sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  let cursor = 0;
  for (const g of gaps) {
    if (g[0] - cursor > 12) out.push([cursor, g[0]]);
    cursor = Math.max(cursor, g[1]);
  }
  if (len - cursor > 12) out.push([cursor, len]);
  return out;
}

function randGaps(r: Rng, len: number, count: number, minW: number, maxW: number): [number, number][] {
  const gaps: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const w = r.range(minW, Math.max(minW + 1, maxW));
    const s = r.range(8, Math.max(9, len - w - 8));
    gaps.push([s, s + w]);
  }
  return gaps;
}

function stubs(r: Rng, len: number, minC: number, maxC: number): [number, number][] {
  const c = r.int(minC, maxC);
  const out: [number, number][] = [];
  for (let i = 0; i < c; i++) {
    const l = r.range(22, Math.max(24, Math.min(90, len * 0.4)));
    const edge = r.chance(0.5);
    const s = edge ? (i === 0 ? 0 : len - l) : r.range(0, Math.max(1, len - l));
    out.push([s, s + l]);
  }
  return out;
}

function damagedSegs(r: Rng, len: number, mode: 'door' | 'broken' | 'cracked' | 'collapsed'): [number, number][] {
  switch (mode) {
    case 'door': {
      const dw = 54;
      const s = r.range(T + 8, Math.max(T + 9, len - dw - T - 8));
      const gaps: [number, number][] = [[s, s + dw]];
      if (r.chance(0.35)) gaps.push(...randGaps(r, len, 1, 40, 80));
      return cut(len, gaps);
    }
    case 'cracked':
      return cut(len, randGaps(r, len, 1, 28, 46));
    case 'broken':
      return cut(len, randGaps(r, len, r.int(1, 2), 60, Math.min(150, len * 0.45)));
    default:
      return stubs(r, len, 1, 2);
  }
}

/* ------------------------------------------------------------------ */
/* Стили                                                               */
/* ------------------------------------------------------------------ */
const WALL_STYLES = [
  { fill: '#7a4a3c', brick: true },
  { fill: '#6e4638', brick: true },
  { fill: '#7d7d77', brick: false },
  { fill: '#85806d', brick: false },
  { fill: '#6c7568', brick: false },
];

type WallStyle = (typeof WALL_STYLES)[number];

function drawWallRect(ctx: Ctx, d: Rng, rc: Rect, style: WallStyle) {
  ctx.fillStyle = style.fill;
  ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
  const horiz = rc.w >= rc.h;
  ctx.strokeStyle = 'rgba(0,0,0,0.26)';
  ctx.lineWidth = 1;
  if (style.brick) {
    ctx.beginPath();
    if (horiz) {
      for (let k = 1; k < 3; k++) {
        ctx.moveTo(rc.x, rc.y + (k * rc.h) / 3);
        ctx.lineTo(rc.x + rc.w, rc.y + (k * rc.h) / 3);
      }
      for (let k = 0; k < 3; k++) {
        const off = k % 2 === 0 ? 0 : 6;
        for (let px = rc.x + off; px < rc.x + rc.w; px += 12) {
          ctx.moveTo(px, rc.y + (k * rc.h) / 3);
          ctx.lineTo(px, rc.y + ((k + 1) * rc.h) / 3);
        }
      }
    } else {
      for (let k = 1; k < 3; k++) {
        ctx.moveTo(rc.x + (k * rc.w) / 3, rc.y);
        ctx.lineTo(rc.x + (k * rc.w) / 3, rc.y + rc.h);
      }
      for (let k = 0; k < 3; k++) {
        const off = k % 2 === 0 ? 0 : 6;
        for (let py = rc.y + off; py < rc.y + rc.h; py += 12) {
          ctx.moveTo(rc.x + (k * rc.w) / 3, py);
          ctx.lineTo(rc.x + ((k + 1) * rc.w) / 3, py);
        }
      }
    }
    ctx.stroke();
  }
  // осыпавшаяся штукатурка и копоть
  const patches = Math.floor((rc.w * rc.h) / 260);
  for (let i = 0; i < patches; i++) {
    ctx.fillStyle = d.chance(0.5) ? 'rgba(170,165,150,0.35)' : 'rgba(0,0,0,0.2)';
    ctx.fillRect(rc.x + d.range(0, rc.w - 4), rc.y + d.range(0, rc.h - 3), d.range(3, 9), d.range(2, 6));
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(rc.x, rc.y, rc.w, 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.strokeRect(rc.x + 0.5, rc.y + 0.5, rc.w - 1, rc.h - 1);
  if (rc.w * rc.h > 600 && d.chance(0.7)) drawCrack(ctx, d, rc.x + d.range(4, rc.w - 4), rc.y + d.range(3, rc.h - 3), 26, 0.6);
}

function drawJaggedEnd(ctx: Ctx, d: Rng, seg: Seg, atEnd: boolean, style: WallStyle) {
  const s = seg.side;
  const dir = atEnd ? 1 : -1;
  const base = atEnd ? seg.b : seg.a;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  const e1 = d.range(2, 10);
  const e2 = d.range(4, 13);
  const e3 = d.range(1, 9);
  ctx.beginPath();
  if (s.horiz) {
    const px = s.ox + base;
    ctx.moveTo(px, s.oy);
    ctx.lineTo(px + dir * e1, s.oy);
    ctx.lineTo(px + dir * e2, s.oy + T * 0.5);
    ctx.lineTo(px + dir * e3, s.oy + T);
    ctx.lineTo(px, s.oy + T);
  } else {
    const py = s.oy + base;
    ctx.moveTo(s.ox, py);
    ctx.lineTo(s.ox, py + dir * e1);
    ctx.lineTo(s.ox + T * 0.5, py + dir * e2);
    ctx.lineTo(s.ox + T, py + dir * e3);
    ctx.lineTo(s.ox + T, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function leafPatch(ctx: Ctx, d: Rng, rc: Rect, n: number) {
  for (let i = 0; i < n; i++) {
    const lx = rc.x + d.range(-3, rc.w + 3);
    const ly = rc.y + d.range(-3, rc.h + 3);
    const ls = d.range(2.5, 5);
    ctx.fillStyle = d.chance(0.1) ? d.pick(DEAD) : d.pick(GREENS);
    ctx.beginPath();
    ctx.ellipse(lx, ly, ls, ls * 0.55, d.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ */
/* Крыша                                                               */
/* ------------------------------------------------------------------ */
const ROOF_PAD = 10;
const RC = 20;
const ROOF_COLORS = ['#5b4036', '#4a4d4f', '#654a3a', '#434d46', '#58504a'];

function makeRoof(rect: Rect, seed: number): { canvas: HTMLCanvasElement; x: number; y: number } {
  const r = mulberry32(seed);
  const rx = rect.x - ROOF_PAD;
  const ry = rect.y - ROOF_PAD;
  const rw = rect.w + ROOF_PAD * 2;
  const rh = rect.h + ROOF_PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(rw + 60);
  canvas.height = Math.ceil(rh + 60);
  const ctx = canvas.getContext('2d')!;
  const off = 30;
  ctx.translate(off, off);

  const cols = Math.ceil(rw / RC);
  const rows = Math.ceil(rh / RC);
  const present: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(true));
  const blobs = r.int(1, 3);
  for (let b = 0; b < blobs; b++) {
    const cx = r.range(0.15, 0.85) * cols;
    const cy = r.range(0.15, 0.85) * rows;
    const rad = r.range(0.16, 0.34) * Math.min(cols, rows) * r.range(0.9, 1.4);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const dd = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
        if (dd < rad * r.range(0.8, 1.15)) present[j][i] = false;
      }
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (r.chance(0.06)) present[j][i] = false;
  // на краях часто отсутствуют части
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if ((i === 0 || j === 0 || i === cols - 1 || j === rows - 1) && r.chance(0.15)) present[j][i] = false;
    }
  }

  const base = r.pick(ROOF_COLORS);
  const clip = new Path2D();
  // координаты крыши в локальной системе: (0,0) = левый верхний угол крыши
  const exists = (i: number, j: number) => i >= 0 && j >= 0 && i < cols && j < rows && present[j][i];

  // стропила в проломах
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (present[j][i]) continue;
      if (j % 3 === 0) {
        ctx.fillStyle = '#3a2a1c';
        ctx.fillRect(i * RC, j * RC + 8, RC, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(i * RC, j * RC + 8, RC, 1);
      }
      if (i % 4 === 1 && r.chance(0.6)) {
        ctx.fillStyle = '#33261a';
        ctx.fillRect(i * RC + 8, j * RC, 4, RC);
      }
    }
  }
  // кровля
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!present[j][i]) continue;
      clip.rect(i * RC, j * RC, RC, RC);
      ctx.fillStyle = base;
      ctx.fillRect(i * RC, j * RC, RC, RC);
      const v = r.range(-0.12, 0.12);
      ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      ctx.fillRect(i * RC, j * RC, RC, RC);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * RC, j * RC + 6.5);
      ctx.lineTo(i * RC + RC, j * RC + 6.5);
      ctx.moveTo(i * RC, j * RC + 13.5);
      ctx.lineTo(i * RC + RC, j * RC + 13.5);
      ctx.stroke();
      if (r.chance(0.08)) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(i * RC + r.range(0, 10), j * RC + r.range(0, 12), r.range(5, 10), r.range(3, 6));
      }
    }
  }
  // рваные края
  ctx.fillStyle = 'rgba(10,8,6,0.7)';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!present[j][i]) continue;
      if (!exists(i - 1, j)) ctx.fillRect(i * RC, j * RC, 3, RC);
      if (!exists(i + 1, j)) ctx.fillRect(i * RC + RC - 3, j * RC, 3, RC);
      if (!exists(i, j - 1)) ctx.fillRect(i * RC, j * RC, RC, 3);
      if (!exists(i, j + 1)) ctx.fillRect(i * RC, j * RC + RC - 3, RC, 3);
    }
  }
  // конёк
  ctx.save();
  ctx.clip(clip);
  const midY = rh / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, midY - 2, rw, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, midY - 3, rw, 1.5);

  // мох и листва
  const d = mulberry32(seed ^ 0x51ed);
  const mossN = Math.floor((cols * rows) / 2.2);
  for (let k = 0; k < mossN; k++) {
    const mx = d.range(0, rw);
    const my = d.range(0, rh);
    ctx.fillStyle = d.pick(['rgba(60,95,40,0.5)', 'rgba(80,110,50,0.4)', 'rgba(45,75,32,0.55)']);
    ctx.beginPath();
    ctx.ellipse(mx, my, d.range(8, 24), d.range(6, 16), d.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // лозы по крыше
  const edgeCells: { i: number; j: number }[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!present[j][i]) continue;
      if (!exists(i - 1, j) || !exists(i + 1, j) || !exists(i, j - 1) || !exists(i, j + 1)) edgeCells.push({ i, j });
    }
  }
  for (const c of edgeCells) {
    if (!d.chance(0.55)) continue;
    drawVine(ctx, d, c.i * RC + RC / 2, c.j * RC + RC / 2, d.range(0, Math.PI * 2), d.range(30, 90), 1.15);
  }
  for (let k = 0; k < Math.floor((cols * rows) / 5); k++) {
    drawVine(ctx, d, d.range(0, rw), d.range(0, rh), d.range(0, Math.PI * 2), d.range(25, 70), 1.1);
  }
  // кусты, выросшие на крыше
  const bushes = d.int(2, 4);
  for (let k = 0; k < bushes; k++) {
    const c = d.pick(edgeCells.length ? edgeCells : [{ i: 1, j: 1 }]);
    drawBush(ctx, d, c.i * RC + RC / 2, c.j * RC + RC / 2, d.range(11, 19));
  }
  ctx.restore();

  // свисающие лозы в проломы (без обрезки)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (!present[j][i]) continue;
      const sides: [number, number, number, number][] = [
        [-1, 0, i * RC, j * RC + RC / 2],
        [1, 0, i * RC + RC, j * RC + RC / 2],
        [0, -1, i * RC + RC / 2, j * RC],
        [0, 1, i * RC + RC / 2, j * RC + RC],
      ];
      for (const [dx, dy, px, py] of sides) {
        if (exists(i + dx, j + dy)) continue;
        if (i + dx < 0 || j + dy < 0 || i + dx >= cols || j + dy >= rows) continue;
        if (d.chance(0.22)) drawVine(ctx, d, px, py, Math.atan2(dy, dx) + d.range(-0.5, 0.5), d.range(14, 40), 1.1);
      }
    }
  }

  // дымоход
  const pc = d.pick(edgeCells.length ? edgeCells : [{ i: 1, j: 1 }]);
  if (d.chance(0.6)) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(pc.i * RC + 4, pc.j * RC + 5, 22, 22);
    ctx.fillStyle = '#6b4a3e';
    ctx.fillRect(pc.i * RC + 2, pc.j * RC + 2, 22, 22);
    ctx.fillStyle = '#16120f';
    ctx.fillRect(pc.i * RC + 7, pc.j * RC + 7, 12, 12);
  }

  return { canvas, x: rx - off, y: ry - off };
}

/* ------------------------------------------------------------------ */
/* Здание                                                              */
/* ------------------------------------------------------------------ */
function createBuilding(id: number, rect: Rect, kind: 'damaged' | 'ruined', seed: number, acc: Acc) {
  const r = mulberry32(seed);
  const { x, y, w, h } = rect;
  const style = r.pick(WALL_STYLES);
  const sides = sidesOf(x, y, w, h);
  const segs: Seg[] = [];
  const push = (side: Side, list: [number, number][]) => {
    for (const [a, b] of list) segs.push({ side, a, b, rect: segRect(side, a, b) });
  };

  if (kind === 'damaged') {
    const doorSide = r.int(0, 3);
    sides.forEach((s, i) => {
      let mode: 'door' | 'broken' | 'cracked' | 'collapsed';
      if (i === doorSide) mode = 'door';
      else {
        const q = r.next();
        mode = q < 0.4 ? 'broken' : q < 0.75 ? 'cracked' : 'collapsed';
      }
      push(s, damagedSegs(r, s.len, mode));
    });
    if (w >= 250 && h >= 200) {
      const px = x + w * r.range(0.38, 0.62);
      const part: Side = { horiz: false, ox: px, oy: y + T, len: h - 2 * T };
      push(part, damagedSegs(r, part.len, r.chance(0.6) ? 'door' : 'broken'));
    }
  } else {
    sides.forEach((s) => {
      if (r.chance(0.6)) push(s, stubs(r, s.len, 1, 2));
    });
    if (segs.length < 2) push(sides[r.int(0, 1)], stubs(r, sides[0].len, 1, 1));
  }
  for (const s of segs) acc.colliders.push({ ...s.rect, type: 'wall' });

  // кучи обломков (укрытия)
  const heaps: { x: number; y: number; s: number }[] = [];
  const nHeaps = kind === 'ruined' ? r.int(3, 5) : r.int(0, 2);
  for (let i = 0; i < nHeaps; i++) {
    const s = r.range(20, 30);
    const hx = x + T + 26 + r.next() * Math.max(1, w - 2 * T - 52);
    const hy = y + T + 26 + r.next() * Math.max(1, h - 2 * T - 52);
    heaps.push({ x: hx, y: hy, s });
    acc.colliders.push({ x: hx - s * 0.55, y: hy - s * 0.55, w: s * 1.1, h: s * 1.1, type: 'rubble' });
  }
  // дерево, выросшее в руинах
  let tree: Tree | null = null;
  if (kind === 'ruined' && r.chance(0.45)) {
    tree = { x: x + w * r.range(0.35, 0.65), y: y + h * r.range(0.35, 0.65), s: r.range(0.8, 1.2), v: r.int(0, 2) };
    acc.trees.push(tree);
    acc.colliders.push({ x: tree.x - 7, y: tree.y - 7, w: 14, h: 14, type: 'tree' });
  }
  // лут
  const lootN = kind === 'ruined' ? r.int(0, 1) : r.int(1, 2);
  for (let i = 0; i < lootN; i++) {
    acc.loot.push({ x: x + T + 24 + r.next() * Math.max(1, w - 2 * T - 48), y: y + T + 24 + r.next() * Math.max(1, h - 2 * T - 48) });
  }

  const wood = r.chance(0.55);
  const M = 44;
  const drawSeed = seed ^ 0x9e3779b9;

  acc.under.push({
    x: x - M,
    y: y - M,
    w: w + 2 * M,
    h: h + 2 * M,
    draw: (ctx) => {
      const d = mulberry32(drawSeed);
      const ix = x + T / 2;
      const iy = y + T / 2;
      const iw = w - T;
      const ih = h - T;
      // пол
      if (kind === 'damaged') {
        ctx.fillStyle = wood ? '#4a3b2c' : '#5a5a58';
        ctx.fillRect(ix, iy, iw, ih);
        ctx.lineWidth = 1;
        if (wood) {
          for (let px = ix + 14; px < ix + iw; px += 14) {
            ctx.fillStyle = `rgba(${d.chance(0.5) ? '0,0,0' : '255,255,255'},${d.range(0.02, 0.1)})`;
            ctx.fillRect(px - 14, iy, 14, ih);
            ctx.strokeStyle = 'rgba(0,0,0,0.28)';
            ctx.beginPath();
            ctx.moveTo(px, iy);
            ctx.lineTo(px, iy + ih);
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          for (let px = ix; px < ix + iw; px += 22) {
            ctx.moveTo(px, iy);
            ctx.lineTo(px, iy + ih);
          }
          for (let py = iy; py < iy + ih; py += 22) {
            ctx.moveTo(ix, py);
            ctx.lineTo(ix + iw, py);
          }
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#4a463f';
        ctx.fillRect(ix, iy, iw, ih);
        for (let k = 0; k < 24; k++) {
          ctx.fillStyle = d.chance(0.5) ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)';
          ctx.beginPath();
          ctx.ellipse(d.range(ix, ix + iw), d.range(iy, iy + ih), d.range(10, 34), d.range(8, 24), d.range(0, 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // пятна, лужи, земля с травой
      for (let k = 0; k < 10; k++) {
        ctx.fillStyle = `rgba(0,0,0,${d.range(0.08, 0.2)})`;
        ctx.beginPath();
        ctx.ellipse(d.range(ix, ix + iw), d.range(iy, iy + ih), d.range(8, 26), d.range(6, 18), d.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = 'rgba(50,70,80,0.35)';
        ctx.beginPath();
        ctx.ellipse(d.range(ix + 20, ix + iw - 20), d.range(iy + 20, iy + ih - 20), d.range(12, 28), d.range(8, 18), d.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      const soil = kind === 'ruined' ? 16 : 6;
      for (let k = 0; k < soil; k++) {
        const sx = d.range(ix + 8, ix + iw - 8);
        const sy = d.range(iy + 8, iy + ih - 8);
        ctx.fillStyle = d.pick(['rgba(62,86,42,0.6)', 'rgba(52,72,36,0.6)', 'rgba(75,66,44,0.55)']);
        ctx.beginPath();
        ctx.ellipse(sx, sy, d.range(10, 30), d.range(8, 20), d.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
        for (let g = 0; g < 4; g++) drawGrass(ctx, d, sx + d.range(-16, 16), sy + d.range(-10, 10), 1.2);
      }
      // обломки быта: матрасы, доски, бумаги, стекло
      const stuff = kind === 'damaged' ? d.int(3, 6) : d.int(1, 3);
      for (let k = 0; k < stuff; k++) {
        const sx = d.range(ix + 30, ix + iw - 30);
        const sy = d.range(iy + 30, iy + ih - 30);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(d.range(0, Math.PI));
        const t = d.int(0, 2);
        if (t === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(-18, -11, 40, 26);
          ctx.fillStyle = d.pick(['#6d6a5a', '#5a6068', '#6a5a52']);
          ctx.fillRect(-20, -14, 40, 26);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.strokeRect(-20, -14, 40, 26);
          ctx.fillStyle = 'rgba(70,45,30,0.4)';
          ctx.beginPath();
          ctx.ellipse(4, 0, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === 1) {
          ctx.fillStyle = '#5a4430';
          ctx.fillRect(-22, -2.5, 44, 5);
          ctx.fillStyle = '#4a3624';
          ctx.fillRect(-10, 6, 30, 4);
        } else {
          ctx.fillStyle = 'rgba(200,195,175,0.7)';
          for (let p = 0; p < 4; p++) ctx.fillRect(d.range(-10, 10), d.range(-8, 8), 7, 5);
          ctx.fillStyle = 'rgba(170,200,210,0.55)';
          for (let p = 0; p < 6; p++) {
            ctx.beginPath();
            const gx = d.range(-12, 12);
            const gy = d.range(-10, 10);
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + 3, gy + 1);
            ctx.lineTo(gx + 1, gy + 3);
            ctx.fill();
          }
        }
        ctx.restore();
      }
      // тени стен
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      for (const s of segs) ctx.fillRect(s.rect.x + 5, s.rect.y + 7, s.rect.w, s.rect.h);
      // стены
      for (const s of segs) drawWallRect(ctx, d, s.rect, style);
      for (const s of segs) {
        const len = s.side.len;
        if (s.a > 0.5) drawJaggedEnd(ctx, d, s, false, style);
        if (s.b < len - 0.5) drawJaggedEnd(ctx, d, s, true, style);
      }
      // обломки у проломов и по периметру
      const rubbleN = kind === 'ruined' ? 70 : 30;
      for (let k = 0; k < rubbleN; k++) {
        const s = segs[d.int(0, segs.length - 1)];
        const near = d.chance(0.6);
        const px = near ? s.rect.x + d.range(-16, s.rect.w + 16) : d.range(x - 10, x + w + 10);
        const py = near ? s.rect.y + d.range(-16, s.rect.h + 16) : d.range(y - 10, y + h + 10);
        if (d.chance(0.35)) drawBrick(ctx, d, px, py);
        else drawChunk(ctx, d, px, py, d.range(2.5, 7));
      }
      // кучи обломков
      for (const hp of heaps) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(hp.x + 3, hp.y + 4, hp.s * 1.05, hp.s * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k < 16; k++) {
          const a = d.range(0, Math.PI * 2);
          const dd = d.range(0, hp.s * 0.7);
          if (d.chance(0.3)) drawBrick(ctx, d, hp.x + Math.cos(a) * dd, hp.y + Math.sin(a) * dd);
          else drawChunk(ctx, d, hp.x + Math.cos(a) * dd, hp.y + Math.sin(a) * dd, d.range(6, 12));
        }
        // торчащая арматура
        ctx.strokeStyle = '#4a2f22';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const a = d.range(0, Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(hp.x, hp.y);
          ctx.lineTo(hp.x + Math.cos(a) * d.range(10, 18), hp.y + Math.sin(a) * d.range(10, 18));
          ctx.stroke();
        }
        // трава на кучах
        for (let k = 0; k < 5; k++) drawGrass(ctx, d, hp.x + d.range(-hp.s, hp.s) * 0.8, hp.y + d.range(-hp.s, hp.s) * 0.8, 1.3);
      }
      // лозы и плющ по стенам
      const dense = kind === 'damaged' ? 1 : 0.6;
      for (const s of segs) {
        const rc = s.rect;
        const length = Math.max(rc.w, rc.h);
        leafPatch(ctx, d, rc, Math.floor(length * 0.5 * dense));
        const nV = Math.floor((length / 20) * dense) + 1;
        for (let k = 0; k < nV; k++) {
          const horiz = rc.w >= rc.h;
          const cx = horiz ? rc.x + d.range(0, rc.w) : rc.x + rc.w / 2;
          const cy = horiz ? rc.y + rc.h / 2 : rc.y + d.range(0, rc.h);
          let ang: number;
          if (d.chance(0.7)) {
            ang = (horiz ? (d.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : d.chance(0.5) ? 0 : Math.PI) + d.range(-0.7, 0.7);
          } else {
            ang = (horiz ? 0 : Math.PI / 2) + (d.chance(0.5) ? 0 : Math.PI) + d.range(-0.4, 0.4);
          }
          drawVine(ctx, d, cx, cy, ang, d.range(22, 80), 1.1);
        }
        // вьюнок на сломанных краях
        const len = s.side.len;
        if (s.a > 0.5 || s.b < len - 0.5) {
          const ex = s.side.horiz ? s.side.ox + (s.b < len - 0.5 ? s.b : s.a) : s.side.ox + T / 2;
          const ey = s.side.horiz ? s.side.oy + T / 2 : s.side.oy + (s.b < len - 0.5 ? s.b : s.a);
          const dirA = s.side.horiz ? (s.b < len - 0.5 ? 0 : Math.PI) : s.b < len - 0.5 ? Math.PI / 2 : -Math.PI / 2;
          drawVine(ctx, d, ex, ey, dirA + d.range(-0.6, 0.6), d.range(18, 45), 1.1);
        }
      }
    },
  });

  // кусты и трава вокруг и внутри
  acc.over.push({
    x: x - M,
    y: y - M,
    w: w + 2 * M,
    h: h + 2 * M,
    draw: (ctx) => {
      const d = mulberry32(seed ^ 0xabcdef);
      const count = kind === 'ruined' ? 11 : 7;
      for (let k = 0; k < count; k++) {
        let px: number;
        let py: number;
        const q = d.int(0, kind === 'ruined' ? 4 : 3);
        if (q === 0) {
          px = d.range(x - 6, x + w + 6);
          py = y - d.range(2, 12);
        } else if (q === 1) {
          px = d.range(x - 6, x + w + 6);
          py = y + h + d.range(2, 12);
        } else if (q === 2) {
          px = x - d.range(2, 12);
          py = d.range(y, y + h);
        } else if (q === 3) {
          px = x + w + d.range(2, 12);
          py = d.range(y, y + h);
        } else {
          px = d.range(x + T + 10, x + w - T - 10);
          py = d.range(y + T + 10, y + h - T - 10);
        }
        drawBush(ctx, d, px, py, d.range(9, 17));
      }
      for (let k = 0; k < 24; k++) drawGrass(ctx, d, d.range(x - 20, x + w + 20), d.range(y - 20, y + h + 20), 1.3);
      if (tree) {
        ctx.fillStyle = '#3a2c20';
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#54402e';
        ctx.beginPath();
        ctx.arc(tree.x - 1.5, tree.y - 1.5, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  });

  let roof: { canvas: HTMLCanvasElement; x: number; y: number } | null = null;
  if (kind === 'damaged') roof = makeRoof(rect, seed ^ 0x7777);

  acc.buildings.push({
    id,
    rect,
    kind,
    roof: roof ? roof.canvas : null,
    roofX: roof ? roof.x : 0,
    roofY: roof ? roof.y : 0,
    alpha: 1,
  });
}

/* ------------------------------------------------------------------ */
/* Спрайты                                                             */
/* ------------------------------------------------------------------ */
function makeTreeSprites(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  for (let v = 0; v < 3; v++) {
    const c = document.createElement('canvas');
    c.width = 170;
    c.height = 170;
    const ctx = c.getContext('2d')!;
    const r = mulberry32(900 + v * 31);
    const cx = 85;
    const cy = 85;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 14, 62, 54, 0, 0, Math.PI * 2);
    ctx.fill();
    const palette = v === 2 ? ['#5a5a2a', '#6e6a30', '#4a4a26', '#7a6c34'] : GREENS;
    for (let i = 0; i < 26; i++) {
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0, 42);
      ctx.fillStyle = r.pick(palette);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r.range(14, 26), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 20; i++) {
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0, 36);
      ctx.fillStyle = v === 2 ? '#a08c46' : r.pick(LIGHT_GREENS);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d - 6, cy + Math.sin(a) * d - 6, r.range(5, 11), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ветки просвечивают
    ctx.strokeStyle = 'rgba(40,28,18,0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = r.range(0, Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
      ctx.stroke();
    }
    out.push(c);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Лагерь торговца                                                     */
/* ------------------------------------------------------------------ */
function buildCamp(acc: Acc) {
  const C = CENTER;
  const col = (x: number, y: number, w: number, h: number, type: ColliderType = 'prop') => acc.colliders.push({ x, y, w, h, type });
  // задняя и боковые стенки лавки, прилавок
  col(C.x - 88, C.y - 68, 176, 8);
  col(C.x - 90, C.y - 68, 8, 98);
  col(C.x + 82, C.y - 68, 8, 98);
  col(C.x - 70, C.y + 6, 140, 22);
  // ящики, бочки, мешки с песком
  col(C.x + 98, C.y + 26, 36, 36);
  col(C.x + 138, C.y + 38, 30, 30);
  col(C.x - 140, C.y + 34, 26, 26);
  col(C.x - 112, C.y + 56, 22, 22);
  col(C.x - 178, C.y - 26, 56, 22);
  col(C.x + 122, C.y - 36, 56, 22);

  acc.under.push({
    x: C.x - SAFE_RADIUS - 30,
    y: C.y - SAFE_RADIUS - 30,
    w: SAFE_RADIUS * 2 + 60,
    h: SAFE_RADIUS * 2 + 60,
    draw: (ctx) => {
      const d = mulberry32(777);
      const g = ctx.createRadialGradient(C.x, C.y, 20, C.x, C.y, SAFE_RADIUS);
      g.addColorStop(0, 'rgba(96,80,56,0.95)');
      g.addColorStop(0.75, 'rgba(86,72,50,0.85)');
      g.addColorStop(1, 'rgba(86,72,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(C.x, C.y, SAFE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 90; i++) {
        const a = d.range(0, Math.PI * 2);
        const dd = d.range(10, SAFE_RADIUS - 10);
        ctx.fillStyle = d.chance(0.5) ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.ellipse(C.x + Math.cos(a) * dd, C.y + Math.sin(a) * dd, d.range(2, 8), d.range(1.5, 5), d.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
      // граница лагеря — выцветшая сигнальная лента
      ctx.setLineDash([12, 16]);
      ctx.strokeStyle = 'rgba(190,165,70,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(C.x, C.y, SAFE_RADIUS - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // пол лавки
      ctx.fillStyle = '#3f3426';
      ctx.fillRect(C.x - 82, C.y - 62, 164, 92);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      for (let px = C.x - 82; px < C.x + 82; px += 12) {
        ctx.moveTo(px, C.y - 62);
        ctx.lineTo(px, C.y + 30);
      }
      ctx.stroke();
      // тени
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(C.x - 82, C.y - 60, 164, 10);
      // стенки из профнастила
      for (const [rx, ry, rw, rh] of [
        [C.x - 88, C.y - 68, 176, 8],
        [C.x - 90, C.y - 68, 8, 98],
        [C.x + 82, C.y - 68, 8, 98],
      ]) {
        ctx.fillStyle = '#5d625f';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        if (rw > rh) for (let px = rx; px < rx + rw; px += 6) { ctx.moveTo(px, ry); ctx.lineTo(px, ry + rh); }
        else for (let py = ry; py < ry + rh; py += 6) { ctx.moveTo(rx, py); ctx.lineTo(rx + rw, py); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(140,70,35,0.35)';
        for (let k = 0; k < 6; k++) ctx.fillRect(rx + d.range(0, rw - 4), ry + d.range(0, rh - 3), 4, 3);
      }
      // полка с товаром
      ctx.fillStyle = '#4b3a28';
      ctx.fillRect(C.x - 78, C.y - 58, 156, 12);
      const itemCols = ['#6b6a3a', '#7a3a30', '#5a5f4a', '#8a7a4a', '#3f4a58'];
      for (let px = C.x - 76; px < C.x + 74; px += 9) {
        ctx.fillStyle = d.pick(itemCols);
        ctx.fillRect(px, C.y - 56, 7, 8);
      }
      // прилавок
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(C.x - 66, C.y + 12, 140, 22);
      ctx.fillStyle = '#6a5238';
      ctx.fillRect(C.x - 70, C.y + 6, 140, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(C.x - 70, C.y + 6, 140, 3);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(C.x - 69.5, C.y + 6.5, 139, 21);
      // товары на прилавке: коробки патронов, консервы, ружьё
      ctx.fillStyle = '#5a6040';
      ctx.fillRect(C.x - 56, C.y + 11, 14, 9);
      ctx.fillRect(C.x - 38, C.y + 13, 14, 9);
      ctx.fillStyle = '#b8a060';
      ctx.fillRect(C.x - 54, C.y + 13, 10, 2);
      ctx.fillStyle = '#7a7a72';
      ctx.beginPath();
      ctx.arc(C.x + 28, C.y + 16, 3.5, 0, Math.PI * 2);
      ctx.arc(C.x + 38, C.y + 20, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a2a2c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(C.x + 4, C.y + 22);
      ctx.lineTo(C.x + 22, C.y + 11);
      ctx.stroke();
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(C.x + 4, C.y + 22);
      ctx.lineTo(C.x - 6, C.y + 25);
      ctx.stroke();
      // ящики
      for (const [bx, by, bs] of [
        [C.x + 98, C.y + 26, 36],
        [C.x + 138, C.y + 38, 30],
      ]) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(bx + 4, by + 5, bs, bs);
        ctx.fillStyle = '#6b5436';
        ctx.fillRect(bx, by, bs, bs);
        ctx.strokeStyle = '#3c2e1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, bs - 2, bs - 2);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + bs, by + bs);
        ctx.moveTo(bx + bs, by);
        ctx.lineTo(bx, by + bs);
        ctx.stroke();
      }
      // бочки
      for (const [bx, by, bs] of [
        [C.x - 140, C.y + 34, 26],
        [C.x - 112, C.y + 56, 22],
      ]) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(bx + bs / 2 + 3, by + bs / 2 + 4, bs / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bs > 24 ? '#3d4a52' : '#6a3d2a';
        ctx.beginPath();
        ctx.arc(bx + bs / 2, by + bs / 2, bs / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // мешки с песком
      for (const [sx, sy] of [
        [C.x - 178, C.y - 26],
        [C.x + 122, C.y - 36],
      ]) {
        for (let row = 0; row < 2; row++) {
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(sx + k * 14 + 7 + 2, sy + row * 11 + 6 + 3, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = d.pick(['#8a7c58', '#7a6d4c', '#948660']);
            ctx.beginPath();
            ctx.ellipse(sx + k * 14 + 7, sy + row * 11 + 6, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      // ковёр перед прилавком
      ctx.fillStyle = 'rgba(90,50,40,0.75)';
      ctx.fillRect(C.x - 50, C.y + 40, 100, 34);
      ctx.strokeStyle = 'rgba(180,150,90,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(C.x - 46, C.y + 44, 92, 26);
    },
  });
}

function makeAwning(): { canvas: HTMLCanvasElement; x: number; y: number } {
  const C = CENTER;
  const w = 196;
  const h = 112;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const r = mulberry32(4242);
  // тень
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(8, 8, w - 8, h - 14);
  // полосы тента
  const sw = 14;
  for (let i = 0; i * sw < w - 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#7a2e28' : '#b0a68a';
    ctx.fillRect(4 + i * sw, 2, sw, h - 20);
  }
  // потёртости
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r.chance(0.5) ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.07)';
    ctx.fillRect(r.range(4, w - 20), r.range(2, h - 22), r.range(6, 20), r.range(3, 12));
  }
  // дыры
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(r.range(20, w - 30), r.range(10, h - 40), r.range(5, 9), r.range(3, 6), r.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // фестон
  for (let i = 0; i * sw < w - 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#7a2e28' : '#b0a68a';
    ctx.beginPath();
    ctx.arc(4 + i * sw + sw / 2, h - 18, sw / 2, 0, Math.PI);
    ctx.fill();
  }
  // табличка
  ctx.fillStyle = '#2a211a';
  ctx.fillRect(w / 2 - 54, h - 44, 108, 22);
  ctx.strokeStyle = '#8a7a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(w / 2 - 53, h - 43, 106, 20);
  ctx.fillStyle = '#d8cfae';
  ctx.font = 'bold 14px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ТОРГОВЕЦ', w / 2, h - 33);
  // лоза на тенте
  drawVine(ctx, r, 6, 6, 0.6, 50, 1.1);
  drawVine(ctx, r, w - 8, 8, 2.4, 40, 1.1);
  return { canvas, x: C.x - w / 2, y: C.y - 76 };
}

/* ------------------------------------------------------------------ */
/* Запекание клетки                                                    */
/* ------------------------------------------------------------------ */
function intersects(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function bakeCell(ci: number, cj: number, under: Drawable[], over: Drawable[], seed: number): Cell {
  const canvas = document.createElement('canvas');
  canvas.width = CELL;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d')!;
  const r = mulberry32(seed + ci * 7919 + cj * 104729);
  const ox = ci * CELL;
  const oy = cj * CELL;
  const lotW = LOT_MAX - LOT_MIN;

  // асфальт
  ctx.fillStyle = '#34363a';
  ctx.fillRect(0, 0, CELL, CELL);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = r.chance(0.6) ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.035)';
    ctx.fillRect(r.range(0, CELL), r.range(0, CELL), r.range(1, 4), r.range(1, 4));
  }
  // заплатки и пятна
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(r.range(0, CELL), r.range(0, CELL), r.range(20, 60), r.range(14, 40));
  }
  // тротуар и участок
  ctx.fillStyle = '#74746c';
  ctx.fillRect(LOT_MIN - SIDEWALK, LOT_MIN - SIDEWALK, lotW + SIDEWALK * 2, lotW + SIDEWALK * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let p = LOT_MIN - SIDEWALK; p <= LOT_MAX + SIDEWALK; p += 24) {
    ctx.moveTo(p, LOT_MIN - SIDEWALK);
    ctx.lineTo(p, LOT_MIN);
    ctx.moveTo(p, LOT_MAX);
    ctx.lineTo(p, LOT_MAX + SIDEWALK);
    ctx.moveTo(LOT_MIN - SIDEWALK, p);
    ctx.lineTo(LOT_MIN, p);
    ctx.moveTo(LOT_MAX, p);
    ctx.lineTo(LOT_MAX + SIDEWALK, p);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(LOT_MIN - SIDEWALK + 0.5, LOT_MIN - SIDEWALK + 0.5, lotW + SIDEWALK * 2 - 1, lotW + SIDEWALK * 2 - 1);
  ctx.fillStyle = '#434d33';
  ctx.fillRect(LOT_MIN, LOT_MIN, lotW, lotW);
  // пятна земли и травы на участке
  ctx.save();
  ctx.beginPath();
  ctx.rect(LOT_MIN, LOT_MIN, lotW, lotW);
  ctx.clip();
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = r.pick(['rgba(70,92,44,0.35)', 'rgba(56,76,38,0.4)', 'rgba(90,80,50,0.35)', 'rgba(60,64,40,0.4)', 'rgba(80,100,52,0.25)']);
    ctx.beginPath();
    ctx.ellipse(r.range(LOT_MIN, LOT_MAX), r.range(LOT_MIN, LOT_MAX), r.range(18, 60), r.range(14, 44), r.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 320; i++) drawGrass(ctx, r, r.range(LOT_MIN, LOT_MAX), r.range(LOT_MIN, LOT_MAX), 1.1);
  ctx.restore();

  // разметка
  ctx.setLineDash([26, 22]);
  ctx.strokeStyle = 'rgba(168,147,58,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const px of [0, CELL]) {
    ctx.moveTo(px, LOT_MIN - SIDEWALK);
    ctx.lineTo(px, LOT_MAX + SIDEWALK);
  }
  for (const py of [0, CELL]) {
    ctx.moveTo(LOT_MIN - SIDEWALK, py);
    ctx.lineTo(LOT_MAX + SIDEWALK, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // трещины, выбоины, лужи
  for (let i = 0; i < 16; i++) {
    const rx = r.range(0, CELL);
    const ry = r.range(0, CELL);
    const inLot = rx > LOT_MIN - SIDEWALK && rx < LOT_MAX + SIDEWALK && ry > LOT_MIN - SIDEWALK && ry < LOT_MAX + SIDEWALK;
    if (inLot) continue;
    drawCrack(ctx, r, rx, ry, r.range(30, 90), 0.55);
    // трава пробивается сквозь трещины
    for (let g = 0; g < 4; g++) drawGrass(ctx, r, rx + r.range(-14, 14), ry + r.range(-14, 14), 1.1);
  }
  for (let i = 0; i < 5; i++) {
    const px = r.range(0, CELL);
    const py = r.range(0, CELL);
    const inLot = px > LOT_MIN - SIDEWALK && px < LOT_MAX + SIDEWALK && py > LOT_MIN - SIDEWALK && py < LOT_MAX + SIDEWALK;
    if (inLot) continue;
    if (r.chance(0.5)) {
      ctx.fillStyle = '#16181a';
      ctx.beginPath();
      ctx.ellipse(px, py, r.range(8, 18), r.range(6, 12), r.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(48,64,72,0.7)';
      ctx.beginPath();
      ctx.ellipse(px, py, r.range(14, 34), r.range(8, 18), r.range(0, 3), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,170,180,0.14)';
      ctx.beginPath();
      ctx.ellipse(px - 3, py - 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // сорняки вдоль бордюра и на тротуаре
  for (let i = 0; i < 90; i++) {
    const side = r.int(0, 3);
    const t = r.range(LOT_MIN - SIDEWALK, LOT_MAX + SIDEWALK);
    const off = r.range(-14, SIDEWALK + 4);
    let px = 0;
    let py = 0;
    if (side === 0) { px = t; py = LOT_MIN - SIDEWALK + off; }
    else if (side === 1) { px = t; py = LOT_MAX + SIDEWALK - off; }
    else if (side === 2) { px = LOT_MIN - SIDEWALK + off; py = t; }
    else { px = LOT_MAX + SIDEWALK - off; py = t; }
    drawGrass(ctx, r, px, py, 1.2);
  }
  // мусор
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = r.pick(['rgba(190,185,165,0.5)', 'rgba(90,100,110,0.5)', 'rgba(120,80,50,0.5)']);
    ctx.fillRect(r.range(0, CELL), r.range(0, CELL), r.range(2, 5), r.range(2, 4));
  }

  // объекты (дома, машины, лагерь)
  ctx.save();
  ctx.translate(-ox, -oy);
  const cellRect: Rect = { x: ox, y: oy, w: CELL, h: CELL };
  for (const dr of under) {
    if (!intersects(cellRect, dr)) continue;
    ctx.save();
    dr.draw(ctx);
    ctx.restore();
  }
  // одичавшие кусты на участках
  const rb = mulberry32(seed + ci * 31 + cj * 17 + 5);
  for (let i = 0; i < 14; i++) {
    const bx = ox + rb.range(LOT_MIN, LOT_MAX);
    const by = oy + rb.range(LOT_MIN, LOT_MAX);
    if (Math.hypot(bx - CENTER.x, by - CENTER.y) < SAFE_RADIUS + 20) continue;
    drawBush(ctx, rb, bx, by, rb.range(8, 15));
  }
  for (const dr of over) {
    if (!intersects(cellRect, dr)) continue;
    ctx.save();
    dr.draw(ctx);
    ctx.restore();
  }
  ctx.restore();

  // граница мира
  ctx.fillStyle = '#1d1f1d';
  const E = 16;
  if (ci === 0) ctx.fillRect(0, 0, E, CELL);
  if (cj === 0) ctx.fillRect(0, 0, CELL, E);
  if (ci === GRID - 1) ctx.fillRect(CELL - E, 0, E, CELL);
  if (cj === GRID - 1) ctx.fillRect(0, CELL - E, CELL, E);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  if (ci === 0) ctx.fillRect(E, 0, 2, CELL);
  if (cj === 0) ctx.fillRect(0, E, CELL, 2);
  if (ci === GRID - 1) ctx.fillRect(CELL - E - 2, 0, 2, CELL);
  if (cj === GRID - 1) ctx.fillRect(0, CELL - E - 2, CELL, 2);

  return { canvas, ctx };
}

/* ------------------------------------------------------------------ */
/* Генерация мира                                                      */
/* ------------------------------------------------------------------ */
function rectDistToCenter(rc: Rect): number {
  const nx = Math.max(rc.x, Math.min(CENTER.x, rc.x + rc.w));
  const ny = Math.max(rc.y, Math.min(CENTER.y, rc.y + rc.h));
  return Math.hypot(nx - CENTER.x, ny - CENTER.y);
}

/* ------------------------------------------------------------------ */
/* Генерация: ядро (днём) + внешнее кольцо (ночью — заново)            */
/* ------------------------------------------------------------------ */
const CORE_FROM = 1;
const CORE_TO = 4;
const CORE_RECT: Rect = { x: CORE_FROM * CELL, y: CORE_FROM * CELL, w: (CORE_TO - CORE_FROM + 1) * CELL, h: (CORE_TO - CORE_FROM + 1) * CELL };
export const isCoreCell = (ci: number, cj: number) => ci >= CORE_FROM && ci <= CORE_TO && cj >= CORE_FROM && cj <= CORE_TO;
export const inCoreRect = (x: number, y: number) => x >= CORE_RECT.x && y >= CORE_RECT.y && x <= CORE_RECT.x + CORE_RECT.w && y <= CORE_RECT.y + CORE_RECT.h;

type Theme = 'normal' | 'dense' | 'park' | 'lot' | 'ruins' | 'empty';
const THEME_NAMES: Record<Theme, string> = {
  normal: 'жилой квартал',
  dense: 'плотная застройка',
  park: 'заросший парк',
  lot: 'парковка',
  ruins: 'руины',
  empty: 'пустырь',
};
export { THEME_NAMES };

interface Geo extends Acc {
  props: Rect[];
}

function genLayerGeometry(seed: number, ring: boolean, sharedProps: Rect[], idStart: number): Geo {
  const r = mulberry32(seed);
  const acc: Acc = { colliders: [], under: [], over: [], trees: [], loot: [], buildings: [] };
  if (!ring) buildCamp(acc);
  const own = (ci: number, cj: number) => isCoreCell(ci, cj) !== ring;
  const dens = ring ? r.range(0.8, 1.5) : 1;

  let bid = idStart;
  const buildingRects: Rect[] = [];
  const themes: Theme[][] = [];
  for (let cj = 0; cj < GRID; cj++) {
    themes[cj] = [];
    for (let ci = 0; ci < GRID; ci++) {
      themes[cj][ci] = 'normal';
      if (!own(ci, cj)) continue;
      const theme: Theme = ring ? r.pick<Theme>(['normal', 'normal', 'dense', 'dense', 'park', 'lot', 'ruins', 'ruins', 'empty']) : 'normal';
      themes[cj][ci] = theme;
      const lx = ci * CELL + LOT_MIN;
      const ly = cj * CELL + LOT_MIN;
      const L = LOT_MAX - LOT_MIN;
      const rects: Rect[] = [];
      const roll = theme === 'dense' ? 0.6 : theme === 'park' || theme === 'lot' || theme === 'empty' ? 2 : r.next();
      if (roll < 0.5) {
        const w = r.range(230, 350);
        const h = r.range(210, 340);
        rects.push({ x: lx + r.range(14, L - w - 14), y: ly + r.range(14, L - h - 14), w, h });
      } else if (roll < 0.86) {
        const half = L / 2;
        if (r.chance(0.5)) {
          for (let k = 0; k < 2; k++) {
            const h = r.range(170, 310);
            rects.push({ x: lx + k * half + 13, y: ly + r.range(13, L - h - 13), w: half - 26, h });
          }
        } else {
          for (let k = 0; k < 2; k++) {
            const w = r.range(170, 310);
            rects.push({ x: lx + r.range(13, L - w - 13), y: ly + k * half + 13, w, h: half - 26 });
          }
        }
      }
      for (const rc of rects) {
        if (rectDistToCenter(rc) < SAFE_RADIUS + 50) continue;
        rc.x = Math.round(rc.x);
        rc.y = Math.round(rc.y);
        rc.w = Math.round(rc.w);
        rc.h = Math.round(rc.h);
        const kind = theme === 'ruins' ? 'ruined' : r.chance(0.42) ? 'ruined' : 'damaged';
        createBuilding(bid++, rc, kind, seed * 1000 + bid * 97, acc);
        buildingRects.push(rc);
      }
    }
  }

  // деревья на участках
  const trees = acc.trees;
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      if (!own(ci, cj)) continue;
      const th = themes[cj][ci];
      const n = th === 'park' ? r.int(5, 8) : th === 'empty' ? r.int(0, 1) : th === 'lot' ? 0 : r.int(1, 3);
      for (let k = 0; k < n; k++) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const tx = ci * CELL + r.range(LOT_MIN + 20, LOT_MAX - 20);
          const ty = cj * CELL + r.range(LOT_MIN + 20, LOT_MAX - 20);
          if (Math.hypot(tx - CENTER.x, ty - CENTER.y) < SAFE_RADIUS + 40) continue;
          if (buildingRects.some((b) => tx > b.x - 36 && tx < b.x + b.w + 36 && ty > b.y - 36 && ty < b.y + b.h + 36)) continue;
          if (trees.some((t) => Math.hypot(t.x - tx, t.y - ty) < 60)) continue;
          trees.push({ x: tx, y: ty, s: r.range(0.8, 1.3), v: r.int(0, 2) });
          acc.colliders.push({ x: tx - 7, y: ty - 7, w: 14, h: 14, type: 'tree' });
          break;
        }
      }
    }
  }

  // брошенные машины и баррикады
  const props = sharedProps;
  const keepOK = (rc: Rect) => {
    if (!ring) return inCoreRect(rc.x + rc.w / 2, rc.y + rc.h / 2);
    const cc = { x: CORE_RECT.x - 28, y: CORE_RECT.y - 28, w: CORE_RECT.w + 56, h: CORE_RECT.h + 56 };
    return !intersects(cc, rc);
  };
  const placeOK = (rc: Rect) => {
    if (!keepOK(rc)) return false;
    if (rectDistToCenter(rc) < SAFE_RADIUS + 70) return false;
    if (rc.x < 40 || rc.y < 40 || rc.x + rc.w > WORLD - 40 || rc.y + rc.h > WORLD - 40) return false;
    if (acc.colliders.some((c) => c.type !== 'tree' && intersects({ x: c.x - 8, y: c.y - 8, w: c.w + 16, h: c.h + 16 }, rc))) return false;
    return !props.some((p) => intersects({ x: p.x - 14, y: p.y - 14, w: p.w + 28, h: p.h + 28 }, rc));
  };
  const carRects: Rect[] = [];
  const addCar = (rc: Rect, horizontal: boolean, flip: boolean, cs: number) => {
    props.push(rc);
    carRects.push(rc);
    acc.colliders.push({ ...rc, type: 'car' });
    acc.under.push({
      ...rc,
      x: rc.x - 20,
      y: rc.y - 20,
      w: rc.w + 40,
      h: rc.h + 40,
      draw: (ctx) => {
        const d = mulberry32(cs);
        ctx.translate(rc.x + rc.w / 2, rc.y + rc.h / 2);
        if (!horizontal) ctx.rotate(Math.PI / 2);
        if (flip) ctx.scale(-1, 1);
        drawCarShape(ctx, d);
        for (let i = 0; i < 4; i++) drawVine(ctx, d, d.range(-35, 35), d.range(-14, 14), d.range(0, Math.PI * 2), d.range(18, 44), 1.1);
        drawBush(ctx, d, d.range(-20, 20), d.range(-8, 8), d.range(5, 8));
      },
    });
  };
  const kMax = ring ? Math.round(9 * dens * 1.5) : 9;
  for (let line = 1; line < GRID; line++) {
    for (let k = 0; k < kMax; k++) {
      for (const horizontal of [true, false]) {
        if (!r.chance(0.7)) continue;
        const along = r.range(80, WORLD - 80);
        const lane = (r.chance(0.5) ? 1 : -1) * r.range(30, 36);
        const cx = horizontal ? along : line * CELL + lane;
        const cy = horizontal ? line * CELL + lane : along;
        const rc: Rect = horizontal
          ? { x: cx - CAR_W / 2, y: cy - CAR_H / 2, w: CAR_W, h: CAR_H }
          : { x: cx - CAR_H / 2, y: cy - CAR_W / 2, w: CAR_H, h: CAR_W };
        const flip = r.chance(0.5);
        if (!placeOK(rc)) continue;
        addCar(rc, horizontal, flip, seed + props.length * 13);
      }
    }
  }
  // парковки: ряды машин на участках
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      if (!own(ci, cj) || themes[cj][ci] !== 'lot') continue;
      const lx = ci * CELL + LOT_MIN + 40;
      const ly = cj * CELL + LOT_MIN + 40;
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          if (r.chance(0.35)) continue;
          const horizontal = r.chance(0.2);
          const rc: Rect = horizontal
            ? { x: lx + col * 84 + r.range(-4, 4), y: ly + row * 96 + r.range(-4, 4), w: CAR_W, h: CAR_H }
            : { x: lx + col * 84 + r.range(-4, 4), y: ly + row * 96 + r.range(-4, 4), w: CAR_H, h: CAR_W };
          const flip = r.chance(0.5);
          if (!placeOK(rc)) continue;
          addCar(rc, horizontal, flip, seed + props.length * 13 + 5);
        }
      }
    }
  }
  // бетонные блоки / баррикады
  const nBar = Math.round(22 * (ring ? dens * 1.2 : 1));
  for (let i = 0; i < nBar; i++) {
    const horizontalRoad = r.chance(0.5);
    const line = r.int(1, GRID - 1);
    const along = r.range(100, WORLD - 100);
    const across = line * CELL + r.range(-40, 40);
    const w = horizontalRoad ? 22 : 64;
    const h = horizontalRoad ? 64 : 22;
    const rc: Rect = horizontalRoad ? { x: along, y: across - 32, w, h } : { x: across - 32, y: along, w: 64, h: 22 };
    if (!placeOK(rc)) continue;
    props.push(rc);
    acc.colliders.push({ ...rc, type: 'prop' });
    const bs = seed + i * 71;
    acc.under.push({
      x: rc.x - 10,
      y: rc.y - 10,
      w: rc.w + 20,
      h: rc.h + 20,
      draw: (ctx) => {
        const d = mulberry32(bs);
        ctx.translate(rc.x, rc.y);
        drawBarrier(ctx, d, rc.w, rc.h);
        drawVine(ctx, d, rc.w / 2, rc.h / 2, d.range(0, 6.28), 28, 1.1);
        for (let g = 0; g < 3; g++) drawGrass(ctx, d, d.range(-6, rc.w + 6), d.range(-6, rc.h + 6), 1.3);
      },
    });
  }
  // лут у машин
  for (const c of carRects) {
    if (r.chance(ring ? 0.4 : 0.3)) acc.loot.push({ x: c.x + c.w / 2 + (c.w > c.h ? 0 : 36), y: c.y + c.h / 2 + (c.w > c.h ? 36 : 0) });
  }
  // лут на пустырях и в парках
  if (ring) {
    for (let cj = 0; cj < GRID; cj++) {
      for (let ci = 0; ci < GRID; ci++) {
        if (!own(ci, cj)) continue;
        const th = themes[cj][ci];
        const n = th === 'park' ? 2 : th === 'empty' || th === 'lot' ? 2 : 0;
        for (let k = 0; k < n; k++) acc.loot.push({ x: ci * CELL + r.range(LOT_MIN + 30, LOT_MAX - 30), y: cj * CELL + r.range(LOT_MIN + 30, LOT_MAX - 30) });
      }
    }
  }
  return { ...acc, props: carRects };
}

/** Лестницы, люки и лагеря бандитов слоя + точки лута */
function populateLayer(geo: Geo, grid: ColliderGrid, seed: number, ring: boolean): { accesses: Access[]; camps: Camp[]; lootSpots: { x: number; y: number }[] } {
  const accesses: Access[] = [];
  const camps: Camp[] = [];
  const q = mulberry32(seed ^ 0x5bd1e995);
  const used: { x: number; y: number }[] = [];
  const idOff = ring ? 1000 : 0;
  const maxCamps = ring ? 3 + (q.chance(0.5) ? 1 : 0) : 4;
  const pick = (rc: Rect, clear: number, apart: number) => {
    for (let t = 0; t < 40; t++) {
      const x = Math.round(rc.x + 46 + q.next() * Math.max(1, rc.w - 92));
      const y = Math.round(rc.y + 46 + q.next() * Math.max(1, rc.h - 92));
      if (grid.circleBlocked(x, y, clear)) continue;
      if (used.some((u) => Math.hypot(u.x - x, u.y - y) < apart)) continue;
      if (geo.loot.some((l) => Math.hypot(l.x - x, l.y - y) < 90)) continue;
      used.push({ x, y });
      return { x, y };
    }
    return null;
  };
  let aid = idOff;
  for (const b of geo.buildings) {
    const rc = b.rect;
    if (rectDistToCenter(rc) < SAFE_RADIUS + 200) continue;
    if (rc.w < 170 || rc.h < 150) continue;
    if (b.kind === 'damaged' && camps.length < maxCamps && q.chance(ring ? 0.3 : 0.34)) {
      const pt = pick(rc, 44, 120);
      if (pt) {
        camps.push({ id: idOff + camps.length, buildingId: b.id, x: pt.x, y: pt.y, seed: seed + b.id * 31 });
        continue;
      }
    }
    if (b.kind === 'damaged') {
      if (q.chance(0.62)) {
        const pt = pick(rc, 32, 90);
        if (pt) accesses.push({ id: aid++, buildingId: b.id, kind: 'upper', x: pt.x, y: pt.y, seed: seed + b.id * 17 + 1 });
      }
      if (q.chance(0.55)) {
        const pt = pick(rc, 32, 90);
        if (pt) accesses.push({ id: aid++, buildingId: b.id, kind: 'cellar', x: pt.x, y: pt.y, seed: seed + b.id * 17 + 2 });
      }
    } else if (q.chance(0.35)) {
      const pt = pick(rc, 30, 90);
      if (pt) accesses.push({ id: aid++, buildingId: b.id, kind: 'cellar', x: pt.x, y: pt.y, seed: seed + b.id * 17 + 3 });
    }
  }
  const lootSpots = geo.loot.filter((p) => !grid.circleBlocked(p.x, p.y, 16) && Math.hypot(p.x - CENTER.x, p.y - CENTER.y) > SAFE_RADIUS);
  return { accesses, camps, lootSpots };
}

function bakeMinimap(buildings: Building[], trees: Tree[]): HTMLCanvasElement {
  const mm = document.createElement('canvas');
  mm.width = 150;
  mm.height = 150;
  const mctx = mm.getContext('2d')!;
  const sc = 150 / WORLD;
  mctx.fillStyle = '#2b3224';
  mctx.fillRect(0, 0, 150, 150);
  mctx.fillStyle = '#3c3e41';
  for (let i = 0; i <= GRID; i++) {
    mctx.fillRect(i * CELL * sc - 58 * sc, 0, 116 * sc, 150);
    mctx.fillRect(0, i * CELL * sc - 58 * sc, 150, 116 * sc);
  }
  for (const b of buildings) {
    mctx.fillStyle = b.kind === 'damaged' ? '#8a7b5a' : '#5a4a42';
    mctx.fillRect(b.rect.x * sc, b.rect.y * sc, b.rect.w * sc, b.rect.h * sc);
  }
  for (const t of trees) {
    mctx.fillStyle = '#3f5f2a';
    mctx.fillRect(t.x * sc - 1, t.y * sc - 1, 2, 2);
  }
  return mm;
}

function makeLayer(geo: Geo, pop: ReturnType<typeof populateLayer>): Layer {
  return {
    colliders: geo.colliders,
    buildings: geo.buildings,
    trees: geo.trees,
    accesses: pop.accesses,
    camps: pop.camps,
    lootSpots: pop.lootSpots,
    under: geo.under,
    over: geo.over,
    props: geo.props,
  };
}

function mergeLayers(w: World) {
  w.colliders = [...w.core.colliders, ...w.ring.colliders];
  w.buildings = [...w.core.buildings, ...w.ring.buildings];
  w.trees = [...w.core.trees, ...w.ring.trees];
  w.accesses = [...w.core.accesses, ...w.ring.accesses];
  w.camps = [...w.core.camps, ...w.ring.camps];
  w.lootSpots = [...w.core.lootSpots, ...w.ring.lootSpots];
  w.minimap = bakeMinimap(w.buildings, w.trees);
}

export function generateWorld(seed = 1337, nightSeed = 777): World {
  const shared: Rect[] = [];
  const coreGeo = genLayerGeometry(seed, false, shared, 0);
  const ringGeo = genLayerGeometry(nightSeed, true, shared, 1000);
  const grid = new ColliderGrid([...coreGeo.colliders, ...ringGeo.colliders]);
  const corePop = populateLayer(coreGeo, grid, seed, false);
  const ringPop = populateLayer(ringGeo, grid, nightSeed, true);
  const core = makeLayer(coreGeo, corePop);
  const ring = makeLayer(ringGeo, ringPop);

  const cells: Cell[][] = [];
  for (let cj = 0; cj < GRID; cj++) {
    const row: Cell[] = [];
    for (let ci = 0; ci < GRID; ci++) {
      if (isCoreCell(ci, cj)) row.push(bakeCell(ci, cj, core.under, core.over, seed));
      else row.push(bakeCell(ci, cj, [...core.under, ...ring.under], [...core.over, ...ring.over], nightSeed));
    }
    cells.push(row);
  }

  const world: World = {
    accesses: [],
    camps: [],
    colliders: [],
    grid,
    buildings: [],
    trees: [],
    cells,
    lootSpots: [],
    minimap: document.createElement('canvas'),
    awning: makeAwning(),
    treeSprites: makeTreeSprites(),
    trader: { x: CENTER.x, y: CENTER.y - 20 },
    nightSeed,
    core,
    ring,
  };
  mergeLayers(world);
  return world;
}

/**
 * Новая ночь — внешняя часть города строится заново: другие кварталы, парки,
 * парковки, руины, машины, лагеря, лестницы и люки. Ядро остаётся прежним.
 * Возвращает постройки игрока, которые стояли в кольце (их нужно вернуть в инвентарь).
 */
export function regenerateRing(w: World, nightSeed: number) {
  // убираем старые коллайдеры кольца
  for (const c of w.ring.colliders) w.grid.remove(c);
  w.nightSeed = nightSeed;
  const shared = [...w.core.props];
  const ringGeo = genLayerGeometry(nightSeed, true, shared, 1000);
  for (const c of ringGeo.colliders) w.grid.add(c);
  const ringPop = populateLayer(ringGeo, w.grid, nightSeed, true);
  w.ring = makeLayer(ringGeo, ringPop);
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      if (isCoreCell(ci, cj)) continue;
      w.cells[cj][ci] = bakeCell(ci, cj, [...w.core.under, ...w.ring.under], [...w.core.over, ...w.ring.over], nightSeed);
    }
  }
  mergeLayers(w);
}

/** Название главного «района» кольца для баннера — по доле тем */
export function ringSummary(nightSeed: number): string {
  const r = mulberry32(nightSeed ^ 0x77aa11);
  const picks: Theme[] = ['normal', 'dense', 'park', 'lot', 'ruins', 'empty'];
  return THEME_NAMES[picks[Math.floor(r.next() * picks.length)]];
}
