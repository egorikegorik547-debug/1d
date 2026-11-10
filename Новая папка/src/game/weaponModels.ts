import type { Ctx } from './art';

/**
 * Детализированные модели оружия (вид сбоку, ствол направлен вправо).
 * Начало координат — на оси ствола у приклада; x растёт к дулу, y вниз.
 */
export interface Model {
  w: number;
  h: number;
  draw: (c: Ctx) => void;
}

/* ------------------------------------------------------------------ */
/* Инструменты рисования                                               */
/* ------------------------------------------------------------------ */
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

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + q, y);
  c.lineTo(x + w - q, y);
  c.quadraticCurveTo(x + w, y, x + w, y + q);
  c.lineTo(x + w, y + h - q);
  c.quadraticCurveTo(x + w, y + h, x + w - q, y + h);
  c.lineTo(x + q, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - q);
  c.lineTo(x, y + q);
  c.quadraticCurveTo(x, y, x + q, y);
  c.closePath();
}

const STEEL = '#4a4f56';
const DARK = '#2b2d31';
const BLACK = '#1c1d20';
const WOOD = '#8a5a2e';
const WOOD_D = '#5e3c1e';

/** Металлический блок с объёмной заливкой */
function metal(c: Ctx, x: number, y: number, w: number, h: number, base = STEEL, r = 1.4) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.42));
  g.addColorStop(0.3, shade(base, 0.1));
  g.addColorStop(0.7, base);
  g.addColorStop(1, shade(base, -0.55));
  c.fillStyle = g;
  rr(c, x, y, w, h, r);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  c.lineWidth = 0.55;
  c.stroke();
  if (h > 2.4 && w > 3) {
    c.fillStyle = 'rgba(255,255,255,0.28)';
    c.fillRect(x + Math.min(r, 1.5), y + 0.45, w - Math.min(r, 1.5) * 2, Math.min(0.9, h * 0.14));
  }
}

function poly(c: Ctx, pts: number[][], base: string, stroke = 'rgba(0,0,0,0.6)') {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(base, 0.35));
  g.addColorStop(0.45, base);
  g.addColorStop(1, shade(base, -0.5));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = 0.55;
  c.stroke();
}

function wood(c: Ctx, pts: number[][], base = WOOD) {
  poly(c, pts, base);
  c.save();
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.clip();
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p[0]);
    x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  c.strokeStyle = 'rgba(40,20,5,0.35)';
  c.lineWidth = 0.4;
  for (let yy = y0 + 1.2; yy < y1; yy += 1.9) {
    c.beginPath();
    c.moveTo(x0, yy);
    c.bezierCurveTo(x0 + (x1 - x0) * 0.3, yy - 0.8, x0 + (x1 - x0) * 0.6, yy + 0.8, x1, yy);
    c.stroke();
  }
  c.restore();
}

function circ(c: Ctx, x: number, y: number, r: number, base: string) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, shade(base, 0.45));
  g.addColorStop(1, shade(base, -0.5));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.55)';
  c.lineWidth = 0.5;
  c.stroke();
}

function guard(c: Ctx, x: number, y: number, w: number, h: number) {
  c.strokeStyle = shade(DARK, 0.15);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(x, y + h, x + w / 2, y + h);
  c.quadraticCurveTo(x + w, y + h, x + w, y);
  c.stroke();
  c.fillStyle = '#b0b4ba';
  c.fillRect(x + w * 0.45, y + 0.4, 1, h * 0.55);
}

function magazine(c: Ctx, x: number, y: number, w: number, h: number, slant: number, base = DARK) {
  poly(c, [[x, y], [x + w, y], [x + w + slant, y + h], [x + slant, y + h]], base);
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.lineWidth = 0.4;
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    c.beginPath();
    c.moveTo(x + slant * t + 0.8, y + h * t);
    c.lineTo(x + slant * t + w - 0.8, y + h * t);
    c.stroke();
  }
}

function scope(c: Ctx, x: number, y: number, len: number, r: number) {
  metal(c, x, y - r, len, r * 2, '#2c2f33', r);
  metal(c, x - 3, y - r * 1.3, 4.5, r * 2.6, '#3a3d42', 1);
  metal(c, x + len - 2, y - r * 1.25, 5, r * 2.5, '#3a3d42', 1);
  c.fillStyle = 'rgba(120,200,255,0.65)';
  c.fillRect(x + len + 2.4, y - r * 0.9, 0.9, r * 1.8);
  metal(c, x + len * 0.4, y + r, 2, 2.4, '#222', 0.4);
  metal(c, x + len * 0.75, y + r, 2, 2.4, '#222', 0.4);
}

function checker(c: Ctx, x: number, y: number, w: number, h: number) {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  for (let yy = y; yy < y + h - 1; yy += 2) for (let xx = x + ((Math.floor(yy) % 4) / 2); xx < x + w - 1; xx += 2) c.fillRect(xx, yy, 0.8, 0.8);
}

const barrelTip = (c: Ctx, x: number, y: number, h: number) => {
  metal(c, x, y, 2.2, h, BLACK, 0.5);
  c.fillStyle = '#050505';
  c.fillRect(x + 1.4, y + h * 0.28, 0.8, h * 0.44);
};

