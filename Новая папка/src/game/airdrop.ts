import type { Game } from './engine';
import type { Ctx } from './art';
import { AMMO, ARMOR_MAX, SPECIAL_ORDER, WEAPONS, type WeaponId } from './weapons';
import { CENTER, SAFE_RADIUS, WORLD } from './world';
import { sfx } from './audio';
import { markFound } from './records';
import { settings, QUALITY_MUL } from './settings';
import type { EnemyType } from './enemies';

export interface FlareShot {
  x0: number;
  y0: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
}

export interface Drop {
  id: number;
  x: number;
  y: number;
  t: number;
  landed: boolean;
  open: number;
  life: number;
  dir: number;
  sway: number;
  smokeT: number;
  tickT: number;
  spawned: boolean;
}

const PLANE_SPEED = 640;
export const DROP_AT = 4.6;
export const FALL_TIME = 4.2;
const OPEN_TIME = 1.4;
const CRATE_LIFE = 110;
const OPEN_RANGE = 62;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* Сигнал                                                              */
/* ------------------------------------------------------------------ */
function findFree(g: Game, x: number, y: number): { x: number; y: number } {
  for (let r = 0; r <= 200; r += 28) {
    const n = r === 0 ? 1 : Math.round(r / 12);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (px < 140 || py < 140 || px > WORLD - 140 || py > WORLD - 140) continue;
      if (Math.hypot(px - CENTER.x, py - CENTER.y) < SAFE_RADIUS + 70) continue;
      if (Math.hypot(px - CENTER.x, py - CENTER.y) > g.cityR - 90) continue;
      if (g.world.grid.circleBlocked(px, py, 44)) continue;
      if (g.world.buildings.some((b) => px > b.rect.x - 50 && px < b.rect.x + b.rect.w + 50 && py > b.rect.y - 50 && py < b.rect.y + b.rect.h + 50)) continue;
      return { x: px, y: py };
    }
  }
  return { x, y };
}

export function fireFlare(g: Game) {
  const p = g.player;
  const wx = g.mouse.x + g.camTop.x;
  const wy = g.mouse.y + g.camTop.y;
  let dx = wx - p.x;
  let dy = wy - p.y;
  let d = Math.hypot(dx, dy);
  if (d < 1) {
    dx = Math.cos(p.angle);
    dy = Math.sin(p.angle);
    d = 1;
  }
  const dist = clamp(d, 180, 560);
  const tx = p.x + (dx / d) * dist;
  const ty = p.y + (dy / d) * dist;
  const spot = findFree(g, tx, ty);
  g.flareShots.push({ x0: p.x, y0: p.y, x: p.x, y: p.y, tx: spot.x, ty: spot.y, t: 0, dur: Math.max(0.6, Math.hypot(spot.x - p.x, spot.y - p.y) / 480) });
  g.flares--;
  g.flareCd = 1.2;
  p.flash = 0.08;
  g.shake = Math.max(g.shake, 2);
  sfx.flare();
  g.toast('Сигнальная ракета выпущена', 'info');
}

