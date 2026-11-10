import type { Ctx } from './art';
import type { Game } from './engine';
import type { Furn } from './basement';
import { sfx, genAudio } from './audio';
import { FURN, GEN_CAN, GEN_CAP, GEN_MAX_LOAD, WIRE_COST, WIRE_RANGE, canAfford, type ResId } from './items';

/* ------------------------------------------------------------------ */
/* Сеть: генератор → провода → лампы / лампочки                         */
/* ------------------------------------------------------------------ */
export const isConsumer = (t: string) => t === 'lamp' || t === 'bulb';
export const isSource = (t: string) => t === 'generator';

/** Корень цепи (генератор), от которого питается потребитель */
export function rootOf(g: Game, f: Furn): Furn | null {
  let cur: Furn | undefined = f;
  for (let i = 0; i < 16 && cur; i++) {
    if (cur.type === 'generator') return cur;
    if (cur.wire === undefined) return null;
    const up: Furn | undefined = g.furn.find((q) => q.id === cur!.wire);
    cur = up;
  }
  return null;
}

export const isPowered = (g: Game, f: Furn): boolean => {
  if (!isConsumer(f.type)) return false;
  const r = rootOf(g, f);
  return !!r && !!r.on && (r.fuel ?? 0) > 0;
};

export function loadOf(g: Game, gen: Furn): number {
  let n = 0;
  for (const f of g.furn) if (isConsumer(f.type) && rootOf(g, f) === gen) n++;
  return n;
}

export function genFuelFrac(f: Furn) {
  return Math.max(0, Math.min(1, (f.fuel ?? 0) / GEN_CAP));
}

/** Расход топлива, отключение при пустом баке, звук */
export function updatePower(g: Game, dt: number) {
  let running: Furn | null = null;
  let load = 0;
  for (const f of g.furn) {
    if (f.type !== 'generator') continue;
    f.spark = Math.max(0, (f.spark ?? 0) - dt);
    if (!f.on) continue;
    const l = loadOf(g, f);
    f.fuel = Math.max(0, (f.fuel ?? 0) - dt * (0.1 + 0.03 * l));
    if ((f.fuel ?? 0) <= 0) {
      f.on = false;
      f.fuel = 0;
      g.toast('Генератор заглох — кончился бензин!', 'bad');
      sfx.genStop();
      continue;
    }
    if (!running || l > load) {
      running = f;
      load = l;
    }
  }
  const inBasement = g.loc === 'basement';
  genAudio(!!running, inBasement ? 1 : 0.12, load, !!running && genFuelFrac(running) < 0.08);
}

export interface WireResult {
  ok: boolean;
  msg: string;
}

export function canWire(g: Game, src: Furn, dst: Furn): WireResult {
  if (src === dst) return { ok: false, msg: 'Выберите другой предмет' };
  if (!isConsumer(dst.type)) return { ok: false, msg: 'Провод подключается к лампе или лампочке' };
  if (!isSource(src.type) && !isConsumer(src.type)) return { ok: false, msg: 'Отсюда провод не потянуть' };
  if (Math.hypot(src.x - dst.x, src.y - dst.y) > WIRE_RANGE) return { ok: false, msg: 'Слишком далеко для провода' };
  // цикл?
  let cur: Furn | undefined = src;
  for (let i = 0; i < 16 && cur; i++) {
    if (cur === dst) return { ok: false, msg: 'Нельзя замкнуть цепь' };
    cur = cur.wire === undefined ? undefined : g.furn.find((q) => q.id === cur!.wire);
  }
  const root = rootOf(g, src);
  if (root && dst.wire === undefined && loadOf(g, root) >= GEN_MAX_LOAD) return { ok: false, msg: `Генератор тянет не больше ${GEN_MAX_LOAD} потребителей` };
  if (dst.wire === src.id) return { ok: false, msg: 'Уже подключено' };
  if (!canAfford(g.res, WIRE_COST)) return { ok: false, msg: 'Нужен провод: металлолом и ткань' };
  return { ok: true, msg: '' };
}

