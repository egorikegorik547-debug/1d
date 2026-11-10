import type { Rng } from './rng';

export type Ctx = CanvasRenderingContext2D;

export const GREENS = ['#2d4a1f', '#38601f', '#44702a', '#567f32', '#3a5a2a', '#4d7a35'];
export const LIGHT_GREENS = ['#6f9a3e', '#7fa84a', '#5f8f3a'];
export const DEAD = ['#7a6a3a', '#8a7440', '#5e5a2e'];

/** Лоза с листьями — растёт по стенам, крышам и машинам */
export function drawVine(ctx: Ctx, r: Rng, x: number, y: number, ang: number, len: number, thick = 1) {
  const step = 5;
  const n = Math.max(2, Math.floor(len / step));
  let px = x;
  let py = y;
  let a = ang;
  let curve = r.range(-0.12, 0.12);
  const pts: { x: number; y: number; a: number }[] = [{ x: px, y: py, a }];
  for (let i = 0; i < n; i++) {
    curve += r.range(-0.06, 0.06);
    curve *= 0.9;
    a += curve + r.range(-0.18, 0.18);
    px += Math.cos(a) * step;
    py += Math.sin(a) * step;
    pts.push({ x: px, y: py, a });
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass === 0 ? 'rgba(18,30,12,0.85)' : '#3b5a25';
    ctx.lineWidth = (pass === 0 ? 2.4 : 1.2) * thick;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  for (let i = 1; i < pts.length; i++) {
    if (!r.chance(0.88)) continue;
    const p = pts[i];
    const side = i % 2 === 0 ? 1 : -1;
    const taper = 1 - (i / pts.length) * 0.35;
    const ls = (r.range(2.6, 4.8) * taper) * thick + 0.4;
    const lx = p.x + Math.cos(p.a + side * 1.4) * ls * 0.9;
    const ly = p.y + Math.sin(p.a + side * 1.4) * ls * 0.9;
    ctx.fillStyle = r.chance(0.1) ? r.pick(DEAD) : r.pick(GREENS);
    ctx.beginPath();
    ctx.ellipse(lx, ly, ls, ls * 0.55, p.a + side * 0.9, 0, Math.PI * 2);
    ctx.fill();
    if (r.chance(0.035)) {
      ctx.fillStyle = r.pick(['#c9c0a0', '#b98a9a', '#d2b45a']);
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawBush(ctx: Ctx, r: Rng, x: number, y: number, size: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 4, size * 1.05, size * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  const n = 5 + r.int(0, 4);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2);
    const d = r.range(0, size * 0.55);
    ctx.fillStyle = r.pick(GREENS.slice(0, 4));
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, size * r.range(0.45, 0.72), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < n + 2; i++) {
    const a = r.range(0, Math.PI * 2);
    const d = r.range(0, size * 0.5);
    ctx.fillStyle = r.pick(LIGHT_GREENS);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d - size * 0.12, y + Math.sin(a) * d - size * 0.12, size * r.range(0.14, 0.26), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (r.chance(0.3)) {
    ctx.fillStyle = r.pick(['#8a3a3a', '#c9b86a', '#b88aa0']);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + r.range(-size * 0.5, size * 0.5), y + r.range(-size * 0.5, size * 0.5), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawGrass(ctx: Ctx, r: Rng, x: number, y: number, s = 1) {
  ctx.lineCap = 'round';
  const n = r.int(4, 7);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2);
    const l = r.range(3, 8) * s;
    ctx.strokeStyle = r.chance(0.2) ? r.pick(DEAD) : r.pick([...GREENS, ...LIGHT_GREENS]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
}

const CHUNK_COLORS = ['#6e6c66', '#5a5853', '#7c7a72', '#4b4a46', '#85827a', '#625c55'];
const BRICK_COLORS = ['#8a4a3a', '#7a3f33', '#9a5a45', '#6d372e'];

export function drawChunk(ctx: Ctx, r: Rng, x: number, y: number, s: number) {
  const n = r.int(5, 7);
  const rot = r.range(0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const d = s * r.range(0.65, 1.1);
    const px = x + 2 + Math.cos(a) * d;
    const py = y + 3 + Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  const col = r.pick(CHUNK_COLORS);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2;
    const d = s * r.range(0.65, 1.1);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.arc(x - s * 0.2, y - s * 0.25, s * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBrick(ctx: Ctx, r: Rng, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r.range(0, Math.PI * 2));
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-5, -2.5, 12, 7);
  ctx.fillStyle = r.pick(BRICK_COLORS);
  ctx.fillRect(-6, -3, 12, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(-6, -3, 12, 1.5);
  ctx.restore();
}

export function drawCrack(ctx: Ctx, r: Rng, x: number, y: number, len: number, alpha = 0.5) {
  ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  let a = r.range(0, Math.PI * 2);
  let px = x;
  let py = y;
  ctx.beginPath();
  ctx.moveTo(px, py);
  const steps = Math.max(2, Math.floor(len / 8));
  for (let i = 0; i < steps; i++) {
    a += r.range(-0.8, 0.8);
    px += Math.cos(a) * 8;
    py += Math.sin(a) * 8;
    ctx.lineTo(px, py);
    if (r.chance(0.2)) {
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a + 1) * 7, py + Math.sin(a + 1) * 7);
      ctx.moveTo(px, py);
    }
  }
  ctx.stroke();
}

export const CAR_W = 92;
export const CAR_H = 44;

const CAR_COLORS = ['#6b5a45', '#4d5a5e', '#7a7a72', '#5e3a35', '#4a5546', '#6a6050'];

/** Ржавый брошенный автомобиль (вид сверху), центр в (0,0), длина вдоль X */
export function drawCarShape(ctx: Ctx, r: Rng) {
  const L = CAR_W;
  const W = CAR_H;
  const body = r.pick(CAR_COLORS);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-L / 2 + 4, -W / 2 + 6, L, W);
  // шины
  ctx.fillStyle = '#18181a';
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      ctx.fillRect(sx * L * 0.3 - 8, sy * (W / 2) - (sy > 0 ? 3 : 1) - 2, 16, 6);
    }
  }
  // кузов
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2 + 2, L, W - 4, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // капот / багажник
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(L * 0.18, -W / 2 + 5, L * 0.3, W - 10);
  ctx.fillRect(-L * 0.46, -W / 2 + 5, L * 0.2, W - 10);
  // салон
  ctx.fillStyle = '#1b2023';
  ctx.beginPath();
  ctx.roundRect(-L * 0.24, -W / 2 + 6, L * 0.44, W - 12, 5);
  ctx.fill();
  // потрескавшееся стекло
  ctx.strokeStyle = 'rgba(200,210,215,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const cx = r.range(L * 0.05, L * 0.18);
  ctx.moveTo(cx, -W / 2 + 6);
  ctx.lineTo(cx - 6, 0);
  ctx.lineTo(cx + 4, W / 2 - 6);
  ctx.moveTo(cx - 6, 0);
  ctx.lineTo(cx - 16, -4);
  ctx.stroke();
  // крыша
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-L * 0.17, -W / 2 + 9, L * 0.3, W - 18, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-L * 0.17, -W / 2 + 9, L * 0.3, 4);
  // ржавчина
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(${r.int(110, 150)},${r.int(60, 80)},${r.int(25, 40)},${r.range(0.35, 0.7)})`;
    ctx.beginPath();
    ctx.ellipse(r.range(-L / 2 + 6, L / 2 - 6), r.range(-W / 2 + 4, W / 2 - 4), r.range(2, 7), r.range(1.5, 4), r.range(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // фары
  ctx.fillStyle = '#8a8672';
  ctx.fillRect(L / 2 - 3, -W / 2 + 6, 3, 5);
  ctx.fillRect(L / 2 - 3, W / 2 - 11, 3, 5);
  ctx.fillStyle = '#5a1a18';
  ctx.fillRect(-L / 2, -W / 2 + 6, 3, 5);
  ctx.fillRect(-L / 2, W / 2 - 11, 3, 5);
}

export function drawBarrier(ctx: Ctx, r: Rng, w: number, h: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(4, 5, w, h);
  ctx.fillStyle = '#80807a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, w, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(160,60,40,0.55)';
  const horizontal = w > h;
  const n = Math.floor((horizontal ? w : h) / 14);
  for (let i = 0; i < n; i += 2) {
    if (horizontal) ctx.fillRect(i * 14 + 3, 3, 8, h - 6);
    else ctx.fillRect(3, i * 14 + 3, w - 6, 8);
  }
  drawCrack(ctx, r, r.range(5, w - 5), r.range(3, h - 3), 22, 0.6);
}