/* ------------------------------------------------------------------ */
/* Модели                                                              */
/* ------------------------------------------------------------------ */
export const MODELS: Record<string, Model> = {
  pistol: {
    w: 56, h: 40,
    draw: (c) => {
      poly(c, [[14, 0], [28, 0], [24, 22], [12.5, 22]], '#2a2c2f');
      checker(c, 14, 4, 9, 16);
      metal(c, 12, 21, 12, 2.4, '#8a8f95', 1);
      metal(c, 13, -9, 36, 9.5, '#4d5258', 2);
      metal(c, 48, -7, 4, 6.5, BLACK, 1);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 5; i++) c.fillRect(33 + i * 1.7, -8.2, 0.7, 7.2);
      metal(c, 15, 0.4, 20, 3.5, '#3b3f44', 1);
      guard(c, 30, 3.8, 9, 7);
      metal(c, 14, -11, 2.4, 2.4, DARK, 0.5);
      metal(c, 46, -11, 2.2, 2.4, DARK, 0.5);
      circ(c, 12.5, -6, 2, '#222');
    },
  },
  aps: {
    w: 68, h: 42,
    draw: (c) => {
      poly(c, [[18, 0], [32, 0], [28, 24], [15, 24]], '#26282b');
      checker(c, 18, 4, 10, 18);
      metal(c, 16, 23, 15, 2.4, '#8a8f95', 1);
      metal(c, 15, -9.5, 38, 10, '#444950', 2);
      metal(c, 52, -7.4, 14, 5.2, '#2f3237', 1.2);
      barrelTip(c, 65, -7.4, 5.2);
      metal(c, 17, 0.4, 24, 3.4, '#383c41', 1);
      guard(c, 34, 3.8, 10, 7);
      wood(c, [[2, -4], [17, -7], [17, 3], [4, 9]], WOOD_D);
      metal(c, 20, -12, 2.4, 2.8, DARK, 0.5);
      metal(c, 51, -12, 2.4, 2.8, DARK, 0.5);
    },
  },
  glock: {
    w: 52, h: 38,
    draw: (c) => {
      poly(c, [[10, -1], [26, -1], [24.5, 8], [28, 22], [14, 22], [10.5, 8]], '#2f3236');
      checker(c, 13, 8, 10, 12);
      metal(c, 9, -9.5, 38, 9, '#3a3d42', 2.2);
      metal(c, 10, -3.5, 36, 3.6, '#1f2124', 1);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < 6; i++) c.fillRect(11 + i * 1.5, -8.6, 0.6, 6.2);
      metal(c, 46, -7.2, 3, 5.8, BLACK, 0.8);
      guard(c, 25, 2.6, 9, 6.5);
      metal(c, 9, -11.2, 2, 2.2, '#999', 0.4);
      metal(c, 44, -11.2, 2, 2.2, '#999', 0.4);
    },
  },
  revolver: {
    w: 66, h: 44,
    draw: (c) => {
      wood(c, [[10, 0], [24, 0], [20, 24], [6, 22]], WOOD_D);
      metal(c, 12, -10, 24, 12, '#5c6168', 3);
      circ(c, 28, -4, 7.2, '#6b7078');
      c.fillStyle = '#2a2d31';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.beginPath();
        c.arc(28 + Math.cos(a) * 4, -4 + Math.sin(a) * 4, 1.1, 0, Math.PI * 2);
        c.fill();
      }
      metal(c, 33, -9.4, 32, 4, '#7a7f87', 1);
      metal(c, 33, -5.3, 30, 3.2, '#3c4046', 1);
      barrelTip(c, 63, -9.4, 4);
      metal(c, 62, -11.6, 3, 2.4, '#bbb', 0.5);
      guard(c, 20, 2, 12, 8);
      poly(c, [[12, -10], [10, -14], [15, -11]], '#222');
    },
  },
  deagle: {
    w: 70, h: 44,
    draw: (c) => {
      poly(c, [[15, 0], [33, 0], [29, 24], [13, 24]], '#2d2f33');
      checker(c, 17, 5, 11, 17);
      metal(c, 12, 23, 18, 2.6, '#9aa0a6', 1);
      metal(c, 14, -11, 52, 11, '#8c9299', 2);
      metal(c, 14, -11, 52, 3, '#b8bec5', 1.5);
      metal(c, 14, 0, 30, 4, '#4a4f55', 1);
      c.fillStyle = 'rgba(20,20,20,0.7)';
      for (let i = 0; i < 6; i++) c.fillRect(24 + i * 3.4, -9.6, 1.6, 7.6);
      barrelTip(c, 65, -9, 5);
      guard(c, 34, 4, 11, 7.5);
      metal(c, 15, -13.4, 2.4, 2.6, DARK, 0.5);
      metal(c, 62, -13.4, 2.4, 2.6, DARK, 0.5);
      metal(c, 14, -10.4, 52, 0.8, '#1d1f22', 0.2);
    },
  },
  smg: {
    w: 78, h: 44,
    draw: (c) => {
      c.strokeStyle = '#555a60';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(14, -6);
      c.lineTo(2, -6);
      c.lineTo(2, 4);
      c.lineTo(14, 4);
      c.stroke();
      metal(c, 14, -10, 40, 13, '#41454b', 2);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 6; i++) c.fillRect(36 + i * 2.6, -8.5, 1.1, 10);
      metal(c, 54, -6.5, 20, 5, '#2d3035', 1.2);
      barrelTip(c, 73, -6.5, 5);
      magazine(c, 26, 3, 7, 22, 4, '#2b2d31');
      poly(c, [[14, 3], [23, 3], [20, 20], [11, 20]], '#2c2e32');
      guard(c, 22, 3, 9, 5);
      metal(c, 16, -12.5, 2.2, 2.8, DARK, 0.4);
    },
  },
  uzi: {
    w: 74, h: 46,
    draw: (c) => {
      c.strokeStyle = '#60656b';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(12, -4);
      c.lineTo(0, 0);
      c.lineTo(0, 5);
      c.lineTo(13, 5);
      c.stroke();
      metal(c, 12, -9, 42, 12, '#3b3f44', 1.8);
      metal(c, 14, -9.6, 38, 1.8, '#5a5f66', 0.8);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 7; i++) c.fillRect(18 + i * 2, -3, 0.7, 5);
      metal(c, 54, -5.6, 16, 4.4, '#2b2e32', 1);
      barrelTip(c, 69, -5.6, 4.4);
      poly(c, [[28, 3], [38, 3], [37, 28], [28, 28]], '#2b2d31');
      checker(c, 29, 8, 7, 18);
      guard(c, 40, 3, 10, 5);
      metal(c, 14, -11.4, 2, 2.4, DARK, 0.4);
    },
  },
  silsmg: {
    w: 92, h: 44,
    draw: (c) => {
      c.strokeStyle = '#555a60';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(12, -5);
      c.lineTo(0, -5);
      c.lineTo(0, 4);
      c.lineTo(13, 4);
      c.stroke();
      metal(c, 12, -9.5, 34, 12, '#33373c', 2);
      metal(c, 46, -8, 44, 7.6, '#1d1f22', 2.4);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 12; i++) c.fillRect(49 + i * 3.4, -6.4, 1, 4.5);
      barrelTip(c, 89, -8, 7.6);
      magazine(c, 24, 2.5, 7, 22, 3, '#222427');
      poly(c, [[12, 2.5], [21, 2.5], [18, 19], [9, 19]], '#222427');
      guard(c, 20, 2.5, 9, 5);
      metal(c, 14, -12, 2.2, 2.6, DARK, 0.4);
      metal(c, 38, -12, 2.2, 2.6, DARK, 0.4);
    },
  },
  mp5: {
    w: 92, h: 46,
    draw: (c) => {
      poly(c, [[0, -7], [14, -9], [14, 2], [2, 5], [0, 2]], '#2f3236');
      metal(c, 13, -10, 42, 11, '#3a3e44', 2);
      metal(c, 15, -10.6, 38, 1.8, '#555a60', 0.8);
      metal(c, 54, -9, 26, 9, '#2c2f33', 1.5);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < 6; i++) c.fillRect(57 + i * 3.4, -7.8, 1.2, 6.6);
      metal(c, 80, -6.5, 10, 4.6, '#191a1c', 1);
      barrelTip(c, 89, -6.5, 4.6);
      magazine(c, 34, 1, 6, 24, 5, '#2a2c30');
      poly(c, [[14, 1], [24, 1], [21, 20], [11, 20]], '#2c2e32');
      checker(c, 14, 6, 8, 12);
      guard(c, 23, 1, 9, 5);
      metal(c, 20, -12.6, 6, 3, '#2a2c30', 0.8);
      metal(c, 86, -10.6, 2, 2.6, DARK, 0.4);
    },
  },
  p90: {
    w: 90, h: 46,
    draw: (c) => {
      poly(c, [[2, -10], [58, -13], [72, -9], [72, 3], [58, 5], [34, 4], [18, 11], [8, 11], [2, 4]], '#6f6a58');
      metal(c, 18, -17, 42, 4.2, '#2b2d30', 2);
      c.fillStyle = 'rgba(170,200,160,0.35)';
      c.fillRect(22, -16.4, 34, 2.6);
      poly(c, [[34, 2], [44, 2], [42, 20], [34, 20]], '#6f6a58');
      guard(c, 34, 2, 10, 6);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(8, -5, 24, 1);
      metal(c, 72, -6, 12, 4.4, '#222427', 1);
      barrelTip(c, 83, -6, 4.4);
      circ(c, 12, -1, 3, '#2a2c2f');
      metal(c, 62, -12, 2, 2.4, DARK, 0.4);
    },
  },
  sawedoff: {
    w: 66, h: 40,
    draw: (c) => {
      wood(c, [[0, -2], [14, -7], [18, 3], [10, 16], [2, 16], [0, 8]], WOOD);
      metal(c, 16, -7.5, 16, 12, '#555a61', 2);
      circ(c, 24, -1.5, 2.2, '#8a8f95');
      metal(c, 30, -7.5, 34, 5.2, '#3c4046', 1.3);
      metal(c, 30, -2.4, 34, 5.2, '#33373c', 1.3);
      barrelTip(c, 63, -7.5, 5.2);
      barrelTip(c, 63, -2.4, 5.2);
      metal(c, 30, -1, 34, 0.8, '#101113', 0.2);
      wood(c, [[34, 2], [50, 2], [50, 7], [34, 7]], WOOD_D);
      guard(c, 20, 4, 9, 6);
      metal(c, 60, -9.8, 2.2, 2.4, '#bbb', 0.4);
    },
  },
  doublebarrel: {
    w: 118, h: 40,
    draw: (c) => {
      wood(c, [[0, -2], [24, -7], [32, 3], [22, 15], [6, 16], [0, 9]], WOOD);
      c.fillStyle = '#2a1608';
      c.fillRect(0, -2, 2.4, 11);
      metal(c, 28, -8, 20, 12, '#6a6f76', 2.5);
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(31, -4);
      c.bezierCurveTo(35, -7, 41, -7, 45, -4);
      c.stroke();
      metal(c, 46, -8, 70, 5.4, '#2f3338', 1.3);
      metal(c, 46, -2.8, 70, 5.4, '#292c31', 1.3);
      metal(c, 46, -3.2, 70, 0.9, '#8a8f95', 0.2);
      wood(c, [[58, 3], [84, 3], [84, 8.5], [58, 8.5]], WOOD_D);
      barrelTip(c, 114, -8, 5.4);
      barrelTip(c, 114, -2.8, 5.4);
      metal(c, 112, -10.4, 2.6, 2.6, '#ddd', 0.5);
      guard(c, 34, 4, 10, 7);
    },
  },
  shotgun: {
    w: 118, h: 40,
    draw: (c) => {
      wood(c, [[0, -2], [24, -6], [30, 3], [22, 14], [6, 15], [0, 8]], WOOD);
      metal(c, 26, -8.4, 24, 11.6, '#41464c', 2);
      metal(c, 34, -3.5, 12, 2.2, '#16171a', 0.6);
      metal(c, 48, -7.5, 68, 4.4, '#2d3035', 1.2);
      metal(c, 48, -3.2, 62, 4.4, '#363a40', 1.2);
      wood(c, [[58, -3], [88, -3], [88, 5.6], [58, 5.6]], WOOD);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < 7; i++) c.fillRect(61 + i * 3.8, -1.6, 1, 6);
      barrelTip(c, 114, -7.5, 4.4);
      circ(c, 110, -9, 1.4, '#d8d0b0');
      guard(c, 32, 3.4, 9.5, 6.5);
    },
  },
  autoshotgun: {
    w: 110, h: 46,
    draw: (c) => {
      poly(c, [[0, -3], [22, -8], [28, 4], [20, 9], [0, 10]], '#33363a');
      metal(c, 24, -10, 42, 14, '#3f4349', 2);
      metal(c, 30, -12.2, 34, 2.4, '#272a2e', 1);
      metal(c, 66, -7.4, 42, 4.6, '#2b2e32', 1.2);
      metal(c, 62, -2.8, 44, 6.4, '#33373d', 1.5);
      poly(c, [[40, 4], [56, 4], [54, 24], [40, 24]], '#262a2e');
      c.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 4; i++) c.fillRect(42, 8 + i * 4, 11, 0.6);
      barrelTip(c, 106, -7.4, 5.2);
      guard(c, 30, 4, 9, 6);
      poly(c, [[70, 3.6], [96, 3.6], [96, 9], [70, 9]], '#26292d');
      metal(c, 104, -9.6, 2, 2.6, '#bbb', 0.4);
    },
  },
  spas: {
    w: 116, h: 46,
    draw: (c) => {
      c.strokeStyle = '#3a3d42';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(24, -5);
      c.lineTo(2, -5);
      c.lineTo(0, 8);
      c.lineTo(18, 9);
      c.stroke();
      c.fillStyle = '#24262a';
      c.fillRect(0, -6, 3, 15);
      metal(c, 22, -10, 36, 13, '#3c4046', 2);
      metal(c, 26, -12.4, 28, 2.8, '#24272a', 1);
      metal(c, 58, -7.6, 52, 4.6, '#2b2e32', 1.2);
      metal(c, 58, -3, 44, 5.6, '#363a40', 1.4);
      poly(c, [[64, 2.6], [96, 2.6], [96, 8], [64, 8]], '#1f2124');
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 8; i++) c.fillRect(66 + i * 3.6, 3.6, 1.2, 3.6);
      barrelTip(c, 108, -7.6, 4.6);
      guard(c, 30, 3, 10, 6.5);
      poly(c, [[24, 2], [32, 2], [30, 14], [23, 14]], '#2a2c30');
    },
  },
  carbine: {
    w: 108, h: 40,
    draw: (c) => {
      wood(c, [[0, -4], [30, -6], [32, 6], [20, 13], [4, 13], [0, 6]], WOOD);
      metal(c, 28, -8, 30, 9, '#43484e', 1.6);
      metal(c, 33, -10, 20, 2.2, '#2b2d31', 0.8);
      wood(c, [[58, -5.4], [82, -5.4], [82, 3], [58, 3]], WOOD);
      metal(c, 82, -4, 24, 3.6, '#2e3136', 1);
      barrelTip(c, 104, -4, 3.6);
      metal(c, 100, -8, 2.2, 4, DARK, 0.4);
      magazine(c, 38, 1, 12, 5, 0, '#2e3136');
      guard(c, 32, 1.6, 10, 6);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 5; i++) c.fillRect(61 + i * 4, -4.2, 1, 6.5);
    },
  },
  mosin: {
    w: 138, h: 38,
    draw: (c) => {
      wood(c, [[0, -3], [36, -6], [44, -3], [96, -3.4], [96, 4.6], [44, 5.4], [34, 9], [20, 14], [4, 13], [0, 6]], WOOD);
      metal(c, 36, -8.2, 24, 5, '#565b61', 1.4);
      metal(c, 48, -11.6, 3, 4, '#2a2c2f', 0.6);
      circ(c, 46, -9.6, 1.6, '#ccc');
      c.strokeStyle = '#8a8f95';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(51, -10);
      c.quadraticCurveTo(58, -15, 60, -9);
      c.stroke();
      metal(c, 60, -5.8, 74, 3.4, '#3b3f45', 1);
      metal(c, 94, -4.4, 14, 1.2, '#8a8f95', 0.4);
      metal(c, 130, -7, 3, 3.2, DARK, 0.4);
      metal(c, 134, -5.4, 3, 1.6, '#aaa', 0.4);
      wood(c, [[62, -1], [96, -1], [96, 5.4], [62, 5.4]], WOOD_D);
      guard(c, 38, 2, 10, 6);
      c.strokeStyle = '#9aa0a6';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(86, 4.4);
      c.lineTo(112, -2);
      c.stroke();
    },
  },
  rifle: {
    w: 112, h: 46,
    draw: (c) => {
      wood(c, [[0, -4], [28, -6], [30, 6], [18, 12], [3, 12], [0, 6]], WOOD);
      metal(c, 26, -9, 30, 12, '#3f434a', 1.6);
      metal(c, 30, -10.4, 20, 2, '#26282c', 0.8);
      wood(c, [[56, -5.4], [78, -5.4], [78, 3], [56, 3]], '#6a4224');
      metal(c, 56, -8.4, 22, 2.6, '#2a2d31', 1);
      metal(c, 78, -5.2, 22, 4.4, '#303338', 1);
      metal(c, 98, -7, 8, 7, '#22252a', 1.4);
      barrelTip(c, 105, -6, 4);
      magazine(c, 38, 3, 10, 22, -8, '#2d3036');
      poly(c, [[24, 2], [32, 2], [30, 15], [22, 15]], '#2a2c30');
      guard(c, 32, 2.6, 9, 6);
      metal(c, 94, -11, 2.4, 3.4, DARK, 0.4);
      metal(c, 52, -11, 4, 2.4, DARK, 0.4);
    },
  },
  akm: {
    w: 112, h: 48,
    draw: (c) => {
      wood(c, [[0, -4], [28, -6], [30, 6], [18, 12], [3, 12], [0, 6]], WOOD);
      metal(c, 26, -9, 32, 12, '#3a3e44', 1.6);
      metal(c, 30, -10.6, 22, 2, '#24262a', 0.8);
      wood(c, [[58, -5.6], [82, -5.6], [82, 3.4], [58, 3.4]], WOOD);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < 5; i++) c.fillRect(61 + i * 4.2, -4.6, 1, 7);
      metal(c, 56, -9, 26, 2.8, '#2b2d31', 1);
      metal(c, 82, -5, 20, 4.2, '#303338', 1);
      metal(c, 100, -7.6, 6, 8, '#222529', 1.4);
      barrelTip(c, 105, -6, 4);
      poly(c, [[38, 2], [50, 2], [60, 28], [49, 28]], '#2d3036');
      c.strokeStyle = 'rgba(255,255,255,0.1)';
      c.lineWidth = 0.4;
      for (let i = 1; i < 5; i++) {
        c.beginPath();
        c.moveTo(38 + i * 2.4, 2 + i * 5.2);
        c.lineTo(50 + i * 2.4, 2 + i * 5.2);
        c.stroke();
      }
      poly(c, [[24, 2], [32, 2], [30, 16], [22, 16]], '#3a2410');
      guard(c, 32, 2.6, 9, 6);
      metal(c, 94, -11.2, 2.4, 3.8, DARK, 0.4);
    },
  },
  m4: {
    w: 120, h: 48,
    draw: (c) => {
      metal(c, 0, -3, 6, 12, '#2a2c30', 1.4);
      poly(c, [[5, -3], [30, -4], [30, 4], [5, 4]], '#33363a');
      poly(c, [[26, -9], [64, -9], [64, 3], [26, 3]], '#2f3236');
      metal(c, 26, -12.6, 40, 3.4, '#34373b', 0.8);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < 9; i++) c.fillRect(30 + i * 4, -11.8, 1.5, 1.6);
      metal(c, 64, -7.2, 30, 8, '#303337', 1.4);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 6; i++) c.fillRect(68 + i * 4.2, -6.2, 1.4, 6);
      metal(c, 94, -4.6, 14, 3.6, '#202225', 1);
      metal(c, 106, -6, 8, 6, '#17181a', 1.2);
      barrelTip(c, 113, -5.4, 4.8);
      magazine(c, 44, 3, 9, 20, 2, '#26282c');
      poly(c, [[30, 3], [40, 3], [36, 22], [27, 22]], '#2c2e32');
      guard(c, 36, 3, 9, 6);
      metal(c, 34, -17.4, 14, 5, '#1d1f22', 1.2);
      c.fillStyle = 'rgba(255,60,40,0.9)';
      c.fillRect(44, -15.6, 1.2, 1.2);
      metal(c, 100, -9.6, 2.4, 3.6, DARK, 0.4);
    },
  },
  lmg: {
    w: 122, h: 50,
    draw: (c) => {
      wood(c, [[0, -4], [26, -7], [30, 6], [18, 12], [3, 12], [0, 6]], '#6a4c2a');
      metal(c, 26, -9.6, 34, 12, '#3a3e44', 1.8);
      metal(c, 30, -11.4, 24, 2.2, '#26282c', 0.8);
      wood(c, [[60, -6], [80, -6], [80, 3.4], [60, 3.4]], '#6a4c2a');
      metal(c, 80, -4.6, 34, 3.6, '#2e3136', 1);
      metal(c, 112, -8, 4, 8, '#25282c', 1);
      barrelTip(c, 115, -6, 4);
      c.strokeStyle = '#8a8f95';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(94, -3);
      c.lineTo(86, 12);
      c.moveTo(94, -3);
      c.lineTo(100, 12);
      c.stroke();
      rr(c, 38, 3, 22, 24, 3);
      c.fillStyle = '#51573a';
      c.fill();
      c.strokeStyle = '#000';
      c.lineWidth = 0.5;
      c.stroke();
      c.fillStyle = '#b8964a';
      for (let i = 0; i < 8; i++) c.fillRect(41 + i * 2.1, 7, 1.2, 14);
      guard(c, 30, 3, 8, 6);
      poly(c, [[24, 2], [32, 2], [30, 15], [22, 15]], '#2a2c30');
    },
  },
  pkm: {
    w: 136, h: 54,
    draw: (c) => {
      wood(c, [[0, -4], [30, -7], [34, 6], [20, 14], [3, 14], [0, 7]], '#6a4a2a');
      metal(c, 30, -11, 48, 14, '#3a3e44', 2);
      metal(c, 36, -13.4, 36, 2.8, '#24262a', 1);
      metal(c, 78, -8.4, 54, 5.4, '#2c2f33', 1);
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < 10; i++) c.fillRect(84 + i * 3.2, -7.4, 1.2, 3.4);
      metal(c, 112, -6.4, 18, 2.4, '#565b61', 0.8);
      barrelTip(c, 131, -7, 5.4);
      c.strokeStyle = '#9aa0a6';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(100, -3);
      c.lineTo(92, 14);
      c.moveTo(100, -3);
      c.lineTo(108, 14);
      c.stroke();
      rr(c, 42, 4, 28, 26, 3);
      c.fillStyle = '#4a5036';
      c.fill();
      c.strokeStyle = '#000';
      c.lineWidth = 0.5;
      c.stroke();
      c.strokeStyle = '#b8964a';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(48, 4);
      c.bezierCurveTo(40, 0, 36, -2, 36, -2);
      c.stroke();
      c.fillStyle = '#c8a24a';
      for (let i = 0; i < 6; i++) c.fillRect(41 + i * 4, -1 - i * 0.4, 2, 3);
      guard(c, 36, 3, 9, 6);
      poly(c, [[28, 2], [36, 2], [34, 16], [27, 16]], '#2a2c30');
    },
  },
  sniper: {
    w: 140, h: 48,
    draw: (c) => {
      wood(c, [[0, -4], [24, -6], [28, 2], [60, 2], [60, 8], [28, 9], [18, 14], [3, 13], [0, 7]], '#6a4a2a');
      c.fillStyle = '#2a1a0a';
      c.fillRect(0, -4, 2.4, 11);
      metal(c, 24, -8, 36, 9, '#3c4046', 1.6);
      scope(c, 30, -14, 34, 3.4);
      metal(c, 60, -6.6, 62, 3.8, '#2a2d31', 1);
      metal(c, 118, -8.4, 18, 7, '#1c1e21', 1.2);
      barrelTip(c, 134, -7.6, 5.6);
      magazine(c, 38, 1, 8, 8, 0, '#2d3036');
      guard(c, 30, 1.6, 9, 6);
      c.strokeStyle = '#9aa0a6';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(92, -2);
      c.lineTo(84, 12);
      c.moveTo(92, -2);
      c.lineTo(100, 12);
      c.stroke();
    },
  },
  vss: {
    w: 130, h: 48,
    draw: (c) => {
      c.strokeStyle = '#4a4e54';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(26, -5);
      c.lineTo(2, -6);
      c.lineTo(2, 7);
      c.lineTo(10, 9);
      c.lineTo(10, 14);
      c.lineTo(24, 2);
      c.stroke();
      metal(c, 24, -9, 38, 11, '#3a3e44', 2);
      scope(c, 30, -14, 22, 3);
      metal(c, 62, -8.4, 66, 7.6, '#1d1f22', 3);
      c.fillStyle = 'rgba(255,255,255,0.07)';
      for (let i = 0; i < 14; i++) c.fillRect(66 + i * 4.3, -6.8, 1, 4.6);
      barrelTip(c, 126, -8.4, 7.6);
      magazine(c, 40, 2, 9, 14, 0, '#2a2c30');
      poly(c, [[26, 2], [34, 2], [32, 16], [25, 16]], '#2c2e32');
      guard(c, 34, 2.4, 9, 6);
    },
  },
  amr: {
    w: 150, h: 50,
    draw: (c) => {
      poly(c, [[0, -4], [30, -6], [34, 4], [18, 12], [3, 12], [0, 6]], '#4b4f3a');
      metal(c, 0, -3, 4, 10, '#222', 1);
      metal(c, 32, -10, 48, 12, '#464b51', 2);
      scope(c, 40, -16, 38, 3.8);
      metal(c, 80, -7, 58, 5, '#2c2f33', 1.2);
      metal(c, 124, -10.4, 20, 11, '#1c1e21', 1.8);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      for (let i = 0; i < 4; i++) c.fillRect(127 + i * 4, -9, 1.4, 8);
      barrelTip(c, 143, -9.6, 9);
      magazine(c, 50, 2, 14, 12, 0, '#2d3036');
      guard(c, 38, 2, 10, 6.5);
      c.strokeStyle = '#a0a6ac';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(104, -3);
      c.lineTo(96, 17);
      c.moveTo(104, -3);
      c.lineTo(112, 17);
      c.stroke();
    },
  },
};