/* ------------------------------------------------------------------ */
/* Обновление                                                          */
/* ------------------------------------------------------------------ */
export function updateAirdrop(g: Game, dt: number) {
  const p = g.player;
  if (g.flareCd > 0) g.flareCd -= dt;
  const qm = QUALITY_MUL[settings.particles];

  for (const f of g.flareShots) {
    f.t += dt;
    const k = Math.min(1, f.t / f.dur);
    f.x = f.x0 + (f.tx - f.x0) * k;
    f.y = f.y0 + (f.ty - f.y0) * k;
    if (Math.random() < 0.8) {
      g.addParticle({ x: f.x, y: f.y - Math.sin(k * Math.PI) * 50, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.6, max: 0.6, size: 3, color: 'rgba(240,90,70,', kind: 'smoke', rot: 0 });
      g.addParticle({ x: f.x, y: f.y - Math.sin(k * Math.PI) * 50, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.3, max: 0.3, size: 2, color: '#ffc070', kind: 'spark', rot: 0 });
    }
    if (k >= 1) {
      g.drops.push({
        id: g.nextId++, x: f.tx, y: f.ty, t: 0, landed: false, open: 0, life: CRATE_LIFE, dir: Math.random() * Math.PI * 2,
        sway: Math.random() * 6, smokeT: 0, tickT: 0, spawned: false,
      });
      sfx.plane();
      g.toast('Сигнал принят! Самолёт на подходе…', 'good');
      g.banner = { title: 'Сигнал принят', sub: 'Груз будет сброшен через несколько секунд' };
      g.bannerT = 3;
    }
  }
  g.flareShots = g.flareShots.filter((f) => f.t < f.dur);

  for (const d of g.drops) {
    d.t += dt;
    d.smokeT -= dt;
    if (d.smokeT <= 0) {
      d.smokeT = (d.landed ? 0.14 : 0.07) / Math.max(0.3, qm);
      g.addParticle({
        x: d.x + (Math.random() - 0.5) * 6, y: d.y + (Math.random() - 0.5) * 6, vx: 12 + Math.random() * 14, vy: -34 - Math.random() * 20,
        life: 2.4, max: 2.4, size: 5, color: d.landed ? 'rgba(255,170,60,' : 'rgba(235,70,50,', kind: 'smoke', rot: 0,
      });
    }
    if (!d.landed && d.t >= DROP_AT + FALL_TIME) {
      d.landed = true;
      d.life = CRATE_LIFE;
      sfx.crateLand();
      g.shake = Math.max(g.shake, Math.hypot(p.x - d.x, p.y - d.y) < 700 ? 6 : 0);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * 6.283;
        g.addParticle({ x: d.x, y: d.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.8, max: 0.8, size: 6, color: 'rgba(160,150,130,', kind: 'dust', rot: 0 });
      }
      g.toast('Груз приземлился! Подойдите и удерживайте [E]', 'good');
      if (!d.spawned && g.wave > 0) {
        d.spawned = true;
        const pool: EnemyType[] = ['walker', 'walker', 'runner', 'crawler'];
        let n = 0;
        for (let k = 0; k < 20 && n < 4; k++) {
          const a = Math.random() * 6.283;
          const r = 260 + Math.random() * 120;
          const x = d.x + Math.cos(a) * r;
          const y = d.y + Math.sin(a) * r;
          if (x < 80 || y < 80 || x > WORLD - 80 || y > WORLD - 80) continue;
          if (g.world.grid.circleBlocked(x, y, 26) || Math.hypot(x - CENTER.x, y - CENTER.y) < SAFE_RADIUS + 40) continue;
          g.spawnOne(pool[n % pool.length], x, y, true);
          n++;
        }
        if (n > 0) g.toast('Шум привлёк зомби!', 'bad');
      }
    }
    if (d.landed) {
      d.life -= dt;
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist < OPEN_RANGE && g.keys.has('KeyE') && !g.shopOpen) {
        d.open += dt / OPEN_TIME;
        d.tickT -= dt;
        if (d.tickT <= 0) {
          d.tickT = 0.22;
          sfx.tick();
        }
        if (d.open >= 1) {
          openCrate(g, d);
          d.life = -1;
        }
      } else d.open = Math.max(0, d.open - dt * 2);
    }
  }
  g.drops = g.drops.filter((d) => {
    if (d.landed && d.life <= 0 && d.open < 1 && d.life > -0.5) {
      g.toast('Груз потерян — вы не успели его забрать', 'bad');
    }
    return d.life > 0;
  });
}

