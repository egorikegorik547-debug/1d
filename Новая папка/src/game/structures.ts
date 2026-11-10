import type { Ctx } from './art';
import type { Enemy, Game } from './engine';
import { CENTER, WORLD, type Collider } from './world';
import { STRUCTS, type StructId } from './items';
import { AMMO } from './weapons';
import { explode, mkBullet } from './combat';
import { sfx } from './audio';

/** Люк в подвал (внутри лагеря) */
export const HATCH = { x: CENTER.x + 62, y: CENTER.y + 128 };
export const REACH = 300;

export interface Structure {
  id: number;
  type: StructId;
  x: number;
  y: number;
  rot: 0 | 1;
  hp: number;
  maxHp: number;
  open: boolean;
  ammo: number;
  aim: number;
  cd: number;
  flash: number;
  arm: number;
  tick: number;
  col: Collider | null;
  recoil: number;
}

export const sizeOf = (type: StructId, rot: number) => {
  const d = STRUCTS[type];
  return rot ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
};

const rectsOverlap = (ax: number, ay: number, aw: number, ah: number, b: { x: number; y: number; w: number; h: number }) =>
  ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;

function circleRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

export function canPlace(g: Game, type: StructId, x: number, y: number, rot: 0 | 1): { ok: boolean; reason: string } {
  const d = STRUCTS[type];
  const { w, h } = sizeOf(type, rot);
  const p = g.player;
  if (Math.hypot(p.x - x, p.y - y) > REACH) return { ok: false, reason: 'Слишком далеко' };
  if (x - w / 2 < 40 || y - h / 2 < 40 || x + w / 2 > WORLD - 40 || y + h / 2 > WORLD - 40) return { ok: false, reason: 'Край карты' };
  if (Math.hypot(x - HATCH.x, y - HATCH.y) < 54 + Math.max(w, h) / 2) return { ok: false, reason: 'Люк в подвал' };
  const solid = d.kind !== 'wire' && d.kind !== 'mine';
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  const out: Collider[] = [];
  g.world.grid.query(x0 - 2, y0 - 2, x0 + w + 2, y0 + h + 2, out);
  for (const c of out) {
    if (!solid && c.type === 'struct') continue;
    if (rectsOverlap(x0, y0, w, h, c)) return { ok: false, reason: 'Место занято' };
  }
  if (solid) {
    if (circleRect(p.x, p.y, p.r + 2, x0, y0, w, h)) return { ok: false, reason: 'Вы стоите на месте' };
    for (const e of g.enemies) if (circleRect(e.x, e.y, e.r, x0, y0, w, h)) return { ok: false, reason: 'Мешает враг' };
  }
  for (const s of g.structures) {
    const sz = sizeOf(s.type, s.rot);
    const sd = STRUCTS[s.type];
    const sSolid = sd.kind !== 'wire' && sd.kind !== 'mine';
    if (solid && sSolid && rectsOverlap(x0, y0, w, h, { x: s.x - sz.w / 2, y: s.y - sz.h / 2, w: sz.w, h: sz.h })) return { ok: false, reason: 'Место занято' };
    if (!solid && !sSolid && Math.hypot(s.x - x, s.y - y) < (d.kind === 'mine' ? 22 : 40)) return { ok: false, reason: 'Слишком близко' };
    if (!solid && sSolid && sd.kind === 'tower' && rectsOverlap(x0, y0, w, h, { x: s.x - sz.w / 2, y: s.y - sz.h / 2, w: sz.w, h: sz.h })) return { ok: false, reason: 'Место занято' };
  }
  return { ok: true, reason: '' };
}

function attachCollider(g: Game, s: Structure) {
  const d = STRUCTS[s.type];
  if (d.kind === 'wire' || d.kind === 'mine') return;
  if (d.kind === 'gate' && s.open) return;
  const { w, h } = sizeOf(s.type, s.rot);
  const c: Collider = { x: s.x - w / 2, y: s.y - h / 2, w, h, type: 'struct', ref: s };
  s.col = c;
  g.world.grid.add(c);
}

function detachCollider(g: Game, s: Structure) {
  if (s.col) {
    g.world.grid.remove(s.col);
    s.col = null;
  }
}