/* ------------------------------------------------------------------ */
/* Самопальное оружие: трубы, скотч, хомуты, ржавчина                  */
/* ------------------------------------------------------------------ */
/** Труба с объёмной заливкой (цилиндр) */
function pipe(c: Ctx, x: number, y: number, w: number, h: number, base = '#6a6f76') {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.55));
  g.addColorStop(0.22, shade(base, 0.2));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shade(base, -0.62));
  c.fillStyle = g;
  rr(c, x, y, w, h, Math.min(h / 2, 2.4));
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.65)';
  c.lineWidth = 0.55;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.fillRect(x + 1.2, y + h * 0.2, w - 2.4, Math.max(0.5, h * 0.1));
}

/** Обмотка изолентой / скотчем */
function tape(c: Ctx, x: number, y: number, w: number, h: number, base = '#2a5ea8') {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(base, 0.4));
  g.addColorStop(0.5, base);
  g.addColorStop(1, shade(base, -0.55));
  c.fillStyle = g;
  rr(c, x, y, w, h, 0.8);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 0.45;
  c.stroke();
  c.save();
  rr(c, x, y, w, h, 0.8);
  c.clip();
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 0.4;
  for (let xx = x - h; xx < x + w; xx += 2.2) {
    c.beginPath();
    c.moveTo(xx, y + h);
    c.lineTo(xx + h * 0.7, y);
    c.stroke();
  }
  c.restore();
}