function openCrate(g: Game, d: Drop) {
  const p = g.player;
  const pool = SPECIAL_ORDER.filter((id) => !g.owned[id]);
  const id: WeaponId = pool.length ? pool[Math.floor(Math.random() * pool.length)] : SPECIAL_ORDER[Math.floor(Math.random() * SPECIAL_ORDER.length)];
  const w = WEAPONS[id];
  const had = !!g.owned[id];
  g.owned[id] = { mag: w.mag };
  g.reserve[w.ammo] = Math.min(AMMO[w.ammo].cap, g.reserve[w.ammo] + w.dropAmmo);
  // бонусы из ящика
  p.armor = ARMOR_MAX;
  p.hp = Math.min(p.maxHp, p.hp + 40);
  g.money += 250;
  for (const k of Object.keys(g.owned) as WeaponId[]) {
    const a = WEAPONS[k].ammo;
    if (a === 'nuke' || AMMO[a].price === 0) continue;
    g.reserve[a] = Math.min(AMMO[a].cap, g.reserve[a] + AMMO[a].pack);
  }
  g.switchWeapon(id, true);
  markFound(id);
  g.banner = { title: had ? 'Боезапас пополнен' : 'Особое оружие!', sub: w.name };
  g.bannerT = 5;
  g.toast(`${w.name}: ${w.perk}`, 'good');
  g.toast('+250 ₽ · броня · аптечка · патроны', 'good');
  sfx.crateOpen();
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * 6.283;
    const s = 80 + Math.random() * 220;
    g.addParticle({ x: d.x, y: d.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.8, max: 0.8, size: 2 + Math.random() * 2.5, color: i % 2 ? '#ffe070' : '#ffffff', kind: 'spark', rot: 0 });
  }
  g.rings.push({ x: d.x, y: d.y, max: 120, t: 0, dur: 0.6, color: 'frost' });
}

export interface AirdropInfo {
  incoming: number | null;
  crate: { near: boolean; progress: number } | null;
}

export function airdropInfo(g: Game): AirdropInfo {
  const p = g.player;
  let incoming: number | null = null;
  let crate: AirdropInfo['crate'] = null;
  let best = Infinity;
  for (const d of g.drops) {
    if (!d.landed) {
      const left = DROP_AT + FALL_TIME - d.t;
      if (incoming === null || left < incoming) incoming = left;
    } else {
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist < best) {
        best = dist;
        crate = { near: dist < OPEN_RANGE, progress: d.open };
      }
    }
  }
  return { incoming: incoming === null ? null : Math.max(0, Math.ceil(incoming)), crate };
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
type InView = (x: number, y: number) => boolean;