export function addStructure(g: Game, type: StructId, x: number, y: number, rot: 0 | 1, init?: Partial<Structure>): Structure {
  const d = STRUCTS[type];
  const s: Structure = {
    id: g.nextId++,
    type,
    x,
    y,
    rot: d.rotatable ? rot : 0,
    hp: d.hp,
    maxHp: d.hp,
    open: false,
    ammo: d.turret ? Math.round(d.turret.cap * 0.5) : 0,
    aim: -Math.PI / 2,
    cd: 0,
    flash: 0,
    arm: type === 'mine' ? 1.5 : 0,
    tick: 0,
    col: null,
    recoil: 0,
    ...init,
  };
  g.structures.push(s);
  attachCollider(g, s);
  return s;
}

export function removeStructure(g: Game, s: Structure) {
  detachCollider(g, s);
  const i = g.structures.indexOf(s);
  if (i >= 0) g.structures.splice(i, 1);
  if (g.onTower === s) fallFromTower(g, 0);
}

export function toggleGate(g: Game, s: Structure) {
  s.open = !s.open;
  if (s.open) detachCollider(g, s);
  else attachCollider(g, s);
  sfx.pickup();
}

export function damageStruct(g: Game, s: Structure, dmg: number) {
  s.hp -= dmg;
  s.flash = 0.12;
  if (Math.random() < 0.5) {
    g.addParticle({ x: s.x + (Math.random() - 0.5) * 20, y: s.y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 0.4, max: 0.4, size: 2, color: '#b08a58', kind: 'spark', rot: 0 });
  }
  if (s.hp <= 0) {
    for (let i = 0; i < 12; i++) {
      g.addParticle({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.7, max: 0.7, size: 3, color: i % 2 ? '#8a6a3e' : '#6b6e70', kind: 'spark', rot: 0 });
    }
    g.addParticle({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 14, color: 'rgba(130,125,115,', kind: 'dust', rot: 0 });
    g.toast(`${STRUCTS[s.type].name} разрушена`, 'bad');
    sfx.explosion(40);
    if (g.onTower === s) fallFromTower(g, 22);
    removeStructure(g, s);
  }
}

/* ------------------------------------------------------------------ */
/* Вышка                                                               */
/* ------------------------------------------------------------------ */
export function climbTower(g: Game, s: Structure) {
  g.onTower = s;
  g.player.x = s.x;
  g.player.y = s.y;
  g.mouse.down = false;
  g.toast('Вы на вышке: обзор шире, пули летят над укрытиями. E — слезть', 'info');
  sfx.pickup();
}

