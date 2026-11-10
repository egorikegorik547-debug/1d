import type { Ctx } from './art';
import type { Game } from './engine';
import { CENTER, SAFE_RADIUS, WORLD } from './world';
import { FRAME_ORDER, RES, RES_ORDER, type FrameId, type ResId } from './items';
import { AMMO, WEAPONS, ALL_ORDER, type AmmoType } from './weapons';
import { sfx } from './audio';

export type CrateKind = 'wood' | 'metal' | 'medical' | 'military' | 'tools' | 'ammo' | 'fuel' | 'suitcase' | 'electronics' | 'chemical' | 'cooler';

export interface LootCrate {
  id: number;
  x: number;
  y: number;
  kind: CrateKind;
  opened: boolean;
  prog: number;
  rot: number;
}

export const CRATE_NAMES: Record<CrateKind, string> = {
  wood: 'Деревянный ящик',
  metal: 'Металлический сейф',
  medical: 'Медицинский ящик',
  military: 'Армейский ящик',
  tools: 'Ящик с инструментами',
  ammo: 'Патронный цинк',
  fuel: 'Бочка с бензином',
  suitcase: 'Старый чемодан',
  electronics: 'Ящик с электроникой',
  chemical: 'Контейнер с химикатами',
  cooler: 'Походный термобокс',
};

/** Таблица шансов для ночных ящиков (разнообразие вылазок) */
export const NIGHT_CRATE_POOL: CrateKind[] = [
  'wood', 'wood', 'wood', 'metal', 'metal', 'medical', 'military', 'tools', 'tools',
  'ammo', 'ammo', 'fuel', 'fuel', 'suitcase', 'electronics', 'chemical', 'cooler',
];

const OPEN_TIME = 1.2;

const ri = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));

/** Ночь: расставляем зомби по городу и ящики с ресурсами. */
export function spawnExpedition(g: Game) {
  g.crates = [];
  const spots = g.world.lootSpots.filter((s) => Math.hypot(s.x - CENTER.x, s.y - CENTER.y) > SAFE_RADIUS + 220);
  // перемешиваем
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const kinds = NIGHT_CRATE_POOL;
  const n = Math.min(spots.length, 22 + Math.min(10, g.day * 2));
  for (let i = 0; i < n; i++) {
    const s = spots[i];
    g.crates.push({ id: g.nextId++, x: s.x, y: s.y, kind: kinds[Math.floor(Math.random() * kinds.length)], opened: false, prog: 0, rot: (Math.random() - 0.5) * 0.8 });
  }
  // лагеря бандитов у костров: ящик с армейским грузом и охрана
  for (const c of g.world.camps) {
    g.crates.push({ id: g.nextId++, x: c.x + 30, y: c.y + 14, kind: 'military', opened: false, prog: 0, rot: 0.3 });
    if (Math.random() < 0.5) g.crates.push({ id: g.nextId++, x: c.x - 32, y: c.y - 20, kind: Math.random() < 0.5 ? 'metal' : 'tools', opened: false, prog: 0, rot: -0.4 });
    const n = 2 + (g.day >= 3 ? 1 : 0) + (Math.random() < 0.4 ? 1 : 0) + (g.day >= 6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * 6.283;
        const d = 58 + Math.random() * 46;
        const x = c.x + Math.cos(a) * d;
        const y = c.y + Math.sin(a) * d;
        if (g.world.grid.circleBlocked(x, y, 24)) continue;
        const e = g.spawnOne('bandit', x, y, true);
        e.wander = true;
        e.home = { x: c.x, y: c.y };
        e.wa = a + Math.PI;
        break;
      }
    }
  }
  // зомби — бродят, пока не заметят игрока
  const count = Math.min(30, 9 + g.day * 2);
  let placed = 0;
  for (let k = 0; k < count * 12 && placed < count; k++) {
    const x = 90 + Math.random() * (WORLD - 180);
    const y = 90 + Math.random() * (WORLD - 180);
    if (Math.hypot(x - CENTER.x, y - CENTER.y) < SAFE_RADIUS + 420) continue;
    if (g.world.grid.circleBlocked(x, y, 28)) continue;
    const type = g.rollType();
    const e = g.spawnOne(type, x, y, true);
    e.wander = true;
    e.wa = Math.random() * 6.28;
    placed++;
  }
}