function drawCrate(ctx: Ctx, time: number) {
  ctx.fillStyle = '#4a5630';
  ctx.strokeStyle = '#1a2010';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-19, -15, 38, 30, 3);
  ctx.fill();
  ctx.stroke();
  // доски
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (const x of [-9, 0, 9]) {
    ctx.beginPath();
    ctx.moveTo(x, -15);
    ctx.lineTo(x, 15);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(-19, -15, 38, 5);
  // металлические уголки
  ctx.fillStyle = '#8a8f86';
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * 19 - (sx > 0 ? 6 : 0), sy * 15 - (sy > 0 ? 6 : 0), 6, 6);
  // трафарет
  ctx.fillStyle = '#e8c850';
  ctx.fillRect(-12, -2, 24, 4);
  ctx.fillRect(-2, -9, 4, 18);
  ctx.fillStyle = `rgba(255,230,120,${0.4 + 0.3 * Math.sin(time * 6)})`;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCanopy(ctx: Ctx, r: number, rot: number) {
  const n = 10;
  ctx.save();
  ctx.rotate(rot);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#e9e4d2' : '#d8562a';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40,20,10,0.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // блик
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlane(ctx: Ctx, shadow: boolean, time: number) {
  const c = (col: string) => (shadow ? 'rgba(0,0,0,0.3)' : col);
  // крылья
  ctx.fillStyle = c('#586048');
  ctx.beginPath();
  ctx.moveTo(14, -78);
  ctx.lineTo(-6, -78);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-6, 78);
  ctx.lineTo(14, 78);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();
  // хвостовое оперение
  ctx.fillStyle = c('#4c543e');
  ctx.beginPath();
  ctx.moveTo(-62, -30);
  ctx.lineTo(-76, -30);
  ctx.lineTo(-72, 30);
  ctx.lineTo(-62, 30);
  ctx.closePath();
  ctx.fill();
  // фюзеляж
  ctx.fillStyle = c('#6a7254');
  ctx.beginPath();
  ctx.moveTo(78, 0);
  ctx.bezierCurveTo(70, -12, 40, -14, 0, -13);
  ctx.lineTo(-76, -5);
  ctx.lineTo(-76, 5);
  ctx.lineTo(0, 13);
  ctx.bezierCurveTo(40, 14, 70, 12, 78, 0);
  ctx.fill();
  if (shadow) return;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(-60, -7, 120, 3);
  // кабина
  ctx.fillStyle = '#26323a';
  ctx.beginPath();
  ctx.ellipse(46, 0, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // двигатели и винты
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#2e332a';
    ctx.fillRect(14, s * 36 - 5, 22, 10);
    ctx.fillStyle = `rgba(210,210,210,${0.35 + 0.15 * Math.sin(time * 40)})`;
    ctx.beginPath();
    ctx.ellipse(37, s * 36, 3, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // знаки
  ctx.fillStyle = '#d8d0b0';
  ctx.beginPath();
  ctx.arc(-6, -52, 7, 0, Math.PI * 2);
  ctx.arc(-6, 52, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a2a20';
  ctx.beginPath();
  ctx.arc(-6, -52, 3.4, 0, Math.PI * 2);
  ctx.arc(-6, 52, 3.4, 0, Math.PI * 2);
  ctx.fill();
}

/** На земле: сигнальная ракета, тень, ящик, маяк */
export function drawAirdropGround(g: Game, ctx: Ctx, inView: InView) {
  const time = g.time;
  for (const d of g.drops) {
    if (!inView(d.x, d.y)) continue;
    // горящая ракета / маяк
    const pulse = 0.5 + 0.5 * Math.sin(time * 7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rad = d.landed ? 55 : 70;
    const grad = ctx.createRadialGradient(d.x, d.y, 2, d.x, d.y, rad);
    const col = d.landed ? '255,180,70' : '255,60,40';
    grad.addColorStop(0, `rgba(${col},${0.45 + pulse * 0.25})`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(d.x, d.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!d.landed) {
      ctx.fillStyle = '#ffe0c0';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3 + pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // тень падающего груза
      if (d.t > DROP_AT) {
        const k = (d.t - DROP_AT) / FALL_TIME;
        const alt = 1 - k;
        ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - alt * 0.5)})`;
        ctx.beginPath();
        ctx.ellipse(d.x + Math.sin(d.t * 1.6 + d.sway) * 10 * alt, d.y, 26 + alt * 20, 18 + alt * 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }

    // смятый парашют
    ctx.save();
    ctx.translate(d.x + 44, d.y + 22);
    ctx.rotate(d.dir);
    ctx.fillStyle = '#d8562a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9e4d2';
    ctx.beginPath();
    ctx.ellipse(-8, 4, 26, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(10, -4, 20, 8, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // пульсирующие кольца маяка
    for (let i = 0; i < 2; i++) {
      const k = ((time * 0.7 + i * 0.5) % 1);
      ctx.strokeStyle = `rgba(255,190,80,${(1 - k) * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 24 + k * 50, 0, Math.PI * 2);
      ctx.stroke();
    }
    // тень и ящик
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(d.x + 3, d.y + 5, 25, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.dir * 0.08);
    drawCrate(ctx, time);
    ctx.restore();

    // подпись
    const near = Math.hypot(g.player.x - d.x, g.player.y - d.y) < OPEN_RANGE;
    const bob = Math.sin(time * 3) * 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    const label = near ? '[E] ОТКРЫТЬ' : '✦ АИРДРОП';
    ctx.strokeText(label, d.x, d.y - 36 + bob);
    ctx.fillStyle = '#ffe080';
    ctx.fillText(label, d.x, d.y - 36 + bob);

    if (d.open > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.open);
      ctx.stroke();
      ctx.strokeStyle = '#ffe070';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
  }
  // сигнальные ракеты в полёте
  for (const f of g.flareShots) {
    const k = Math.min(1, f.t / f.dur);
    const y = f.y - Math.sin(k * Math.PI) * 50;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(f.x, y, 0, f.x, y, 26);
    grad.addColorStop(0, 'rgba(255,230,200,0.95)');
    grad.addColorStop(0.3, 'rgba(255,80,50,0.7)');
    grad.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** В воздухе (над крышами): самолёт, парашют */
export function drawAirdropAir(g: Game, ctx: Ctx, inView: InView) {
  const time = g.time;
  for (const d of g.drops) {
    // самолёт
    if (d.t < DROP_AT + 9) {
      const pd = PLANE_SPEED * (d.t - DROP_AT);
      const px = d.x + Math.cos(d.dir) * pd;
      const py = d.y + Math.sin(d.dir) * pd;
      if (inView(px, py) || Math.hypot(px - g.player.x, py - g.player.y) < 900) {
        // тень
        ctx.save();
        ctx.translate(px + 60, py + 90);
        ctx.rotate(d.dir);
        ctx.scale(0.9, 0.9);
        drawPlane(ctx, true, time);
        ctx.restore();
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(d.dir);
        drawPlane(ctx, false, time);
        ctx.restore();
      }
    }
    // падающий груз
    if (!d.landed && d.t >= DROP_AT) {
      const k = (d.t - DROP_AT) / FALL_TIME;
      const alt = Math.max(0, 1 - k);
      const sc = 1 + alt * 0.9;
      const sx = d.x + Math.sin(d.t * 1.6 + d.sway) * 10 * alt;
      const sy = d.y - alt * 50;
      if (!inView(sx, sy)) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(sc, sc);
      ctx.save();
      ctx.rotate(Math.sin(d.t * 1.6 + d.sway) * 0.12);
      drawCrate(ctx, time);
      ctx.restore();
      ctx.translate(0, -6 * alt);
      ctx.globalAlpha = 0.97;
      drawCanopy(ctx, 52, d.t * 0.25);
      ctx.restore();
    }
  }
}

/** Стрелки-указатели к грузу за краем экрана */
export function drawDropPointers(g: Game, ctx: Ctx) {
  const { W, H } = g;
  for (const d of g.drops) {
    const sx = d.x - g.camTop.x;
    const sy = d.y - g.camTop.y;
    const m = 70;
    if (sx > m && sx < W - m && sy > m && sy < H - m) continue;
    const cx = W / 2;
    const cy = H / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const ex = clamp(cx + Math.cos(ang) * 4000, 46, W - 46);
    const ey = clamp(cy + Math.sin(ang) * 4000, 46, H - 46);
    // проецируем на рамку
    const kx = (ex - cx) / (Math.cos(ang) || 1e-6);
    const ky = (ey - cy) / (Math.sin(ang) || 1e-6);
    const k = Math.min(Math.abs(kx), Math.abs(ky));
    const px = clamp(cx + Math.cos(ang) * k, 46, W - 46);
    const py = clamp(cy + Math.sin(ang) * k, 46, H - 46);
    const pulse = 0.7 + 0.3 * Math.sin(g.time * 6);
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,200,90,${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = `rgba(255,210,100,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(3, -8);
    ctx.lineTo(3, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const dist = Math.round(Math.hypot(d.x - g.player.x, d.y - g.player.y) / 10);
    const txt = d.landed ? `ГРУЗ ${dist} м` : `ДРОП ${Math.max(0, Math.ceil(DROP_AT + FALL_TIME - d.t))} с`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px ui-monospace, Menlo, Consolas, monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    const ty = py + (py < H / 2 ? 34 : -34);
    ctx.strokeText(txt, px, ty);
    ctx.fillStyle = '#ffe080';
    ctx.fillText(txt, px, ty);
  }
}

export function drawDropsMinimap(g: Game, ctx: Ctx, mxp: number, myp: number, sc: number) {
  for (const d of g.drops) {
    const x = mxp + d.x * sc;
    const y = myp + d.y * sc;
    const pulse = 0.5 + 0.5 * Math.sin(g.time * 6);
    ctx.fillStyle = d.landed ? `rgba(255,200,80,${0.6 + pulse * 0.4})` : `rgba(255,70,50,${0.6 + pulse * 0.4})`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,80,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 6 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
