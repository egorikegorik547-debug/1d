import type { Ctx } from './art';
import type { AmmoType } from './weapons';

/**
 * Модели боеприпасов для магазина и верстака.
 * Рисуются в условных координатах 260×96 и масштабируются под холст.
 */
export const AMMO_W = 260;
export const AMMO_H = 96;

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (k >= 0) {
    r += (255 - r) * k;
    g += (255 - g) * k;
    b += (255 - b) * k;
  } else {
    r *= 1 + k;
    g *= 1 + k;
    b *= 1 + k;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** Вертикальный цилиндр: свет слева направо */
function cyl(c: Ctx, x: number, y: number, w: number, h: number, base: string, r = 1.5) {
  const g = c.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, shade(base, -0.5));
  g.addColorStop(0.25, shade(base, 0.45));
  g.addColorStop(0.5, shade(base, 0.12));
  g.addColorStop(1, shade(base, -0.62));
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.lineWidth = 0.6;
  c.stroke();
}

/** Пуля: оживальная форма */
function bullet(c: Ctx, cx: number, baseY: number, w: number, h: number, jacket: string, tip?: string, flat = false) {
  const g = c.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, shade(jacket, -0.5));
  g.addColorStop(0.28, shade(jacket, 0.5));
  g.addColorStop(0.55, shade(jacket, 0.08));
  g.addColorStop(1, shade(jacket, -0.65));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - w / 2, baseY);
  if (flat) {
    c.lineTo(cx - w / 2, baseY - h * 0.7);
    c.quadraticCurveTo(cx - w / 2, baseY - h, cx - w * 0.28, baseY - h);
    c.lineTo(cx + w * 0.28, baseY - h);
    c.quadraticCurveTo(cx + w / 2, baseY - h, cx + w / 2, baseY - h * 0.7);
  } else {
    c.lineTo(cx - w / 2, baseY - h * 0.45);
    c.quadraticCurveTo(cx - w * 0.38, baseY - h * 0.9, cx, baseY - h);
    c.quadraticCurveTo(cx + w * 0.38, baseY - h * 0.9, cx + w / 2, baseY - h * 0.45);
  }
  c.lineTo(cx + w / 2, baseY);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.lineWidth = 0.6;
  c.stroke();
  if (tip) {
    c.save();
    c.clip();
    c.fillStyle = tip;
    c.fillRect(cx - w, baseY - h, w * 2, h * 0.28);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.fillRect(cx - w * 0.3, baseY - h, w * 0.18, h * 0.28);
    c.restore();
  }
}

interface CartSpec {
  caseH: number;
  d: number;
  neckD?: number;
  neckH?: number;
  body: string;
  rim?: string;
  jacket: string;
  tip?: string;
  bulletH: number;
  flat?: boolean;
  primer?: string;
}

/** Патрон, стоящий на столе: x — центр, y — «пол» */
function cartridge(c: Ctx, x: number, floorY: number, s: CartSpec, tilt = 0) {
  c.save();
  c.translate(x, floorY);
  c.rotate(tilt);
  // тень
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(1, 0.5, s.d * 0.7, 2, 0, 0, Math.PI * 2);
  c.fill();
  const neckD = s.neckD ?? s.d;
  const neckH = s.neckH ?? 0;
  const bodyH = s.caseH - neckH;
  // корпус гильзы
  cyl(c, -s.d / 2, -bodyH, s.d, bodyH, s.body, 1.2);
  // шейка
  if (neckH > 0) {
    const g = c.createLinearGradient(-s.d / 2, 0, s.d / 2, 0);
    g.addColorStop(0, shade(s.body, -0.5));
    g.addColorStop(0.25, shade(s.body, 0.45));
    g.addColorStop(0.5, shade(s.body, 0.1));
    g.addColorStop(1, shade(s.body, -0.62));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-s.d / 2, -bodyH);
    c.lineTo(-neckD / 2, -bodyH - neckH * 0.55);
    c.lineTo(-neckD / 2, -s.caseH);
    c.lineTo(neckD / 2, -s.caseH);
    c.lineTo(neckD / 2, -bodyH - neckH * 0.55);
    c.lineTo(s.d / 2, -bodyH);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 0.55;
    c.stroke();
  }
  // проточка и фланец дна
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(-s.d / 2 + 0.4, -3.6, s.d - 0.8, 0.9);
  cyl(c, -s.d / 2 - 0.9, -2.4, s.d + 1.8, 2.4, s.rim ?? s.body, 0.6);
  // капсюль
  c.fillStyle = s.primer ?? '#d0d3d6';
  c.beginPath();
  c.arc(0, -1.2, s.d * 0.18, 0, Math.PI * 2);
  c.fill();
  // пуля
  bullet(c, 0, -s.caseH, neckD - 0.3, s.bulletH, s.jacket, s.tip, s.flat);
  c.restore();
}

