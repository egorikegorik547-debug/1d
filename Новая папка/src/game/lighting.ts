import type { Ctx } from './art';

export interface Light {
  x: number;
  y: number;
  r: number;
  /** 0..1 — сколько темноты стереть в центре */
  k?: number;
  /** тёплое свечение поверх */
  warm?: string;
}

let cv: HTMLCanvasElement | null = null;

/** Затемнение с «дырами» света. Координаты — экранные (в CSS-пикселях). */
export function drawDarkness(
  ctx: Ctx,
  W: number,
  H: number,
  alpha: number,
  tint: [number, number, number],
  lights: Light[],
  cone?: { x: number; y: number; ang: number; len: number; spread: number },
) {
  const sc = 0.5;
  if (!cv) cv = document.createElement('canvas');
  const w = Math.ceil(W * sc);
  const h = Math.ceil(H * sc);
  if (cv.width !== w || cv.height !== h) {
    cv.width = w;
    cv.height = h;
  }
  const c = cv.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, w, h);
  c.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${alpha})`;
  c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const g = c.createRadialGradient(l.x * sc, l.y * sc, 0, l.x * sc, l.y * sc, l.r * sc);
    const k = l.k ?? 1;
    g.addColorStop(0, `rgba(0,0,0,${k})`);
    g.addColorStop(0.55, `rgba(0,0,0,${k * 0.55})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(l.x * sc, l.y * sc, l.r * sc, 0, Math.PI * 2);
    c.fill();
  }
  if (cone) {
    c.save();
    c.translate(cone.x * sc, cone.y * sc);
    c.rotate(cone.ang);
    const g = c.createRadialGradient(0, 0, 10 * sc, 0, 0, cone.len * sc);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, cone.len * sc, -cone.spread, cone.spread);
    c.closePath();
    c.fill();
    c.restore();
  }
  ctx.drawImage(cv, 0, 0, W, H);
  // тёплые отблески
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.warm) continue;
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
    g.addColorStop(0, l.warm);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