export function clearExpedition(g: Game) {
  g.crates = [];
  g.enemies = g.enemies.filter(() => false);
  g.bullets = [];
  g.bossRef = null;
}

export function nearestCrate(g: Game): LootCrate | null {
  const p = g.player;
  let best: LootCrate | null = null;
  let bd = 58;
  for (const c of g.crates) {
    if (c.opened) continue;
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

function foundGenerator(g: Game, c: LootCrate) {
  g.genStock++;
  g.toast('НАХОДКА: бензиновый генератор! Ставьте его в подвале (B)', 'good');
  sfx.crateOpen();
  for (let i = 0; i < 10; i++) g.addParticle({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180, life: 0.6, max: 0.6, size: 2.2, color: '#ffd860', kind: 'spark', rot: 0 });
}

function openCrate(g: Game, c: LootCrate) {
  c.opened = true;
  const gain: Partial<Record<ResId, number>> = {};
  const add = (r: ResId, a: number, b: number) => {
    const n = ri(a, b);
    if (n > 0) gain[r] = (gain[r] ?? 0) + n;
  };
  const bonus = Math.min(3, Math.floor(g.day / 2));
  switch (c.kind) {
    case 'wood':
      add('wood', 2 + bonus, 5 + bonus);
      add('cloth', 0, 2);
      add('scrap', 0, 1);
      break;
    case 'metal':
      add('scrap', 3, 7 + bonus);
      add('parts', 0, 2);
      add('powder', 0, 1);
      if (Math.random() < 0.03) foundGenerator(g, c);
      break;
    case 'medical':
      add('cloth', 2, 4);
      add('parts', 0, 1);
      if (Math.random() < 0.65) g.pickups.push({ x: c.x + 14, y: c.y + 6, kind: 'medkit', amount: 40, life: 90 });
      break;
    case 'military':
      add('powder', 2, 5 + bonus);
      add('scrap', 1, 3);
      add('parts', 0, 1);
      {
        // основа оружия: главная добыча армейских ящиков
        const table: [FrameId, number][] = [['f_pistol', 20], ['f_smg', 20], ['f_shotgun', 18], ['f_rifle', 16], ['f_sniper', 13], ['f_mg', 13]];
        let q = Math.random() * 100;
        let pick: FrameId = 'f_pistol';
        for (const [id, w] of table) {
          q -= w;
          if (q <= 0) {
            pick = id;
            break;
          }
        }
        gain[pick] = (gain[pick] ?? 0) + 1;
      }
      {
        const types = (Object.keys(AMMO) as AmmoType[]).filter((t) => AMMO[t].price > 0);
        const t = types[Math.floor(Math.random() * types.length)];
        g.pickups.push({ x: c.x - 14, y: c.y + 6, kind: 'ammo', ammo: t, amount: Math.ceil(AMMO[t].pack * 0.8), life: 90 });
      }
      break;
    case 'tools':
      add('parts', 1, 3 + bonus);
      add('scrap', 2, 4);
      add('gas', 0, 1);
      if (Math.random() < 0.04) foundGenerator(g, c);
      break;
    case 'ammo': {
      add('powder', 1, 3);
      const owned = (Object.keys(AMMO) as AmmoType[]).filter((t) => AMMO[t].price > 0 && ALL_ORDER.some((w) => g.owned[w] && WEAPONS[w].ammo === t));
      const pool = owned.length ? owned : (['9mm', '545'] as AmmoType[]);
      for (let k = 0; k < 2; k++) {
        const t = pool[Math.floor(Math.random() * pool.length)];
        g.pickups.push({ x: c.x - 16 + k * 22, y: c.y + 8, kind: 'ammo', ammo: t, amount: Math.ceil(AMMO[t].pack * (0.9 + Math.random() * 0.8)), life: 90 });
      }
      break;
    }
    case 'fuel':
      add('gas', 1, 3);
      add('powder', 0, 1);
      add('scrap', 0, 1);
      break;
    case 'suitcase':
      add('cloth', 1, 3);
      add('parts', 0, 1);
      for (let k = 0; k < 3; k++) g.pickups.push({ x: c.x - 14 + k * 14, y: c.y + 8, kind: 'cash', amount: (ri(40, 110) * (1 + g.day * 0.15)) | 0, life: 90 });
      if (Math.random() < 0.12) gain[FRAME_ORDER[Math.floor(Math.random() * 3)]] = 1;
      break;
    case 'electronics':
      add('parts', 2, 4 + bonus);
      add('scrap', 1, 2);
      if (Math.random() < 0.08) foundGenerator(g, c);
      break;
    case 'chemical':
      add('powder', 3, 6 + bonus);
      add('gas', 0, 1);
      add('cloth', 0, 1);
      break;
    case 'cooler':
      add('cloth', 1, 2);
      if (Math.random() < 0.85) g.pickups.push({ x: c.x + 14, y: c.y + 6, kind: 'medkit', amount: 45, life: 90 });
      if (Math.random() < 0.5 && g.bandages < 12) {
        g.bandages = Math.min(12, g.bandages + 2);
        g.toast('Найдены бинты ×2', 'good');
      }
      break;
  }
  if (Math.random() < 0.45) g.pickups.push({ x: c.x + 2, y: c.y - 14, kind: 'cash', amount: ri(25, 90) * (1 + g.day * 0.15) | 0, life: 90 });
  // шанс редкого ресурса в любом ящике
  if (Math.random() < 0.3) add(RES_ORDER[Math.floor(Math.random() * RES_ORDER.length)], 1, 2);
  const parts: string[] = [];
  for (const r of [...RES_ORDER, ...FRAME_ORDER]) {
    const n = gain[r];
    if (n) {
      g.res[r] += n;
      parts.push(r.startsWith('f_') ? `${RES[r].name} ×${n}` : `${RES[r].icon}${n}`);
    }
  }
  g.toast(`${CRATE_NAMES[c.kind]}: ${parts.join(' ') || 'пусто'}`, 'good');
  sfx.pickup();
  for (let i = 0; i < 8; i++) g.addParticle({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.5, max: 0.5, size: 2, color: '#e8c070', kind: 'spark', rot: 0 });
  // шум привлекает зомби поблизости
  g.alertEnemies(c.x, c.y, 330);
}

/** Удержание E рядом с ящиком */
export function updateCrates(g: Game, dt: number) {
  const near = nearestCrate(g);
  for (const c of g.crates) {
    if (c !== near && c.prog > 0) c.prog = Math.max(0, c.prog - dt * 2);
  }
  if (!near) return;
  if (g.keys.has('KeyE') && !g.shopOpen && !g.craftOpen) {
    near.prog += dt / OPEN_TIME;
    if (Math.random() < dt * 12) sfx.clang();
    if (near.prog >= 1) openCrate(g, near);
  } else near.prog = Math.max(0, near.prog - dt * 2);
}

const COLORS: Record<CrateKind, [string, string, string]> = {
  wood: ['#8a6234', '#6a4a26', '#a47a44'],
  metal: ['#5a6068', '#3e4348', '#7e858d'],
  medical: ['#d8d6cc', '#a8a69c', '#f0eee6'],
  military: ['#59603f', '#3f452c', '#7a8258'],
  tools: ['#a8392a', '#7a281e', '#d06a52'],
  ammo: ['#5b6240', '#3c4128', '#8a9460'],
  fuel: ['#b8382a', '#7a2218', '#e0654e'],
  suitcase: ['#7a4a2a', '#4e2e18', '#a8703e'],
  electronics: ['#3f5566', '#27384a', '#6a8ea6'],
  chemical: ['#a8a238', '#6e6a1e', '#d8d268'],
  cooler: ['#e8eef0', '#9cb0b8', '#4a8ac0'],
};

export function drawCrates(g: Game, ctx: Ctx, inView: (x: number, y: number) => boolean) {
  for (const c of g.crates) {
    if (!inView(c.x, c.y)) continue;
    const [base, dark, light] = COLORS[c.kind];
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    if (!c.opened) {
      const pulse = 0.14 + 0.1 * Math.sin(g.time * 3 + c.id);
      ctx.fillStyle = `rgba(255,220,130,${pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fill();
    }
    if (drawSpecialCrate(ctx, c, g.time)) {
      ctx.restore();
      drawProgress(ctx, c);
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(-14, -9, 30, 22);
    ctx.fillStyle = c.opened ? dark : base;
    ctx.fillRect(-15, -11, 30, 22);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-15, -11, 30, 22);
    ctx.fillStyle = c.opened ? 'rgba(0,0,0,0.35)' : light;
    ctx.fillRect(-13, -9, 26, 3);
    if (c.kind === 'wood') {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      for (let i = -9; i <= 9; i += 6) {
        ctx.beginPath();
        ctx.moveTo(-15, i);
        ctx.lineTo(15, i);
        ctx.stroke();
      }
      ctx.fillStyle = '#4a4d50';
      ctx.fillRect(-15, -11, 4, 22);
      ctx.fillRect(11, -11, 4, 22);
    } else if (c.kind === 'metal') {
      ctx.fillStyle = '#2a2d31';
      ctx.fillRect(-11, -3, 22, 6);
      ctx.fillStyle = '#d8b44a';
      ctx.fillRect(-2, -2, 4, 4);
    } else if (c.kind === 'medical') {
      ctx.fillStyle = '#b0302c';
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillRect(-7, -2, 14, 4);
    } else if (c.kind === 'military') {
      ctx.fillStyle = '#d8d070';
      ctx.fillRect(-9, -2, 18, 2);
      ctx.fillRect(-9, 2, 12, 1.5);
      ctx.fillStyle = '#2a2d1f';
      ctx.fillRect(-15, -11, 3, 22);
      ctx.fillRect(12, -11, 3, 22);
    } else {
      ctx.fillStyle = '#d8d6cc';
      ctx.fillRect(-4, -14, 8, 4);
      ctx.fillStyle = '#2a2d31';
      ctx.fillRect(-11, -1, 22, 2);
    }
    ctx.restore();
    drawProgress(ctx, c);
  }
}

function drawProgress(ctx: Ctx, c: LootCrate) {
  if (c.prog > 0 && !c.opened) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(c.x - 20, c.y - 26, 40, 5);
    ctx.fillStyle = '#e8b84a';
    ctx.fillRect(c.x - 19, c.y - 25, 38 * Math.min(1, c.prog), 3);
  }
}

const shadeHex = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  if (k >= 0) {
    r += (255 - r) * k;
    gg += (255 - gg) * k;
    b += (255 - b) * k;
  } else {
    r *= 1 + k;
    gg *= 1 + k;
    b *= 1 + k;
  }
  return `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;
};

/** Новые виды ящиков: свои силуэты. Возвращает true, если нарисовано */
function drawSpecialCrate(ctx: Ctx, c: LootCrate, time: number): boolean {
  const [base, dark, light] = COLORS[c.kind];
  const open = c.opened;
  switch (c.kind) {
    case 'ammo': {
      // патронный цинк с ручкой и трафаретом
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-14, -7, 30, 20);
      const g = ctx.createLinearGradient(0, -11, 0, 10);
      g.addColorStop(0, shadeHex(open ? dark : base, 0.25));
      g.addColorStop(1, shadeHex(open ? dark : base, -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-15, -10, 30, 20, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-12, -7, 24, 1.2);
      ctx.fillRect(-12, 5, 24, 1.2);
      // ручка
      ctx.strokeStyle = '#26282a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.quadraticCurveTo(0, -17, 6, -10);
      ctx.stroke();
      // замок и трафарет
      ctx.fillStyle = '#b4b8bc';
      ctx.fillRect(-2.5, -11, 5, 4);
      ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#e0cc6a';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-9 + i * 5, -3, 2.2, 7);
        ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#b88a3a';
        ctx.fillRect(-9 + i * 5, -4.6, 2.2, 1.8);
        ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#e0cc6a';
      }
      ctx.fillStyle = light;
      ctx.fillRect(-14, -9, 28, 1.4);
      return true;
    }
    case 'fuel': {
      // бочка сверху: круг с рёбрами и пробками
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(2, 3, 14, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      const rg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
      rg.addColorStop(0, light);
      rg.addColorStop(0.6, open ? dark : base);
      rg.addColorStop(1, shadeHex(dark, -0.4));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d8b44a';
      ctx.beginPath();
      ctx.arc(-4.5, -3, 2.4, 0, Math.PI * 2);
      ctx.arc(5, 4, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2a08';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      // значок пламени
      ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#ffe9a8';
      ctx.beginPath();
      ctx.moveTo(3, -7);
      ctx.quadraticCurveTo(7, -2, 4, 1);
      ctx.quadraticCurveTo(3, -1, 1.6, 0);
      ctx.quadraticCurveTo(0, -3, 3, -7);
      ctx.fill();
      if (!open) {
        // испарения
        for (let i = 0; i < 3; i++) {
          const ph = (time * 0.6 + i / 3 + c.id * 0.17) % 1;
          ctx.fillStyle = `rgba(255,220,140,${0.16 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(-4 + Math.sin(ph * 6 + i) * 4, -6 - ph * 16, 2 + ph * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }
    case 'suitcase': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-14, -7, 30, 21);
      const g = ctx.createLinearGradient(0, -11, 0, 11);
      g.addColorStop(0, shadeHex(open ? dark : base, 0.3));
      g.addColorStop(1, shadeHex(open ? dark : base, -0.4));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-16, -11, 32, 22, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,4,0.8)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // ремни и золотые замки
      ctx.fillStyle = shadeHex(dark, -0.2);
      ctx.fillRect(-9, -11, 3.4, 22);
      ctx.fillRect(5.6, -11, 3.4, 22);
      ctx.fillStyle = '#d8b44a';
      ctx.fillRect(-9.6, -2, 4.6, 4);
      ctx.fillRect(5, -2, 4.6, 4);
      // ручка
      ctx.strokeStyle = '#2a1a0c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-5, -11);
      ctx.lineTo(-5, -14);
      ctx.lineTo(5, -14);
      ctx.lineTo(5, -11);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-14, -10, 28, 2);
      // потёртости
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(10, 4, 4, 3);
      ctx.fillRect(-14, 6, 3, 3);
      return true;
    }
    case 'electronics': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-14, -8, 30, 22);
      const g = ctx.createLinearGradient(0, -11, 0, 11);
      g.addColorStop(0, shadeHex(open ? dark : base, 0.3));
      g.addColorStop(1, shadeHex(open ? dark : base, -0.4));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-15, -11, 30, 22, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // вентиляционная решётка
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-12, -8 + i * 2.6, 12, 1.2);
      // светодиоды
      const blink = Math.sin(time * 4 + c.id) > 0;
      const leds: [number, string][] = [[5, '#7aff8a'], [9, blink ? '#ffcf5a' : '#6a5a2a'], [13, blink ? '#3a5a3a' : '#ff5a4a']];
      for (const [lx, col] of leds) {
        ctx.fillStyle = open ? '#333' : col;
        ctx.beginPath();
        ctx.arc(lx - 14 + 14, -6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // молния
      ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#ffd840';
      ctx.beginPath();
      ctx.moveTo(2, -2);
      ctx.lineTo(-3, 4);
      ctx.lineTo(0, 4);
      ctx.lineTo(-2, 9);
      ctx.lineTo(5, 2);
      ctx.lineTo(2, 2);
      ctx.closePath();
      ctx.fill();
      // торчащие провода
      ctx.strokeStyle = '#d04a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, 10);
      ctx.quadraticCurveTo(18, 12, 17, 16);
      ctx.stroke();
      ctx.strokeStyle = '#3a8ad0';
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.quadraticCurveTo(14, 15, 11, 18);
      ctx.stroke();
      if (!open && Math.sin(time * 19 + c.id * 3) > 0.94) {
        ctx.strokeStyle = 'rgba(180,230,255,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(12, 18);
        ctx.lineTo(15, 16);
        ctx.lineTo(13, 14);
        ctx.stroke();
      }
      return true;
    }
    case 'chemical': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-14, -7, 30, 21);
      ctx.fillStyle = open ? dark : base;
      ctx.fillRect(-15, -11, 30, 22);
      // чёрно-жёлтая предупреждающая полоса
      ctx.save();
      ctx.beginPath();
      ctx.rect(-15, 5, 30, 6);
      ctx.clip();
      ctx.fillStyle = '#1c1c18';
      ctx.fillRect(-15, 5, 30, 6);
      ctx.fillStyle = '#e8d048';
      for (let x = -22; x < 18; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 11);
        ctx.lineTo(x + 4, 11);
        ctx.lineTo(x + 10, 5);
        ctx.lineTo(x + 6, 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-15, -11, 30, 22);
      // знак опасности
      ctx.fillStyle = '#1c1c18';
      ctx.beginPath();
      ctx.arc(0, -3, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d048';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos((i * Math.PI * 2) / 3 - 1.57) * 2.6, -3 + Math.sin((i * Math.PI * 2) / 3 - 1.57) * 2.6, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = light;
      ctx.fillRect(-13, -10, 26, 1.6);
      if (!open) {
        for (let i = 0; i < 2; i++) {
          const ph = (time * 0.5 + i / 2 + c.id * 0.11) % 1;
          ctx.fillStyle = `rgba(190,230,90,${0.2 * (1 - ph)})`;
          ctx.beginPath();
          ctx.arc(8 + Math.sin(ph * 5 + i) * 3, -10 - ph * 14, 2 + ph * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return true;
    }
    case 'cooler': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-14, -7, 30, 21);
      ctx.fillStyle = open ? dark : base;
      ctx.beginPath();
      ctx.roundRect(-15, -11, 30, 22, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      // голубая крышка и ручка
      ctx.fillStyle = open ? shadeHex(light, -0.4) : light;
      ctx.beginPath();
      ctx.roundRect(-13, -9, 26, 11, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-11, -8, 22, 2);
      ctx.fillStyle = '#2a3a46';
      ctx.fillRect(-7, 5, 14, 3.4);
      // красный крест
      ctx.fillStyle = open ? 'rgba(0,0,0,0.3)' : '#d03a30';
      ctx.fillRect(-1.6, -7, 3.2, 7);
      ctx.fillRect(-3.8, -5.2, 7.6, 3.2);
      return true;
    }
    default:
      return false;
  }
}

export function drawResPickup(ctx: Ctx, res: ResId, t: number) {
  const pulse = 0.18 + 0.1 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(230,225,190,${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-7, -4, 16, 11);
  switch (res) {
    case 'scrap':
      ctx.fillStyle = '#8a9096';
      ctx.fillRect(-7, -5, 9, 6);
      ctx.fillStyle = '#6a6f74';
      ctx.fillRect(-2, 0, 9, 5);
      ctx.fillStyle = '#b0b6bc';
      ctx.fillRect(-7, -5, 9, 1.5);
      break;
    case 'wood':
      ctx.fillStyle = '#9a6e3a';
      ctx.fillRect(-8, -5, 16, 4);
      ctx.fillStyle = '#7a5428';
      ctx.fillRect(-8, 0, 16, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-3, -5, 1, 9);
      break;
    case 'cloth':
      ctx.fillStyle = '#c9b8a0';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 5.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a7a64';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, -1);
      ctx.quadraticCurveTo(0, 3, 5, -1);
      ctx.stroke();
      break;
    case 'powder':
      ctx.fillStyle = '#5f6234';
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = '#d8a548';
      ctx.fillRect(-4, -3, 8, 3);
      ctx.fillStyle = '#2a2c18';
      ctx.fillRect(-6, 2, 12, 3);
      break;
    case 'f_pistol':
    case 'f_smg':
    case 'f_shotgun':
    case 'f_rifle':
    case 'f_sniper':
    case 'f_mg': {
      const len = res === 'f_pistol' ? 9 : res === 'f_smg' ? 11 : res === 'f_mg' ? 15 : 13;
      ctx.fillStyle = '#3a3d40';
      ctx.fillRect(-len, -3, len * 2, 6);
      ctx.fillStyle = '#6a6e72';
      ctx.fillRect(-len, -3, len * 2, 1.6);
      ctx.fillStyle = '#e0b060';
      ctx.fillRect(-2, -5, 4, 10);
      if (res !== 'f_pistol') {
        ctx.fillStyle = '#2a2c2e';
        ctx.fillRect(-len * 0.2, 3, 4, 5);
      }
      break;
    }
    default:
      ctx.fillStyle = '#1f6a4a';
      ctx.fillRect(-7, -5, 14, 10);
      ctx.fillStyle = '#6fd0e8';
      ctx.fillRect(-4, -2, 3, 3);
      ctx.fillRect(1, -2, 3, 3);
      ctx.fillStyle = '#d8b44a';
      ctx.fillRect(-7, 5, 14, 1.5);
  }
}