export function fallFromTower(g: Game, dmg: number) {
  const s = g.onTower;
  g.onTower = null;
  if (!s) return;
  // ищем свободное место рядом
  const p = g.player;
  const sz = sizeOf(s.type, 0);
  const cands: [number, number][] = [];
  for (let a = 0; a < 16; a++) {
    const ang = Math.PI / 2 + (a / 16) * Math.PI * 2;
    cands.push([s.x + Math.cos(ang) * (sz.w / 2 + 28), s.y + Math.sin(ang) * (sz.h / 2 + 28)]);
  }
  for (const [x, y] of cands) {
    if (!g.world.grid.circleBlocked(x, y, p.r + 2)) {
      p.x = x;
      p.y = y;
      break;
    }
  }
  if (dmg > 0) {
    g.hurtPlayer(dmg);
    g.toast('Вышка рухнула!', 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Взаимодействие                                                      */
/* ------------------------------------------------------------------ */
export function nearestStruct(g: Game, pred: (s: Structure) => boolean, range = 70): Structure | null {
  const p = g.player;
  let best: Structure | null = null;
  let bd = range;
  for (const s of g.structures) {
    if (!pred(s)) continue;
    const sz = sizeOf(s.type, s.rot);
    const nx = Math.max(s.x - sz.w / 2, Math.min(p.x, s.x + sz.w / 2));
    const ny = Math.max(s.y - sz.h / 2, Math.min(p.y, s.y + sz.h / 2));
    const d = Math.hypot(p.x - nx, p.y - ny);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

export function refillTurret(g: Game, s: Structure) {
  const t = STRUCTS[s.type].turret;
  if (!t) return;
  const missing = t.cap - s.ammo;
  if (missing <= 0) return g.toast('Турель уже заряжена', 'info');
  const need = Math.ceil(missing / t.perUnit);
  const take = Math.min(need, g.reserve[t.ammo]);
  if (take <= 0) return g.toast(`Нет боеприпасов: ${AMMO[t.ammo].name}`, 'bad');
  g.reserve[t.ammo] -= take;
  s.ammo = Math.min(t.cap, s.ammo + take * t.perUnit);
  g.toast(`Турель заряжена (−${take} ${AMMO[t.ammo].name})`, 'good');
  sfx.reloadDone();
}

/* ------------------------------------------------------------------ */
/* Обновление                                                          */
/* ------------------------------------------------------------------ */
export function enemyStructContact(g: Game, e: Enemy, dt: number) {
  e.strCd -= dt;
  if (e.strCd > 0 || g.structures.length === 0) return;
  const out = g.tmp;
  g.world.grid.query(e.x - e.r - 6, e.y - e.r - 6, e.x + e.r + 6, e.y + e.r + 6, out);
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c.type !== 'struct' || !c.ref) continue;
    const nx = Math.max(c.x, Math.min(e.x, c.x + c.w));
    const ny = Math.max(c.y, Math.min(e.y, c.y + c.h));
    if (Math.hypot(e.x - nx, e.y - ny) > e.r + 4) continue;
    const dx = c.x + c.w / 2 - e.x;
    const dy = c.y + c.h / 2 - e.y;
    const dl = Math.hypot(dx, dy) || 1;
    if ((dx / dl) * Math.cos(e.angle) + (dy / dl) * Math.sin(e.angle) < 0.15) continue;
    e.strCd = 0.85;
    damageStruct(g, c.ref as Structure, Math.max(6, e.dmg) * 1.4);
    return;
  }
}

function turretFire(g: Game, s: Structure, tgt: Enemy) {
  const t = STRUCTS[s.type].turret!;
  s.cd = t.cd;
  s.ammo--;
  s.flash = 0.07;
  s.recoil = 3;
  const mx = s.x + Math.cos(s.aim) * 24;
  const my = s.y + Math.sin(s.aim) * 24;
  const rnd = () => (Math.random() - 0.5) * 2;
  switch (s.type) {
    case 'turret_mg':
    case 'turret_shotgun': {
      for (let i = 0; i < t.pellets; i++) {
        const a = s.aim + rnd() * t.spread;
        const sp = t.speed * (t.pellets > 1 ? 0.85 + Math.random() * 0.3 : 1);
        g.bullets.push(mkBullet({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: t.dmg, life: t.range / sp, speed: sp, pierce: s.type === 'turret_mg' ? 0 : 0, color: t.color }));
      }
      if (s.type === 'turret_shotgun' || Math.random() < 0.35) sfx.shot(s.type === 'turret_mg' ? 'smg' : 'shotgun');
      for (let i = 0; i < 2; i++) g.addParticle({ x: mx, y: my, vx: Math.cos(s.aim) * 30 + rnd() * 15, vy: Math.sin(s.aim) * 30 + rnd() * 15, life: 0.45, max: 0.45, size: 3, color: 'rgba(170,170,165,', kind: 'smoke', rot: 0 });
      break;
    }
    case 'turret_flame': {
      for (let i = 0; i < 2; i++) {
        const a = s.aim + rnd() * t.spread;
        const sp = t.speed * (0.8 + Math.random() * 0.4);
        g.bullets.push(mkBullet({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: t.dmg, life: t.range / sp, speed: sp, pierce: 99, kind: 'flame', size: 6, burn: true }));
      }
      if (Math.random() < 0.12) sfx.shot('flamer');
      break;
    }
    case 'turret_tesla': {
      const hit = new Set<number>();
      let cx = s.x;
      let cy = s.y - 4;
      let dmg = t.dmg;
      let cur: Enemy | null = tgt;
      for (let i = 0; i < 4 && cur; i++) {
        hit.add(cur.id);
        const pts = [{ x: cx, y: cy }];
        const n = 5;
        for (let k = 1; k < n; k++) pts.push({ x: cx + ((cur.x - cx) * k) / n + rnd() * 8, y: cy + ((cur.y - cy) * k) / n + rnd() * 8 });
        pts.push({ x: cur.x, y: cur.y });
        g.beams.push({ pts, t: 0.18, max: 0.18, color: 'rgba(140,200,255,', core: '#f0faff', w: 3.5 });
        g.damageEnemy(cur, dmg, Math.atan2(cur.y - cy, cur.x - cx), { noArmor: true, quiet: i > 0 });
        cur.vx *= 0.3;
        cur.vy *= 0.3;
        cx = cur.x;
        cy = cur.y;
        dmg *= 0.82;
        let next: Enemy | null = null;
        let nd = 170;
        for (const e of g.enemies) {
          if (e.dead || hit.has(e.id)) continue;
          const d = Math.hypot(e.x - cx, e.y - cy);
          if (d < nd) {
            nd = d;
            next = e;
          }
        }
        cur = next;
      }
      sfx.shot('tesla');
      break;
    }
    default:
      break;
  }
}

export function updateStructures(g: Game, dt: number) {
  const list = g.structures.slice();
  for (const s of list) {
    if (s.flash > 0) s.flash -= dt;
    if (s.recoil > 0) s.recoil = Math.max(0, s.recoil - dt * 20);
    const d = STRUCTS[s.type];

    if (d.kind === 'turret' && d.turret) {
      const t = d.turret;
      s.cd -= dt;
      let tgt: Enemy | null = null;
      let best = t.range;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const dd = Math.hypot(e.x - s.x, e.y - s.y) - e.r;
        if (dd > best) continue;
        if (!g.world.grid.hasLOS(s.x, s.y, e.x, e.y)) continue;
        best = dd;
        tgt = e;
      }
      if (tgt) {
        const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        let da = want - s.aim;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        s.aim += Math.max(-dt * 9, Math.min(dt * 9, da));
        if (Math.abs(da) < 0.2 && s.cd <= 0) {
          if (s.ammo > 0) turretFire(g, s, tgt);
          else if (Math.random() < dt * 2) g.addParticle({ x: s.x, y: s.y, vx: 0, vy: -20, life: 0.4, max: 0.4, size: 2, color: '#ff5a3a', kind: 'spark', rot: 0 });
        }
      } else {
        s.aim += dt * 0.35 * Math.sin(g.time * 0.7 + s.id);
      }
    } else if (d.kind === 'mine') {
      if (s.arm > 0) {
        s.arm -= dt;
        continue;
      }
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) < 18 + e.r * 0.6) {
          explode(g, s.x, s.y, 115, 230, { shake: 7 });
          removeStructure(g, s);
          break;
        }
      }
    } else if (d.kind === 'wire') {
      s.tick -= dt;
      const sz = sizeOf(s.type, s.rot);
      let touched = 0;
      for (const e of g.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - s.x) < sz.w / 2 + e.r * 0.5 && Math.abs(e.y - s.y) < sz.h / 2 + e.r * 0.5) {
          touched++;
          e.slowT = Math.max(e.slowT, 0.3);
          if (s.tick <= 0) {
            g.damageEnemy(e, 5, Math.atan2(e.vy, e.vx), { quiet: true, noArmor: true });
            g.blood(e.x, e.y, Math.random() * 6.28, 1);
          }
        }
      }
      if (s.tick <= 0) {
        s.tick = 0.3;
        if (touched > 0) {
          s.hp -= touched * 1.6;
          if (s.hp <= 0) damageStruct(g, s, 1);
        }
      }
    }
  }
  // на вышке
  if (g.onTower) {
    g.player.x = g.onTower.x;
    g.player.y = g.onTower.y;
  }
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
export interface ShapeOpts {
  rot: number;
  hpFrac: number;
  open: boolean;
  aim: number;
  time: number;
  flash: number;
  ammoFrac: number;
  recoil: number;
  armed: boolean;
}