/** Червячный хомут */
function clampBand(c: Ctx, x: number, y: number, h: number) {
  metal(c, x, y, 3.4, h, '#a7acb2', 0.8);
  c.fillStyle = 'rgba(0,0,0,0.45)';
  for (let yy = y + 1; yy < y + h - 1; yy += 1.6) c.fillRect(x + 0.5, yy, 2.4, 0.4);
  metal(c, x + 0.4, y - 1.6, 2.6, 2.2, '#c25a2a', 0.6);
}

/** Ржавые разводы */
function rust(c: Ctx, x: number, y: number, w: number, h: number, n = 6, seed = 3) {
  let s0 = seed * 9301 + 49297;
  const rnd = () => {
    s0 = (s0 * 9301 + 49297) % 233280;
    return s0 / 233280;
  };
  for (let i = 0; i < n; i++) {
    c.fillStyle = `rgba(${150 + Math.round(rnd() * 40)},${60 + Math.round(rnd() * 30)},20,${0.28 + rnd() * 0.25})`;
    c.beginPath();
    c.ellipse(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2.6, 0.7 + rnd() * 1.4, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
}

/** Сварной шов */
function weld(c: Ctx, x: number, y: number, len: number, vertical = false) {
  c.fillStyle = '#8b8f94';
  for (let i = 0; i < len; i += 1.5) {
    c.beginPath();
    if (vertical) c.arc(x, y + i, 0.75, 0, Math.PI * 2);
    else c.arc(x + i, y, 0.75, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.35)';
  if (vertical) c.fillRect(x - 0.2, y, 0.4, len);
  else c.fillRect(x, y - 0.2, len, 0.4);
}

/** Патрон-гильза (вид сбоку) */
function shell(c: Ctx, x: number, y: number, len: number, h: number, body = '#c9a24a', cap = '#9a7a2e') {
  metal(c, x, y, len, h, body, h / 2);
  metal(c, x + len - 1.6, y - 0.2, 1.8, h + 0.4, cap, 0.5);
}

const HOMEMADE: Record<string, Model> = {
  zippistol: {
    w: 76, h: 42,
    draw: (c) => {
      // рукоять — обрезок доски, обмотанный изолентой
      wood(c, [[6, -1], [24, -1], [20, 22], [4, 19]], '#7a5232');
      tape(c, 5, 6, 17, 3.4, '#1f1f22');
      tape(c, 4.4, 13, 16, 3.4, '#1f1f22');
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(7, 20);
      c.lineTo(19, 21.5);
      c.stroke();
      // казённик — уголок и пластина
      metal(c, 18, -10.5, 14, 13, '#575c63', 1.4);
      weld(c, 19, -9.6, 11);
      rivetRow(c, 20, 0.5, 3);
      // два ствола-трубки
      pipe(c, 30, -9.4, 42, 5.2, '#7a7f86');
      pipe(c, 30, -4.2, 42, 5.2, '#6a6f76');
      c.fillStyle = '#0c0c0e';
      c.fillRect(70.4, -8.2, 1.8, 2.8);
      c.fillRect(70.4, -3, 1.8, 2.8);
      // скотч поверх стволов
      tape(c, 38, -10.2, 6, 12, '#2a5ea8');
      tape(c, 52, -10.2, 5, 12, '#2a5ea8');
      tape(c, 64, -10.2, 4, 12, '#c8c0a0');
      // мушка — гвоздь
      metal(c, 66, -12.2, 1.4, 3, '#b8bcc2', 0.4);
      // курок из согнутого гвоздя и резинка-пружина
      c.strokeStyle = '#b8bcc2';
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(20, -10.4);
      c.lineTo(15, -15.5);
      c.lineTo(11, -14);
      c.stroke();
      c.strokeStyle = '#c33a2a';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(12, -14);
      c.quadraticCurveTo(15, -6, 22, -4);
      c.stroke();
      // спусковая скоба из проволоки
      c.strokeStyle = '#2a2c30';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(26, 2.6);
      c.quadraticCurveTo(30, 11, 36, 4);
      c.stroke();
      metal(c, 32, 1.2, 1.4, 5, '#9a9ea4', 0.4);
      rust(c, 30, -9, 40, 9, 8, 1);
    },
  },
  homerevolver: {
    w: 74, h: 46,
    draw: (c) => {
      // деревянная рукоять-«пчелиный улей», подпиленная вручную
      wood(c, [[8, 0], [26, -1], [22, 24], [4, 22], [3, 10]], '#7a4e2a');
      c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(7 + i, 6 + i * 4);
        c.lineTo(18 + i * 0.5, 7 + i * 4);
        c.stroke();
      }
      metal(c, 3, 21, 20, 2.6, '#8a8f95', 1);
      circ(c, 14, 14, 1.4, '#c8c0a0');
      // рамка из стальной полосы
      metal(c, 12, -11, 28, 14, '#4f545b', 2.2);
      weld(c, 14, -10.2, 22);
      // барабан — обрезок трубы с проточкой
      circ(c, 31, -4.5, 8.2, '#7c828a');
      c.fillStyle = '#16181b';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        c.beginPath();
        c.arc(31 + Math.cos(a) * 4.7, -4.5 + Math.sin(a) * 4.7, 1.45, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#b08a3e';
        c.beginPath();
        c.arc(31 + Math.cos(a) * 4.7 - 0.3, -4.5 + Math.sin(a) * 4.7 - 0.3, 0.7, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#16181b';
      }
      circ(c, 31, -4.5, 1.7, '#a8acb2');
      // ствол — труба с грубой мушкой из болта
      pipe(c, 38, -10, 34, 5.6, '#858b92');
      pipe(c, 39, -4.6, 31, 3.4, '#4a4f56');
      barrelTip(c, 70, -10, 5.6);
      metal(c, 66, -13.2, 2.6, 3.4, '#cfd2d6', 0.5);
      clampBand(c, 56, -10.4, 9);
      // курок и спуск
      poly(c, [[12, -11], [8, -16], [14, -13.5]], '#2a2c30');
      guard(c, 22, 2.6, 13, 8);
      metal(c, 28, 3, 1.4, 5, '#9a9ea4', 0.4);
      rust(c, 12, -11, 58, 12, 9, 2);
    },
  },
  pipeshotgun: {
    w: 124, h: 40,
    draw: (c) => {
      // приклад — грубо выпиленная доска
      wood(c, [[0, -4], [30, -7], [36, 1], [26, 8], [12, 16], [2, 14], [0, 6]], '#8a5a30');
      c.fillStyle = '#2a1608';
      c.fillRect(0, -3, 2.4, 14);
      tape(c, 22, -7.4, 5, 15, '#1f1f22');
      // казённая часть: труба потолще + заглушка с бойком
      pipe(c, 32, -10, 24, 8.6, '#656a71');
      metal(c, 54, -10.6, 3.6, 9.8, '#43474d', 1);
      metal(c, 28, -7, 5, 3.2, '#9a9ea4', 0.8);
      // боёк на пружине и резинке
      c.strokeStyle = '#b8bcc2';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(29, -5.6);
      c.lineTo(22, -5.6);
      c.stroke();
      circ(c, 21, -5.6, 1.9, '#d8b44a');
      c.strokeStyle = '#c33a2a';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(21.4, -3.6);
      c.quadraticCurveTo(26, 4, 36, 0);
      c.stroke();
      // длинная труба-ствол
      pipe(c, 56, -9.2, 66, 6.4, '#7e848b');
      metal(c, 118, -9.6, 5, 7.2, '#3a3e44', 1);
      c.fillStyle = '#050505';
      c.fillRect(121, -7, 2, 2.6);
      metal(c, 117, -12, 2.2, 3, '#ddd', 0.4);
      // цевьё: доска + хомуты
      wood(c, [[62, -3], [98, -3], [98, 4], [62, 4]], '#6a4528');
      clampBand(c, 66, -11, 16);
      clampBand(c, 82, -11, 16);
      clampBand(c, 96, -10.6, 15.5);
      weld(c, 34, -9.4, 20);
      guard(c, 40, 2.6, 11, 7);
      metal(c, 45, 3.2, 1.4, 4.4, '#9a9ea4', 0.4);
      rust(c, 32, -10, 90, 8, 12, 4);
    },
  },
  homesmg: {
    w: 100, h: 52,
    draw: (c) => {
      // проволочный складной приклад
      c.strokeStyle = '#8a8f95';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(24, -6);
      c.lineTo(3, -7);
      c.lineTo(3, 6);
      c.lineTo(12, 7);
      c.lineTo(12, 3);
      c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 0.4;
      c.stroke();
      tape(c, 2, 2, 3, 5, '#c33a2a');
      // ресивер — короб из листового железа
      metal(c, 22, -11.5, 40, 15, '#4d5258', 2);
      weld(c, 24, -10.6, 36);
      weld(c, 24, 2.4, 36);
      rivetRow(c, 26, -5, 6, 5.4);
      // окно затвора и ручка взвода
      c.fillStyle = '#0e0f11';
      c.fillRect(38, -8.4, 16, 2);
      metal(c, 44, -13.6, 5, 3.2, '#b8bcc2', 1);
      circ(c, 50, -12, 1.8, '#d8d8d8');
      // перфорированный кожух ствола
      pipe(c, 62, -10, 30, 8.4, '#6b7078');
      c.fillStyle = '#101113';
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.arc(66 + i * 4.4, -5.8, 1.1, 0, Math.PI * 2);
        c.fill();
      }
      pipe(c, 90, -7.4, 8, 3.8, '#2e3136');
      barrelTip(c, 96.4, -7.4, 3.8);
      metal(c, 90, -14, 1.6, 4, '#cfd2d6', 0.4);
      clampBand(c, 60, -11, 11.5);
      // прицел из согнутой проволоки
      c.strokeStyle = '#b8bcc2';
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(26, -11.5);
      c.lineTo(26, -16);
      c.lineTo(31, -16);
      c.lineTo(31, -11.5);
      c.stroke();
      // рожковый магазин, слегка кривой
      poly(c, [[44, 3], [53, 3], [56, 25], [47, 27]], '#34383d');
      c.strokeStyle = 'rgba(255,255,255,0.14)';
      c.lineWidth = 0.4;
      for (let i = 1; i < 6; i++) {
        c.beginPath();
        c.moveTo(45 + i * 0.5, 3 + i * 4);
        c.lineTo(53 + i * 0.5, 3 + i * 4);
        c.stroke();
      }
      tape(c, 44, 17, 10, 3, '#d8b44a');
      // деревянная рукоять
      wood(c, [[28, 3], [38, 3], [35, 24], [24, 23]], '#7a5232');
      tape(c, 26.4, 13, 11, 2.8, '#1f1f22');
      guard(c, 38, 3, 10, 6);
      metal(c, 42, 4.5, 1.4, 4.2, '#9a9ea4', 0.4);
      rust(c, 22, -11, 70, 14, 10, 5);
    },
  },
  homerifle: {
    w: 140, h: 44,
    draw: (c) => {
      // грубая ложа с ручной резьбой
      wood(c, [[0, -4], [34, -7], [46, -3], [52, 6], [38, 11], [22, 16], [4, 14], [0, 6]], '#8a5630');
      c.strokeStyle = 'rgba(30,14,4,0.55)';
      c.lineWidth = 0.5;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.moveTo(4 + i * 5, 1 + i * 0.6);
        c.lineTo(8 + i * 5, 9 + i * 0.4);
        c.stroke();
      }
      c.fillStyle = '#2a1608';
      c.fillRect(0, -3, 2.4, 14);
      tape(c, 30, -7, 5, 15, '#2a5ea8');
      tape(c, 46, -5, 4, 12, '#2a5ea8');
      // ресивер из толстой трубы + плита
      pipe(c, 40, -10.6, 36, 8.6, '#5d6269');
      weld(c, 42, -10, 32);
      // затвор от дверного запора: рукоять с шариком
      c.strokeStyle = '#a8acb2';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(60, -9);
      c.lineTo(60, -16);
      c.lineTo(66, -19);
      c.stroke();
      circ(c, 67, -19.4, 2.3, '#c25a2a');
      metal(c, 56, -12, 7, 3, '#44484e', 0.8);
      // магазинная коробка на 3 патрона
      metal(c, 48, -2, 15, 9, '#3b3f45', 1.2);
      shell(c, 50, 0.6, 11, 1.8, '#c9a24a');
      shell(c, 50, 3, 11, 1.8, '#c9a24a');
      shell(c, 50, 5.2, 11, 1.8, '#c9a24a');
      // ствол
      pipe(c, 76, -9.2, 58, 5.8, '#7a8087');
      pipe(c, 76, -9.6, 20, 6.6, '#656a71');
      metal(c, 130, -10, 7, 7, '#2b2d31', 1);
      c.fillStyle = '#050505';
      c.fillRect(135, -7.4, 2, 2.6);
      // мушка и целик — гвозди
      metal(c, 126, -12.6, 1.6, 3.6, '#e0e3e6', 0.4);
      metal(c, 80, -12, 4, 2.4, '#44484e', 0.6);
      metal(c, 81.2, -14.4, 1.4, 3, '#b8bcc2', 0.4);
      // цевьё с хомутами
      wood(c, [[78, -3], [114, -3], [114, 4], [78, 4]], '#6a4528');
      clampBand(c, 84, -10.6, 15.5);
      clampBand(c, 104, -10.4, 15);
      // спуск и скоба
      guard(c, 42, 2, 11, 7.5);
      metal(c, 47, 2.6, 1.4, 5, '#9a9ea4', 0.4);
      // подпорка-сошка из проволоки
      c.strokeStyle = '#8a8f95';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(100, 3);
      c.lineTo(94, 16);
      c.moveTo(100, 3);
      c.lineTo(108, 16);
      c.stroke();
      rust(c, 40, -10, 96, 10, 14, 6);
    },
  },
};

/** Ряд заклёпок */
function rivetRow(c: Ctx, x: number, y: number, n: number, gap = 4) {
  for (let i = 0; i < n; i++) circ(c, x + i * gap, y, 0.9, '#b8bcc2');
}

Object.assign(MODELS, HOMEMADE);

export function hasModel(id: string): boolean {
  return id in MODELS;
}

/** Витрина: модель оружия на подсвеченном фоне. */
export function drawShowcase(ctx: Ctx, id: string, width: number, height: number, accent = '#c8a05a') {
  const m = MODELS[id];
  if (!m) return;
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#26241f');
  bg.addColorStop(1, '#0d0c0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // подсветка сзади
  const sp = ctx.createRadialGradient(width / 2, height * 0.46, 4, width / 2, height * 0.46, width * 0.52);
  sp.addColorStop(0, 'rgba(255,214,150,0.30)');
  sp.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, width, height);
  // полка
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, height - 12, width, 1);
  const pad = 16;
  const s = Math.min((width - pad * 2) / m.w, (height - pad * 2 - 4) / m.h);
  const floorY = height * 0.5 + (m.h * s) / 2 + 3;
  const sh = ctx.createRadialGradient(width / 2, floorY, 2, width / 2, floorY, (m.w * s) / 2);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(0, 0);
  ctx.scale(1, 0.16);
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(width / 2, floorY / 0.16, (m.w * s) / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(width / 2 - (m.w * s) / 2, height * 0.5 - 1);
  ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2.5;
  m.draw(ctx);
  ctx.restore();
  // тонкая рамка-акцент
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.globalAlpha = 1;
}

/** Вид сверху в руках игрока (для оружия без ручной отрисовки) */
export function drawModelInHand(ctx: Ctx, id: string, muzzle: number) {
  const m = MODELS[id];
  if (!m) return;
  const x0 = m.w < 75 ? 9 : 2;
  const k = (muzzle + 3 - x0) / m.w;
  ctx.save();
  ctx.translate(x0, 0);
  ctx.scale(k, k * 0.78);
  m.draw(ctx);
  ctx.restore();
}