export function connectWire(g: Game, src: Furn, dst: Furn): WireResult {
  const r = canWire(g, src, dst);
  if (!r.ok) return r;
  const had = dst.wire !== undefined;
  if (!had) for (const k of Object.keys(WIRE_COST) as ResId[]) g.res[k] -= WIRE_COST[k] ?? 0;
  dst.wire = src.id;
  dst.spark = 0.6;
  return { ok: true, msg: had ? 'Провод перекинут' : 'Провод подключён' };
}

export function disconnectWire(g: Game, f: Furn): boolean {
  if (f.wire === undefined) return false;
  f.wire = undefined;
  for (const k of Object.keys(WIRE_COST) as ResId[]) g.res[k] += WIRE_COST[k] ?? 0;
  return true;
}

/** Забрать топливо при снятии генератора */
export function refuelAmount(f: Furn) {
  return Math.floor((f.fuel ?? 0) / GEN_CAN);
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
const rr = (c: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

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

export interface GenLook {
  on: boolean;
  fuel: number;
  sputter?: boolean;
  spark?: number;
}

/** Бензиновый генератор сверху (78×54), центр в (0,0) */
export function drawGenerator(c: Ctx, time: number, o: GenLook) {
  const W = 78;
  const H = 54;
  const on = o.on;
  const vx = on ? Math.sin(time * 71) * 0.55 : 0;
  const vy = on ? Math.cos(time * 83) * 0.45 : 0;
  c.save();
  c.translate(vx, vy);
  // тень
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.beginPath();
  c.roundRect(-W / 2 + 3, -H / 2 + 5, W, H, 4);
  c.fill();
  // резиновые опоры
  c.fillStyle = '#16171a';
  for (const [fx, fy] of [[-W / 2 + 2, -H / 2 + 2], [W / 2 - 10, -H / 2 + 2], [-W / 2 + 2, H / 2 - 9], [W / 2 - 10, H / 2 - 9]]) {
    rr(c, fx, fy, 8, 7, 2);
    c.fill();
  }
  // труба рамы
  const frame = c.createLinearGradient(0, -H / 2, 0, H / 2);
  frame.addColorStop(0, '#e0693a');
  frame.addColorStop(0.5, '#b8451f');
  frame.addColorStop(1, '#6a2410');
  c.strokeStyle = '#1a0c06';
  c.lineWidth = 6.6;
  rr(c, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 6);
  c.stroke();
  c.strokeStyle = frame;
  c.lineWidth = 4.6;
  rr(c, -W / 2 + 3, -H / 2 + 3, W - 6, H - 6, 6);
  c.stroke();
  c.strokeStyle = 'rgba(255,230,200,0.4)';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-W / 2 + 10, -H / 2 + 1.8);
  c.lineTo(W / 2 - 10, -H / 2 + 1.8);
  c.stroke();
  // поперечина
  c.fillStyle = '#7a3016';
  c.fillRect(-1.5, -H / 2 + 4, 3, H - 8);

  // двигатель (левая часть): ребристый цилиндр + маховик
  const eg = c.createLinearGradient(0, -18, 0, 18);
  eg.addColorStop(0, '#5a6068');
  eg.addColorStop(0.5, '#383c42');
  eg.addColorStop(1, '#202226');
  c.fillStyle = eg;
  rr(c, -W / 2 + 7, -H / 2 + 8, 34, 28, 3);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.7)';
  c.lineWidth = 0.8;
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(-W / 2 + 10 + i * 5, -H / 2 + 10);
    c.lineTo(-W / 2 + 10 + i * 5, -H / 2 + 34);
    c.stroke();
  }
  // кожух стартера с ручкой
  const sx = -W / 2 + 15;
  const sy = H / 2 - 17;
  const sg = c.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 10);
  sg.addColorStop(0, '#d8dadc');
  sg.addColorStop(1, '#6a6e72');
  c.fillStyle = sg;
  c.beginPath();
  c.arc(sx, sy, 9, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#222';
  c.lineWidth = 0.8;
  c.stroke();
  c.save();
  c.translate(sx, sy);
  c.rotate(on ? time * 14 : 0);
  c.fillStyle = '#25272a';
  for (let i = 0; i < 3; i++) {
    c.rotate((Math.PI * 2) / 3);
    c.fillRect(2, -1.2, 6, 2.4);
  }
  c.restore();
  c.strokeStyle = '#c33a2a';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(sx - 8, sy + 6);
  c.quadraticCurveTo(sx - 13, sy + 11, sx - 15, sy + 14);
  c.stroke();
  rr(c, sx - 19, sy + 12, 8, 4, 1.4);
  c.fillStyle = '#d8b44a';
  c.fill();

  // топливный бак (правая часть)
  const tg = c.createLinearGradient(0, -H / 2 + 7, 0, H / 2 - 20);
  tg.addColorStop(0, '#d2402c');
  tg.addColorStop(0.45, '#a8281a');
  tg.addColorStop(1, '#5a140c');
  c.fillStyle = tg;
  rr(c, -W / 2 + 44, -H / 2 + 7, 28, 30, 6);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.7)';
  c.lineWidth = 0.9;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.28)';
  rr(c, -W / 2 + 47, -H / 2 + 9, 22, 3, 1.5);
  c.fill();
  // крышка бака
  c.fillStyle = '#d8b44a';
  c.beginPath();
  c.arc(-W / 2 + 54, -H / 2 + 20, 5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#3a2a08';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#6a5010';
  c.fillRect(-W / 2 + 51.5, -H / 2 + 19.4, 5, 1.2);
  // индикатор уровня
  c.fillStyle = '#10110f';
  rr(c, -W / 2 + 62, -H / 2 + 11, 6, 22, 2);
  c.fill();
  const fl = Math.max(0, Math.min(1, o.fuel));
  c.fillStyle = fl < 0.15 ? '#ff4a2a' : fl < 0.4 ? '#ffb02a' : '#ffd860';
  rr(c, -W / 2 + 62.8, -H / 2 + 11.8 + (1 - fl) * 20.4, 4.4, Math.max(0.5, fl * 20.4), 1.5);
  c.fill();
  // глушитель
  const mg = c.createLinearGradient(0, 0, 0, 10);
  mg.addColorStop(0, '#d6d9dc');
  mg.addColorStop(0.5, '#8a8e92');
  mg.addColorStop(1, '#3a3d40');
  c.fillStyle = mg;
  rr(c, W / 2 - 30, -H / 2 - 2, 26, 7, 3.5);
  c.fill();
  c.strokeStyle = '#1a1a1a';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = '#111';
  c.beginPath();
  c.ellipse(W / 2 - 5, -H / 2 + 1.5, 1.6, 3, 0, 0, Math.PI * 2);
  c.fill();
  if (on) {
    // нагрев выхлопа
    const hot = 0.4 + 0.2 * Math.sin(time * 9);
    c.fillStyle = `rgba(255,120,40,${hot * 0.35})`;
    rr(c, W / 2 - 30, -H / 2 - 2, 26, 7, 3.5);
    c.fill();
  }

  // панель управления
  c.fillStyle = '#17181b';
  rr(c, -W / 2 + 7, H / 2 - 13, W - 14, 8.5, 2);
  c.fill();
  c.strokeStyle = '#3a3d42';
  c.lineWidth = 0.7;
  c.stroke();
  for (const px of [W / 2 - 30, W / 2 - 19]) {
    c.fillStyle = '#0a0a0b';
    c.beginPath();
    c.arc(px, H / 2 - 8.8, 2.8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#c8cdd2';
    c.fillRect(px - 1.1, H / 2 - 9.6, 0.7, 1.4);
    c.fillRect(px + 0.5, H / 2 - 9.6, 0.7, 1.4);
  }
  // тумблер
  c.fillStyle = '#c8ccd0';
  c.fillRect(-W / 2 + 36, H / 2 - 11.4, 3, 5.4);
  c.fillStyle = on ? '#6ae07a' : '#e04a3a';
  c.fillRect(-W / 2 + 36, on ? H / 2 - 11.4 : H / 2 - 8, 3, 2.4);
  // светодиоды
  const pulse = on ? 0.6 + 0.4 * Math.sin(time * 10) : 0.25;
  c.fillStyle = on ? `rgba(110,240,130,${pulse})` : 'rgba(80,90,80,0.7)';
  c.beginPath();
  c.arc(-W / 2 + 46, H / 2 - 8.8, 1.8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = fl < 0.2 ? `rgba(255,70,50,${0.5 + 0.5 * Math.sin(time * 6)})` : 'rgba(90,50,46,0.8)';
  c.beginPath();
  c.arc(-W / 2 + 52, H / 2 - 8.8, 1.8, 0, Math.PI * 2);
  c.fill();
  // знак молнии
  c.fillStyle = '#ffd840';
  c.beginPath();
  c.moveTo(-W / 2 + 14, H / 2 - 12.2);
  c.lineTo(-W / 2 + 10.5, H / 2 - 8.4);
  c.lineTo(-W / 2 + 13, H / 2 - 8.4);
  c.lineTo(-W / 2 + 11.5, H / 2 - 5.4);
  c.lineTo(-W / 2 + 16, H / 2 - 9.4);
  c.lineTo(-W / 2 + 13.4, H / 2 - 9.4);
  c.closePath();
  c.fill();
  c.restore();
}

/** Дым, искры, свечение — рисуется поверх (в мировых координатах генератора) */
export function drawGeneratorFx(c: Ctx, time: number, o: GenLook, seed = 0) {
  const W = 78;
  const H = 54;
  if (o.on) {
    // дым из глушителя
    const ex = W / 2 - 5;
    const ey = -H / 2 + 1;
    for (let i = 0; i < 9; i++) {
      const ph = (time * 0.7 + i / 9 + seed * 0.13) % 1;
      const px = ex + ph * 18 + Math.sin(ph * 6 + i * 1.7) * 5;
      const py = ey - ph * 52;
      const r = 3 + ph * 11;
      const a = (1 - ph) * (o.sputter ? 0.55 : 0.32);
      c.fillStyle = `rgba(${o.sputter ? '40,36,34' : '120,122,126'},${a})`;
      c.beginPath();
      c.arc(px, py, r, 0, Math.PI * 2);
      c.fill();
    }
    // всполохи выхлопа
    if (Math.sin(time * 38 + seed) > 0.55) glow(c, ex + 2, ey - 1, 9, 'rgba(255,160,60,0.55)');
    // тепловое свечение двигателя
    glow(c, -W / 2 + 24, -H / 2 + 22, 34, `rgba(255,140,50,${0.16 + 0.05 * Math.sin(time * 12)})`);
    // дуговые искры у розеток
    const sp = Math.sin(time * 23 + seed * 3);
    if (sp > 0.82 || (o.spark ?? 0) > 0) {
      const sx = W / 2 - 25 + Math.sin(time * 91) * 5;
      const sy = H / 2 - 9;
      c.strokeStyle = 'rgba(190,230,255,0.95)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(sx, sy);
      for (let k = 0; k < 4; k++) c.lineTo(sx + (Math.random() - 0.5) * 16, sy + (k + 1) * 3.2 + Math.random() * 3);
      c.stroke();
      glow(c, sx, sy + 4, 16, 'rgba(120,200,255,0.55)');
    }
    // бегущие огоньки по раме
    for (let i = 0; i < 4; i++) {
      const ph = (time * 0.9 + i / 4) % 1;
      const per = (W - 6) * 2 + (H - 6) * 2;
      let d = ph * per;
      let x = -W / 2 + 3;
      let y = -H / 2 + 3;
      if (d < W - 6) x += d;
      else if ((d -= W - 6) < H - 6) {
        x = W / 2 - 3;
        y += d;
      } else if ((d -= H - 6) < W - 6) {
        x = W / 2 - 3 - d;
        y = H / 2 - 3;
      } else {
        d -= W - 6;
        y = H / 2 - 3 - d;
      }
      glow(c, x, y, 6, 'rgba(255,240,150,0.6)');
    }
    glow(c, 0, 0, 70, `rgba(255,200,110,${0.09 + 0.03 * Math.sin(time * 8)})`);
  } else if (o.fuel <= 0) {
    // пустой бак — лёгкий красный мигающий маячок
    glow(c, -W / 2 + 52, H / 2 - 8.8, 10, `rgba(255,60,40,${0.2 + 0.2 * Math.sin(time * 5)})`);
  }
}

/** Лампочка сверху (16×16) */
export function drawBulb(c: Ctx, time: number, lit: boolean, flick = 1) {
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(2, 3, 8, 6, 0, 0, Math.PI * 2);
  c.fill();
  // патрон
  c.fillStyle = '#3a3d42';
  c.beginPath();
  c.arc(0, 0, 7.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#17181a';
  c.lineWidth = 1;
  c.stroke();
  // колба
  const gg = c.createRadialGradient(-1.6, -1.8, 0.5, 0, 0, 6);
  if (lit) {
    gg.addColorStop(0, '#ffffff');
    gg.addColorStop(0.35, '#fff0b8');
    gg.addColorStop(1, '#ffc048');
  } else {
    gg.addColorStop(0, '#d8e0e4');
    gg.addColorStop(1, '#6a757a');
  }
  c.fillStyle = gg;
  c.beginPath();
  c.arc(0, 0, 5.6, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = lit ? 'rgba(255,200,90,0.9)' : 'rgba(30,40,44,0.7)';
  c.lineWidth = 0.7;
  c.stroke();
  // спираль
  c.strokeStyle = lit ? '#ff9a2a' : '#4a4f52';
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-3, 0.5);
  for (let i = 0; i < 4; i++) c.lineTo(-1.5 + i * 1.5, i % 2 ? 1.6 : -1.2);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.arc(-2.2, -2.4, 1.2, 0, Math.PI * 2);
  c.fill();
  if (lit) {
    glow(c, 0, 0, 36, `rgba(255,224,150,${0.5 * flick})`);
    c.strokeStyle = `rgba(255,240,180,${0.5 * flick})`;
    c.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.3;
      c.beginPath();
      c.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      c.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      c.stroke();
    }
  }
}

/** Электрическая лампа (абажур) сверху (22×22) */
export function drawElampTop(c: Ctx, _time: number, lit: boolean, flick = 1) {
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(2, 3, 10, 8, 0, 0, Math.PI * 2);
  c.fill();
  // абажур
  const sg = c.createRadialGradient(-2, -2, 1, 0, 0, 10);
  sg.addColorStop(0, lit ? '#f0d090' : '#8a8478');
  sg.addColorStop(1, lit ? '#a8742a' : '#3a3630');
  c.fillStyle = sg;
  c.beginPath();
  c.arc(0, 0, 9.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#1a1612';
  c.lineWidth = 1.1;
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 0.6;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.beginPath();
    c.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
    c.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
    c.stroke();
  }
  // лампа внутри
  c.fillStyle = lit ? '#fffbe4' : '#a8a89a';
  c.beginPath();
  c.arc(0, 0, 3.6, 0, Math.PI * 2);
  c.fill();
  if (lit) glow(c, 0, 0, 52, `rgba(255,232,170,${0.55 * flick})`);
}

/** Провод со слабым провисанием */
export function drawWire(c: Ctx, ax: number, ay: number, bx: number, by: number, powered: boolean, time: number, sagK = 0.14) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const sag = Math.min(34, dist * sagK + 6);
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2 + sag;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(ax + 1.5, ay + 3);
  c.quadraticCurveTo(mx + 1.5, my + 3, bx + 1.5, by + 3);
  c.stroke();
  c.strokeStyle = '#141416';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo(mx, my, bx, by);
  c.stroke();
  c.strokeStyle = powered ? '#7a5a2a' : '#4a4d52';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo(mx, my, bx, by);
  c.stroke();
  // хомутики
  for (const t of [0.33, 0.66]) {
    const u = 1 - t;
    const px = u * u * ax + 2 * u * t * mx + t * t * bx;
    const py = u * u * ay + 2 * u * t * my + t * t * by;
    c.fillStyle = '#9aa0a6';
    c.beginPath();
    c.arc(px, py, 1.6, 0, Math.PI * 2);
    c.fill();
  }
  // вилки на концах
  for (const [px, py] of [[ax, ay], [bx, by]]) {
    c.fillStyle = '#c8ccd0';
    c.beginPath();
    c.arc(px, py, 2.4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#222';
    c.lineWidth = 0.7;
    c.stroke();
  }
  if (powered) {
    for (let k = 0; k < 4; k++) {
      const t = (time * 0.8 + k / 4) % 1;
      const u = 1 - t;
      const px = u * u * ax + 2 * u * t * mx + t * t * bx;
      const py = u * u * ay + 2 * u * t * my + t * t * by;
      glow(c, px, py, 7, 'rgba(255,230,120,0.8)');
    }
  }
  c.restore();
}

export const GEN_FUEL_PER_CAN = GEN_CAN;
export const WIRE_LABEL = FURN.bulb.name;