export const defaultShape = (): ShapeOpts => ({ rot: 0, hpFrac: 1, open: false, aim: 0, time: 0, flash: 0, ammoFrac: 1, recoil: 0, armed: true });

function drawGunTurret(ctx: Ctx, type: StructId, o: ShapeOpts) {
  const t = STRUCTS[type].turret!;
  // основание
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 20, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3d41';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 18;
    const y = Math.sin(a) * 18;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#1c1e20';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = t.color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#8a8f95';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 15.5, Math.sin(a) * 15.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.rotate(o.aim);
  ctx.translate(-o.recoil, 0);
  if (type === 'turret_mg') {
    ctx.fillStyle = '#25282b';
    ctx.fillRect(4, -7.5, 5, 15); // ящик
    ctx.fillStyle = '#4a5036';
    ctx.fillRect(-2, -10.5, 11, 5);
    ctx.fillStyle = '#c8a24a';
    for (let i = 0; i < 4; i++) ctx.fillRect(0 + i * 2.2, -9.6, 1.2, 3);
    ctx.fillStyle = '#4b5057';
    ctx.fillRect(-6, -5.5, 15, 11);
    ctx.fillStyle = '#6b7178';
    ctx.fillRect(-6, -5.5, 15, 2);
    ctx.fillStyle = '#2e3135';
    ctx.fillRect(9, -4.4, 20, 3.2);
    ctx.fillRect(9, 1.2, 20, 3.2);
    ctx.fillStyle = '#17181a';
    ctx.fillRect(27, -4.8, 4, 4);
    ctx.fillRect(27, 0.8, 4, 4);
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(14, -4.4, 8, 1);
  } else if (type === 'turret_shotgun') {
    ctx.fillStyle = '#6a3a2a';
    ctx.beginPath();
    ctx.arc(-3, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a1d14';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#d86a4a';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillRect(-3 + Math.cos(a) * 5.5 - 1, Math.sin(a) * 5.5 - 1, 2, 2);
    }
    ctx.fillStyle = '#42464c';
    ctx.fillRect(4, -7, 12, 14);
    ctx.fillStyle = '#2b2e32';
    ctx.fillRect(14, -6.4, 15, 12.8);
    ctx.fillStyle = '#17181a';
    ctx.fillRect(27, -5, 4, 4.2);
    ctx.fillRect(27, 0.8, 4, 4.2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(14, -6.4, 15, 2);
  } else {
    // огнемёт
    ctx.fillStyle = '#a8392a';
    ctx.fillRect(-12, -9, 14, 7);
    ctx.fillRect(-12, 2, 14, 7);
    ctx.fillStyle = '#d86a4a';
    ctx.fillRect(-12, -9, 14, 2);
    ctx.fillRect(-12, 2, 14, 2);
    ctx.fillStyle = '#e8c04a';
    ctx.fillRect(-4, -9, 2, 7);
    ctx.fillRect(-4, 2, 2, 7);
    ctx.fillStyle = '#42464c';
    ctx.fillRect(2, -5, 12, 10);
    ctx.fillStyle = '#2b2e32';
    ctx.fillRect(12, -3, 16, 6);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(24, -4.4, 5, 8.8);
    ctx.fillStyle = '#ffb54a';
    ctx.beginPath();
    ctx.arc(30, 0, 2 + Math.sin(o.time * 18) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.flash > 0) {
    ctx.fillStyle = type === 'turret_flame' ? 'rgba(255,170,60,0.9)' : 'rgba(255,230,150,0.95)';
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(40, -4);
    ctx.lineTo(48, 0);
    ctx.lineTo(40, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // индикатор боезапаса
  ctx.fillStyle = o.ammoFrac > 0.02 ? (o.ammoFrac < 0.25 ? '#e8b030' : '#5ae070') : '#ff3a2a';
  ctx.beginPath();
  ctx.arc(-13, 12, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawTesla(ctx: Ctx, o: ShapeOpts) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 20, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34383d';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    if (i) ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    else ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#17191b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // катушка
  for (let i = 3; i >= 0; i--) {
    ctx.fillStyle = i % 2 ? '#b8743a' : '#d8924a';
    ctx.beginPath();
    ctx.arc(0, 0, 4 + i * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  const pulse = 0.65 + 0.35 * Math.sin(o.time * 8) + (o.flash > 0 ? 0.6 : 0);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14 + pulse * 6);
  g.addColorStop(0, `rgba(210,240,255,${Math.min(1, 0.8 * pulse)})`);
  g.addColorStop(0.5, `rgba(120,190,255,${0.35 * pulse})`);
  g.addColorStop(1, 'rgba(100,160,255,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#eaf8ff';
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  // дуги
  ctx.strokeStyle = 'rgba(170,220,255,0.8)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = o.time * 5 + i * 2.1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
    ctx.lineTo(Math.cos(a + 0.3) * 11, Math.sin(a + 0.3) * 11);
    ctx.lineTo(Math.cos(a - 0.1) * 15, Math.sin(a - 0.1) * 15);
    ctx.stroke();
  }
  ctx.fillStyle = o.ammoFrac > 0.02 ? (o.ammoFrac < 0.25 ? '#e8b030' : '#5ae070') : '#ff3a2a';
  ctx.beginPath();
  ctx.arc(-13, 12, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStructureShape(ctx: Ctx, type: StructId, o: ShapeOpts) {
  const d = STRUCTS[type];
  ctx.save();
  if (o.rot) ctx.rotate(Math.PI / 2);
  const w = d.w;
  const h = d.h;
  const dmg = 1 - o.hpFrac;
  switch (type) {
    case 'barricade': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
      // мешки с песком / доски
      const planks = 4;
      for (let i = 0; i < planks; i++) {
        const y = -h / 2 + (i * h) / planks;
        ctx.fillStyle = i % 2 ? '#7a5a34' : '#6a4c2a';
        ctx.fillRect(-w / 2, y, w, h / planks - 0.6);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(-w / 2, y, w, 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 12 + i * 5, y);
        ctx.lineTo(-w / 2 + 12 + i * 5, y + h / planks);
        ctx.moveTo(w / 2 - 14 - i * 4, y);
        ctx.lineTo(w / 2 - 14 - i * 4, y + h / planks);
        ctx.stroke();
      }
      // стальные накладки и гвозди
      ctx.fillStyle = '#5b6064';
      ctx.fillRect(-w / 2 + 6, -h / 2 - 1.5, 7, h + 3);
      ctx.fillRect(w / 2 - 13, -h / 2 - 1.5, 7, h + 3);
      ctx.fillStyle = '#8a8f95';
      for (const x of [-w / 2 + 9.5, w / 2 - 9.5]) for (const y of [-h / 2 + 3, h / 2 - 3]) ctx.fillRect(x - 1, y - 1, 2, 2);
      // штыри
      ctx.strokeStyle = '#4a4d50';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 4, -h / 2 - 2);
      ctx.lineTo(-w / 2 + 6, -h / 2 + 3);
      ctx.moveTo(w / 2 + 4, h / 2 + 2);
      ctx.lineTo(w / 2 - 6, h / 2 - 3);
      ctx.stroke();
      if (dmg > 0.25) {
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-8, -h / 2);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-10, h / 2);
        ctx.moveTo(14, -h / 2);
        ctx.lineTo(8, 2);
        ctx.stroke();
      }
      break;
    }
    case 'wire': {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(-w / 2, -h / 2 + 3, w, h);
      ctx.strokeStyle = '#8a8f95';
      ctx.lineWidth = 1.3;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const yy = -h / 2 + 7 + k * ((h - 14) / 2);
        for (let x = -w / 2 + 4; x <= w / 2 - 4; x += 5) {
          const y = yy + Math.sin(x * 0.5 + k) * 4.5;
          if (x === -w / 2 + 4) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = '#b8bec4';
      ctx.lineWidth = 0.9;
      for (let x = -w / 2 + 6; x < w / 2 - 4; x += 8) {
        for (const y of [-h / 2 + 6, 0, h / 2 - 6]) {
          ctx.beginPath();
          ctx.moveTo(x - 2.4, y - 2.4);
          ctx.lineTo(x + 2.4, y + 2.4);
          ctx.moveTo(x + 2.4, y - 2.4);
          ctx.lineTo(x - 2.4, y + 2.4);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#5a4630';
      ctx.fillRect(-w / 2 - 1, -h / 2, 4, h);
      ctx.fillRect(w / 2 - 3, -h / 2, 4, h);
      break;
    }
    case 'mine': {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(1.5, 2.5, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a5036';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22251a';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#5f6644';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22251a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
      const on = o.armed ? Math.sin(o.time * 6) > 0.2 : Math.sin(o.time * 20) > 0;
      ctx.fillStyle = on ? '#ff3a2a' : '#5a1a14';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fence': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 4, w, h);
      ctx.strokeStyle = 'rgba(190,196,200,0.7)';
      ctx.lineWidth = 0.7;
      for (let x = -w / 2; x < w / 2 + h; x += 5) {
        ctx.beginPath();
        ctx.moveTo(Math.max(-w / 2, x - h), -h / 2 + (x < -w / 2 + h ? 0 : 0));
        ctx.lineTo(Math.min(w / 2, x), h / 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#7b8086';
      ctx.fillRect(-w / 2, -h / 2 + 0.5, w, 2.2);
      ctx.fillRect(-w / 2, h / 2 - 2.6, w, 2.2);
      ctx.fillStyle = '#5a5f65';
      for (let x = -w / 2; x <= w / 2; x += w / 4) ctx.fillRect(x - 2, -h / 2 - 1, 4, h + 2);
      ctx.fillStyle = '#a0a6ad';
      for (let x = -w / 2; x <= w / 2; x += w / 4) ctx.fillRect(x - 2, -h / 2 - 1, 4, 1.2);
      if (dmg > 0.4) {
        ctx.fillStyle = 'rgba(30,25,20,0.5)';
        ctx.fillRect(-6, -h / 2, 12, h);
      }
      break;
    }
    case 'gate': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 4, w, h);
      // стойки
      ctx.fillStyle = '#4a4d52';
      ctx.fillRect(-w / 2 - 4, -h / 2 - 3, 8, h + 6);
      ctx.fillRect(w / 2 - 4, -h / 2 - 3, 8, h + 6);
      const leaf = (x0: number, dir: number, open: boolean) => {
        ctx.save();
        ctx.translate(x0, 0);
        if (open) ctx.rotate(dir * Math.PI * 0.48);
        const lw = w / 2 - 4;
        ctx.fillStyle = '#7b8086';
        ctx.fillRect(dir > 0 ? 0 : -lw, -h / 2 + 1, lw, h - 2);
        ctx.fillStyle = '#3a3d41';
        ctx.fillRect(dir > 0 ? 1.5 : -lw + 1.5, -h / 2 + 3, lw - 3, h - 6);
        ctx.strokeStyle = '#a0a6ad';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (dir > 0) {
          ctx.moveTo(1.5, -h / 2 + 3);
          ctx.lineTo(lw - 1.5, h / 2 - 3);
        } else {
          ctx.moveTo(-lw + 1.5, h / 2 - 3);
          ctx.lineTo(-1.5, -h / 2 + 3);
        }
        ctx.stroke();
        ctx.restore();
      };
      leaf(-w / 2 + 2, 1, o.open);
      leaf(w / 2 - 2, -1, o.open);
      if (!o.open) {
        ctx.fillStyle = '#d8b44a';
        ctx.fillRect(-2.5, -3, 5, 6);
      } else {
        ctx.fillStyle = 'rgba(120,200,90,0.25)';
        ctx.fillRect(-w / 2 + 6, -h / 2, w - 12, h);
      }
      break;
    }
    case 'tower': {
      const s = w;
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(-s / 2 + 8, -s / 2 + 10, s, s);
      // опоры
      ctx.fillStyle = '#3a2c1c';
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillRect(x * (s / 2 - 5) - 4, y * (s / 2 - 5) - 4, 8, 8);
      // настил
      ctx.fillStyle = '#7a5a34';
      ctx.fillRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? '#86653a' : '#6e5030';
        ctx.fillRect(-s / 2 + 2, -s / 2 + 2 + i * ((s - 4) / 8), s - 4, (s - 4) / 8 - 0.7);
      }
      // перила
      ctx.strokeStyle = '#4a3420';
      ctx.lineWidth = 3;
      ctx.strokeRect(-s / 2 + 3, -s / 2 + 3, s - 6, s - 6);
      ctx.strokeStyle = '#9a7648';
      ctx.lineWidth = 1;
      ctx.strokeRect(-s / 2 + 2.5, -s / 2 + 2.5, s - 5, s - 5);
      // мешки с песком на бортах
      ctx.fillStyle = '#9a8a60';
      for (let i = 0; i < 4; i++) ctx.fillRect(-s / 2 + 10 + i * 13, -s / 2 + 5, 10, 5);
      // люк-лестница
      ctx.fillStyle = '#25190e';
      ctx.fillRect(-7, s / 2 - 16, 14, 12);
      ctx.strokeStyle = '#b0b4ba';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-6, s / 2 - 13 + i * 3.6);
        ctx.lineTo(6, s / 2 - 13 + i * 3.6);
        ctx.stroke();
      }
      // прожектор
      ctx.fillStyle = '#2a2c2f';
      ctx.fillRect(s / 2 - 16, -s / 2 + 8, 9, 9);
      ctx.fillStyle = '#ffe8a0';
      ctx.fillRect(s / 2 - 14, -s / 2 + 10, 5, 5);
      break;
    }
    case 'turret_mg':
    case 'turret_shotgun':
    case 'turret_flame':
      drawGunTurret(ctx, type, o);
      break;
    case 'turret_tesla':
      drawTesla(ctx, o);
      break;
    case 'workbench': {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
      ctx.fillStyle = '#5a4128';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#7a5a38' : '#6e5232';
        ctx.fillRect(-w / 2 + 1, -h / 2 + 1 + i * ((h - 2) / 5), w - 2, (h - 2) / 5 - 0.6);
      }
      ctx.strokeStyle = '#2a1c10';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      // тиски
      ctx.fillStyle = '#4a4d52';
      ctx.fillRect(-w / 2 + 5, -h / 2 + 5, 12, 10);
      ctx.fillStyle = '#8a8f95';
      ctx.fillRect(-w / 2 + 7, -h / 2 + 7, 8, 3);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-w / 2 + 17, -h / 2 + 9, 8, 2);
      // инструменты
      ctx.fillStyle = '#9aa0a6';
      ctx.fillRect(-8, -h / 2 + 5, 16, 3);
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(-8, -h / 2 + 8, 5, 6);
      ctx.fillStyle = '#b8964a';
      for (let i = 0; i < 5; i++) ctx.fillRect(10 + i * 3.2, 2, 2, 7);
      ctx.fillStyle = '#5f6234';
      ctx.fillRect(w / 2 - 18, -h / 2 + 5, 12, 9);
      ctx.fillStyle = '#d8a548';
      ctx.fillRect(w / 2 - 16, -h / 2 + 7, 8, 2);
      // наковальня
      ctx.fillStyle = '#3a3d41';
      ctx.fillRect(-w / 2 + 6, 4, 14, 7);
      ctx.fillStyle = '#6b7178';
      ctx.fillRect(-w / 2 + 6, 4, 14, 2);
      break;
    }
  }
  ctx.restore();
}

export function drawStructures(g: Game, ctx: Ctx, inView: (x: number, y: number) => boolean, pass: 'ground' | 'air') {
  const t = g.time;
  for (const s of g.structures) {
    const isTower = s.type === 'tower';
    if ((pass === 'air') !== isTower) continue;
    if (!inView(s.x, s.y)) continue;
    const d = STRUCTS[s.type];
    const o = defaultShape();
    o.rot = s.rot;
    o.hpFrac = s.hp / s.maxHp;
    o.open = s.open;
    o.aim = s.aim;
    o.time = t + s.id;
    o.flash = s.flash > 0 && d.kind === 'turret' ? 1 : 0;
    o.ammoFrac = d.turret ? s.ammo / d.turret.cap : 1;
    o.recoil = s.recoil;
    o.armed = s.arm <= 0;
    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.flash > 0 && d.kind !== 'turret') ctx.filter = 'brightness(1.5)';
    drawStructureShape(ctx, s.type, o);
    ctx.restore();
    if (s.hp < s.maxHp && d.kind !== 'mine') {
      const sz = sizeOf(s.type, s.rot);
      const bw = Math.max(34, Math.min(sz.w, 70));
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(s.x - bw / 2, s.y - sz.h / 2 - 11, bw, 4);
      ctx.fillStyle = s.hp / s.maxHp > 0.4 ? '#8aa84a' : '#c0502e';
      ctx.fillRect(s.x - bw / 2, s.y - sz.h / 2 - 11, bw * Math.max(0, s.hp / s.maxHp), 4);
    }
  }
  if (pass === 'ground') {
    // луч прицела турелей на полу не рисуем; ничего более
  }
}

/** Призрак размещения */
export function drawGhost(ctx: Ctx, type: StructId, x: number, y: number, rot: 0 | 1, ok: boolean, time: number) {
  const d = STRUCTS[type];
  const sz = sizeOf(type, rot);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.62;
  const o = defaultShape();
  o.rot = rot;
  o.time = time;
  o.aim = -Math.PI / 2;
  o.armed = false;
  drawStructureShape(ctx, type, o);
  ctx.globalAlpha = 1;
  ctx.fillStyle = ok ? 'rgba(90,230,110,0.2)' : 'rgba(240,70,50,0.28)';
  ctx.fillRect(-sz.w / 2, -sz.h / 2, sz.w, sz.h);
  ctx.strokeStyle = ok ? 'rgba(130,255,150,0.9)' : 'rgba(255,100,80,0.95)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(-sz.w / 2, -sz.h / 2, sz.w, sz.h);
  ctx.setLineDash([]);
  if (d.turret) {
    ctx.strokeStyle = ok ? 'rgba(130,255,150,0.35)' : 'rgba(255,100,80,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, d.turret.range, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