/** Патрон, лежащий на боку */
function cartridgeLying(c: Ctx, x: number, y: number, s: CartSpec, ang: number) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.rotate(-Math.PI / 2);
  cartridge(c, 0, 0, s);
  c.restore();
}

const SPEC: Partial<Record<AmmoType, CartSpec>> = {
  '9mm': { caseH: 19, d: 10.5, body: '#d0a850', jacket: '#b87333', bulletH: 8.5 },
  '9x39': { caseH: 27, d: 13.2, neckD: 11, neckH: 8, body: '#c8a64e', jacket: '#3a3d42', tip: '#0f1012', bulletH: 17.5 },
  '45': { caseH: 18, d: 12.4, body: '#d4b05a', jacket: '#b1aeaa', bulletH: 8.5, flat: true },
  '545': { caseH: 29, d: 11, neckD: 6.8, neckH: 9, body: '#8a8d60', rim: '#a8aa78', jacket: '#4a2a1a', tip: '#c0392b', bulletH: 14, primer: '#c0392b' },
  '762': { caseH: 40, d: 13.4, neckD: 9, neckH: 11, body: '#d6b458', jacket: '#c8cdd2', tip: '#2d3036', bulletH: 21 },
};

function ammoCrate(c: Ctx, x: number, y: number, w: number, h: number, label: string, color: string, accent: string) {
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.beginPath();
  c.ellipse(x + w / 2, y + h + 2, w * 0.55, 4, 0, 0, Math.PI * 2);
  c.fill();
  // ручка
  c.strokeStyle = '#2a2c2e';
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(x + w * 0.3, y + 3);
  c.quadraticCurveTo(x + w * 0.5, y - 12, x + w * 0.7, y + 3);
  c.stroke();
  c.strokeStyle = '#9aa0a6';
  c.lineWidth = 0.8;
  c.stroke();
  // корпус
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, 0.3));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.5));
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, 3);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.7)';
  c.lineWidth = 1;
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(x + 4, y + 6, w - 8, 1.4);
  c.fillRect(x + 4, y + h - 8, w - 8, 1.4);
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(x + 4, y + 7.4, w - 8, 0.8);
  for (const sx of [x + 6, x + w - 14]) {
    c.fillStyle = '#b6bbc0';
    c.fillRect(sx, y - 1, 8, 8);
    c.strokeStyle = '#222';
    c.lineWidth = 0.7;
    c.strokeRect(sx, y - 1, 8, 8);
  }
  c.fillStyle = 'rgba(14,14,10,0.55)';
  c.fillRect(x + 8, y + 15, w - 16, h - 26);
  c.fillStyle = accent;
  c.font = `bold ${Math.min(15, (w - 20) / (label.length * 0.62))}px ui-monospace, Menlo, Consolas, monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, x + w / 2, y + 15 + (h - 26) / 2 + 0.5);
  c.fillStyle = accent;
  c.fillRect(x + 8, y + h - 9, w - 16, 2.2);
  c.fillStyle = '#c8ccd0';
  for (const [rx, ry] of [[x + 4, y + h - 4], [x + w - 4, y + h - 4], [x + 4, y + 18], [x + w - 4, y + 18]]) {
    c.beginPath();
    c.arc(rx, ry, 1, 0, Math.PI * 2);
    c.fill();
  }
  c.textBaseline = 'alphabetic';
}

function glow(c: Ctx, x: number, y: number, r: number, col: string) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function shotgunShell(c: Ctx, x: number, floorY: number, tilt = 0) {
  c.save();
  c.translate(x, floorY);
  c.rotate(tilt);
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(1, 0.5, 11, 2.4, 0, 0, Math.PI * 2);
  c.fill();
  cyl(c, -8, -30, 16, 30, '#c0392b', 2.5);
  c.fillStyle = '#7a1f16';
  c.beginPath();
  c.roundRect(-8, -33, 16, 4, 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 0.6;
  for (let i = -6; i <= 6; i += 3) {
    c.beginPath();
    c.moveTo(i, -33);
    c.lineTo(i * 0.5, -29);
    c.stroke();
  }
  cyl(c, -8.8, -9.5, 17.6, 9.5, '#d6b458', 1.6);
  cyl(c, -9.6, -2.6, 19.2, 2.6, '#b8923c', 0.8);
  c.fillStyle = '#e8e2d0';
  c.beginPath();
  c.arc(0, -4.6, 2.4, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.15)';
  c.fillRect(-5.5, -28, 2.2, 17);
  c.restore();
}

function energyCell(c: Ctx, x: number, floorY: number, t: number) {
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(x + 1, floorY + 0.5, 11, 2.4, 0, 0, Math.PI * 2);
  c.fill();
  cyl(c, x - 9, floorY - 36, 18, 36, '#3a4552', 3);
  const k = 0.7 + 0.3 * Math.sin(t * 3 + x);
  const g = c.createLinearGradient(0, floorY - 30, 0, floorY - 6);
  g.addColorStop(0, `rgba(120,240,255,${0.95 * k})`);
  g.addColorStop(1, `rgba(40,150,230,${0.85 * k})`);
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x - 5, floorY - 31, 10, 24, 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(x - 3.4, floorY - 30, 1.8, 20);
  cyl(c, x - 6, floorY - 40, 12, 5, '#9aa4ae', 1.4);
  cyl(c, x - 3, floorY - 43, 6, 3.4, '#c8ced4', 1);
  glow(c, x, floorY - 18, 26, `rgba(80,220,255,${0.32 * k})`);
}

function rocketRound(c: Ctx, x: number, floorY: number) {
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(x + 1, floorY + 0.5, 12, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3a3f31';
  c.beginPath();
  c.moveTo(x - 6, floorY - 4);
  c.lineTo(x - 13, floorY);
  c.lineTo(x - 6, floorY - 13);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(x + 6, floorY - 4);
  c.lineTo(x + 13, floorY);
  c.lineTo(x + 6, floorY - 13);
  c.closePath();
  c.fill();
  cyl(c, x - 6, floorY - 28, 12, 26, '#59603f', 2);
  cyl(c, x - 5, floorY - 4, 10, 4, '#222', 1);
  const g = c.createLinearGradient(x - 8, 0, x + 8, 0);
  g.addColorStop(0, '#6a2a1a');
  g.addColorStop(0.3, '#e0703a');
  g.addColorStop(1, '#4a1a10');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - 8, floorY - 28);
  c.quadraticCurveTo(x - 7, floorY - 42, x, floorY - 50);
  c.quadraticCurveTo(x + 7, floorY - 42, x + 8, floorY - 28);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#e8d070';
  c.fillRect(x - 6, floorY - 20, 12, 2);
}

function fuelCan(c: Ctx, x: number, floorY: number, big = false) {
  const w = big ? 30 : 24;
  const h = big ? 40 : 32;
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(x, floorY + 0.5, w * 0.6, 3, 0, 0, Math.PI * 2);
  c.fill();
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#6a2218');
  g.addColorStop(0.3, '#d8503a');
  g.addColorStop(1, '#5a1a12');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x - w / 2, floorY - h, w, h, 3);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.7)';
  c.lineWidth = 0.9;
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.moveTo(x - w / 2 + 3, floorY - h * 0.6);
  c.lineTo(x + w / 2 - 3, floorY - h * 0.2);
  c.moveTo(x - w / 2 + 3, floorY - h * 0.2);
  c.lineTo(x + w / 2 - 3, floorY - h * 0.6);
  c.stroke();
  c.fillStyle = '#d8b44a';
  c.fillRect(x - w / 2 + 3, floorY - h - 5, 7, 5);
  c.fillRect(x + w / 2 - 12, floorY - h - 3, 8, 3);
  c.strokeStyle = '#222';
  c.lineWidth = 1.4;
  c.strokeRect(x - 4, floorY - h - 7, 9, 6);
  c.fillStyle = '#ffe9a8';
  c.fillRect(x - w / 2 + 4, floorY - h + 5, w - 8, 3);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fillRect(x - w / 2 + 2, floorY - h + 2, 2.2, h - 5);
}

function nukeCapsule(c: Ctx, x: number, floorY: number, t: number) {
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.ellipse(x, floorY + 0.5, 16, 3, 0, 0, Math.PI * 2);
  c.fill();
  cyl(c, x - 13, floorY - 38, 26, 38, '#d8d070', 6);
  c.fillStyle = '#1a1a10';
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(x, floorY - 19);
    c.rotate((i * Math.PI * 2) / 3 + t);
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, 9, -0.4, 0.4);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.fillStyle = '#e8c020';
  c.beginPath();
  c.arc(x, floorY - 19, 2.4, 0, Math.PI * 2);
  c.fill();
  glow(c, x, floorY - 19, 30, `rgba(255,240,120,${0.25 + 0.1 * Math.sin(t * 4)})`);
}

const CRATE: Record<AmmoType, { label: string; color: string; accent: string }> = {
  '9mm': { label: '9×18', color: '#6c6a4a', accent: '#e0c060' },
  '9x39': { label: '9×39', color: '#3d4540', accent: '#9fd0ff' },
  '45': { label: '.45 MAG', color: '#5a4a3a', accent: '#e8b84a' },
  '12ga': { label: '12 GA', color: '#6a3a30', accent: '#ffb090' },
  '545': { label: '5.45×39', color: '#4a5a3a', accent: '#d8d070' },
  '762': { label: '7.62×54', color: '#4a4f3a', accent: '#e8d070' },
  energy: { label: 'ENERGY', color: '#2f3d4a', accent: '#6fd8ff' },
  rocket: { label: 'ROCKET', color: '#4f5a38', accent: '#ff9a50' },
  fuel: { label: 'FUEL', color: '#5a2a24', accent: '#ffb347' },
  nuke: { label: 'NUKE', color: '#4a4a2a', accent: '#f6e060' },
};

/** Сцена с патронами: ящик + гильзы на полке */
export function drawAmmoScene(ctx: Ctx, type: AmmoType, width: number, height: number, t = 0) {
  const sc = Math.min(width / AMMO_W, height / AMMO_H);
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#26241f');
  bg.addColorStop(1, '#0d0c0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  const sp = ctx.createRadialGradient(width * 0.58, height * 0.42, 4, width * 0.58, height * 0.42, width * 0.55);
  sp.addColorStop(0, 'rgba(255,214,150,0.28)');
  sp.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, height * 0.86, width, 1);

  ctx.save();
  ctx.translate((width - AMMO_W * sc) / 2, (height - AMMO_H * sc) / 2);
  ctx.scale(sc, sc);
  const floorY = 84;
  const cr = CRATE[type];
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  const spec = SPEC[type];
  if (spec) {
    ammoCrate(ctx, 12, 34, 92, 50, cr.label, cr.color, cr.accent);
    const xs = [132, 150, 168, 186];
    for (let i = 0; i < xs.length; i++) cartridge(ctx, xs[i], floorY, spec);
    cartridgeLying(ctx, 216, floorY - spec.d / 2 - 1, spec, 0.04);
    cartridgeLying(ctx, 226, floorY - spec.d / 2 - spec.d - 2, spec, -0.28);
    cartridge(ctx, 246, floorY, spec, 0.08);
  } else if (type === '12ga') {
    ammoCrate(ctx, 12, 34, 92, 50, cr.label, cr.color, cr.accent);
    for (let i = 0; i < 5; i++) shotgunShell(ctx, 128 + i * 22, floorY, i === 4 ? 0.12 : 0);
  } else if (type === 'energy') {
    ammoCrate(ctx, 12, 34, 92, 50, cr.label, cr.color, cr.accent);
    for (let i = 0; i < 5; i++) energyCell(ctx, 130 + i * 24, floorY, t);
  } else if (type === 'rocket') {
    ammoCrate(ctx, 12, 34, 92, 50, cr.label, cr.color, cr.accent);
    rocketRound(ctx, 150, floorY);
    rocketRound(ctx, 186, floorY);
    rocketRound(ctx, 222, floorY);
  } else if (type === 'fuel') {
    fuelCan(ctx, 52, floorY, true);
    fuelCan(ctx, 110, floorY, true);
    fuelCan(ctx, 160, floorY);
    fuelCan(ctx, 196, floorY);
    fuelCan(ctx, 232, floorY);
  } else {
    ammoCrate(ctx, 20, 34, 92, 50, cr.label, cr.color, cr.accent);
    nukeCapsule(ctx, 170, floorY, t);
    nukeCapsule(ctx, 220, floorY, t + 1);
  }
  ctx.restore();
  ctx.strokeStyle = cr.accent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.globalAlpha = 1;
}
