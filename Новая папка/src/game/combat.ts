import type { Bullet, Game, Enemy } from './engine';
import { WEAPONS } from './weapons';
import { sfx } from './audio';
import { settings, QUALITY_MUL } from './settings';
import type { Ctx } from './art';
import { CENTER, SAFE_RADIUS } from './world';

/* ------------------------------------------------------------------ */
/* Типы эффектов                                                       */
/* ------------------------------------------------------------------ */
export type ExplosionColor = 'fire' | 'plasma' | 'acid' | 'nuke';

export interface Ring {
  x: number;
  y: number;
  max: number;
  t: number;
  dur: number;
  color: ExplosionColor | 'scream' | 'stomp' | 'frost';
}
export interface Beam {
  pts: { x: number; y: number }[];
  t: number;
  max: number;
  color: string;
  core: string;
  w: number;
}
export interface Cloud {
  x: number;
  y: number;
  r: number;
  t: number;
  max: number;
  tick: number;
}
export interface Field {
  x: number;
  y: number;
  r: number;
  t: number;
  max: number;
  tick: number;
}
export interface Floater {
  x: number;
  y: number;
  text: string;
  t: number;
  max: number;
  color: string;
  big: boolean;
}

const PALETTE: Record<ExplosionColor, string[]> = {
  fire: ['#ffd070', '#ff9a30', '#e8501a'],
  plasma: ['#e8c0ff', '#c06bff', '#7a3acf'],
  acid: ['#d8f070', '#9fd33a', '#5a9a20'],
  nuke: ['#fff6c0', '#ffd060', '#ff8a30'],
};

const q = () => QUALITY_MUL[settings.particles];

/* ------------------------------------------------------------------ */
/* Снаряды                                                             */
/* ------------------------------------------------------------------ */
export function mkBullet(o: Partial<Bullet> & { x: number; y: number; vx: number; vy: number }): Bullet {
  const speed = o.speed ?? Math.hypot(o.vx, o.vy);
  const life = o.life ?? 1;
  return {
    dmg: 10,
    life,
    maxLife: life,
    speed,
    from: 'p',
    pierce: 0,
    hit: [],
    dead: false,
    kind: 'bullet',
    size: 3,
    age: 0,
    splash: 0,
    splashDmg: 0,
    selfDmg: 0,
    burn: false,
    slow: false,
    homing: 0,
    target: 0,
    nuke: false,
    color: '#ffecb4',
    done: false,
    high: false,
    ...o,
  };
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function jag(x1: number, y1: number, x2: number, y2: number, amp = 9): { x: number; y: number }[] {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const n = Math.max(2, Math.floor(d / 16));
  const nx = -(y2 - y1) / (d || 1);
  const ny = (x2 - x1) / (d || 1);
  const pts = [{ x: x1, y: y1 }];
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const o = (Math.random() - 0.5) * 2 * amp;
    pts.push({ x: x1 + (x2 - x1) * k + nx * o, y: y1 + (y2 - y1) * k + ny * o });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

/* ------------------------------------------------------------------ */
/* Выстрел                                                             */
/* ------------------------------------------------------------------ */
export function fireWeapon(g: Game) {
  const w = WEAPONS[g.weapon];
  const st = g.owned[g.weapon];
  const p = g.player;
  st.mag--;
  g.cooldown = w.cooldown;
  p.flash = w.silent ? 0.03 : 0.06;
  g.shake = Math.max(g.shake, w.shake);
  sfx.shot(w.id);
  const spreadMul = p.moving ? 1.35 : 1;
  const cs = Math.cos(p.angle);
  const sn = Math.sin(p.angle);
  const ox = p.x + cs * 12;
  const oy = p.y + sn * 12;
  const mx = p.x + cs * w.muzzle;
  const my = p.y + sn * w.muzzle;
  const rnd = () => (Math.random() - 0.5) * 2;

  switch (w.mode) {
    case 'bullet': {
      for (let i = 0; i < w.pellets; i++) {
        const a = p.angle + rnd() * w.spread * spreadMul;
        const sp = w.speed * (w.pellets > 1 ? 0.85 + Math.random() * 0.3 : 1);
        g.bullets.push(
          mkBullet({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: w.damage, life: w.range / sp, speed: sp, pierce: w.pierce, color: w.silent ? '#cfe0ff' : '#ffecb4' }),
        );
      }
      // гильза
      const side = p.angle + Math.PI / 2;
      const big = w.pellets > 1;
      g.addParticle({
        x: p.x + cs * 10,
        y: p.y + sn * 10,
        vx: Math.cos(side) * (60 + Math.random() * 50),
        vy: Math.sin(side) * (60 + Math.random() * 50),
        life: 1.6,
        max: 1.6,
        size: big ? 5 : 3,
        color: big ? '#9a3a2a' : '#b8964a',
        kind: 'casing',
        rot: Math.random() * 6,
      });
      if (!w.silent) {
        for (let i = 0; i < 3; i++) {
          g.addParticle({
            x: mx,
            y: my,
            vx: cs * 30 + rnd() * 15,
            vy: sn * 30 + rnd() * 15,
            life: 0.6,
            max: 0.6,
            size: 3 + Math.random() * 3,
            color: 'rgba(170,170,165,',
            kind: 'smoke',
            rot: 0,
          });
        }
      }
      break;
    }
    case 'flame': {
      for (let i = 0; i < 2; i++) {
        const a = p.angle + rnd() * w.spread;
        const sp = w.speed * (0.8 + Math.random() * 0.4);
        g.bullets.push(
          mkBullet({ x: ox + cs * 14, y: oy + sn * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: w.damage, life: w.range / sp, speed: sp, pierce: 99, kind: 'flame', size: 6, burn: true }),
        );
      }
      break;
    }
    case 'cryo': {
      const a = p.angle + rnd() * w.spread * spreadMul;
      g.bullets.push(
        mkBullet({ x: ox, y: oy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: w.damage, life: w.range / w.speed, speed: w.speed, pierce: w.pierce, kind: 'cryo', size: 5, slow: true }),
      );
      break;
    }
    case 'plasma': {
      const a = p.angle + rnd() * w.spread * spreadMul;
      g.bullets.push(
        mkBullet({ x: ox, y: oy, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: w.damage, life: w.range / w.speed, speed: w.speed, kind: 'plasma', size: 7, splash: w.splash, splashDmg: w.damage * 0.8 }),
      );
      break;
    }
    case 'rocket':
    case 'nuke': {
      const nuke = w.mode === 'nuke';
      g.bullets.push(
        mkBullet({
          x: ox, y: oy, vx: cs * w.speed, vy: sn * w.speed, dmg: 0, life: w.range / w.speed, speed: w.speed, kind: 'rocket',
          size: nuke ? 9 : 6, splash: w.splash, splashDmg: w.damage, selfDmg: nuke ? 100 : 50, nuke,
        }),
      );
      for (let i = 0; i < 6; i++) {
        g.addParticle({ x: p.x - cs * 6, y: p.y - sn * 6, vx: -cs * 120 + rnd() * 50, vy: -sn * 120 + rnd() * 50, life: 0.6, max: 0.6, size: 4, color: 'rgba(200,200,195,', kind: 'smoke', rot: 0 });
      }
      break;
    }
    case 'swarm': {
      const n = w.pellets;
      for (let i = 0; i < n; i++) {
        const a = p.angle + ((i - (n - 1) / 2) / (n - 1)) * w.spread * 2 + rnd() * 0.05;
        const sp = w.speed * (0.8 + Math.random() * 0.15);
        g.bullets.push(
          mkBullet({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 0, life: w.range / sp, speed: sp, kind: 'missile', size: 4, splash: w.splash, splashDmg: w.damage, selfDmg: 14, homing: 5 + Math.random() * 2 }),
        );
      }
      break;
    }
    case 'blackhole': {
      g.bullets.push(mkBullet({ x: ox, y: oy, vx: cs * w.speed, vy: sn * w.speed, dmg: 4, life: w.range / w.speed, speed: w.speed, kind: 'singularity', size: 10 }));
      break;
    }
    case 'rail': {
      const x0 = p.x + cs * 16;
      const y0 = p.y + sn * 16;
      let x1 = x0;
      let y1 = y0;
      for (let d = 0; d < w.range; d += 8) {
        const tx = x0 + cs * d;
        const ty = y0 + sn * d;
        if (g.world.grid.blockedPoint(tx, ty)) break;
        x1 = tx;
        y1 = ty;
      }
      let hits = 0;
      for (const e of g.enemies.slice()) {
        if (e.dead) continue;
        if (segDist(e.x, e.y, x0, y0, x1, y1) <= e.r + 6) {
          g.damageEnemy(e, w.damage, p.angle, { noArmor: true });
          hits++;
          for (let i = 0; i < 4; i++) g.addParticle({ x: e.x, y: e.y, vx: rnd() * 200, vy: rnd() * 200, life: 0.4, max: 0.4, size: 2.2, color: '#9ffaff', kind: 'spark', rot: 0 });
        }
      }
      void hits;
      g.beams.push({ pts: [{ x: x0, y: y0 }, { x: x1, y: y1 }], t: 0.45, max: 0.45, color: 'rgba(100,240,255,', core: '#ffffff', w: 7 });
      for (let i = 0; i < 6; i++) g.addParticle({ x: x1, y: y1, vx: rnd() * 180, vy: rnd() * 180, life: 0.35, max: 0.35, size: 2, color: '#bff', kind: 'spark', rot: 0 });
      g.rings.push({ x: mx, y: my, max: 40, t: 0, dur: 0.25, color: 'frost' });
      break;
    }
    case 'tesla': {
      const hitSet = new Set<number>();
      let cx = mx;
      let cy = my;
      let dmg = w.damage;
      let target: Enemy | null = null;
      let best = w.range;
      for (const e of g.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y) - e.r;
        if (d > best) continue;
        let da = Math.atan2(e.y - p.y, e.x - p.x) - p.angle;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) > 0.6) continue;
        if (!g.world.grid.hasLOS(p.x, p.y, e.x, e.y)) continue;
        best = d;
        target = e;
      }
      if (!target) {
        const fx = mx + cs * 110 + rnd() * 30;
        const fy = my + sn * 110 + rnd() * 30;
        g.beams.push({ pts: jag(mx, my, fx, fy, 10), t: 0.12, max: 0.12, color: 'rgba(140,200,255,', core: '#e8f6ff', w: 3 });
        break;
      }
      for (let i = 0; i < 6 && target; i++) {
        hitSet.add(target.id);
        g.beams.push({ pts: jag(cx, cy, target.x, target.y, 10), t: 0.16, max: 0.16, color: 'rgba(140,200,255,', core: '#f0faff', w: 3.5 });
        g.damageEnemy(target, dmg, Math.atan2(target.y - cy, target.x - cx), { noArmor: true, quiet: i > 0 });
        target.vx *= 0.2;
        target.vy *= 0.2;
        cx = target.x;
        cy = target.y;
        dmg *= 0.86;
        let next: Enemy | null = null;
        let nd = 200;
        for (const e of g.enemies) {
          if (e.dead || hitSet.has(e.id)) continue;
          const d = Math.hypot(e.x - cx, e.y - cy);
          if (d < nd) {
            nd = d;
            next = e;
          }
        }
        target = next;
      }
      break;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Взрыв                                                               */
/* ------------------------------------------------------------------ */
export interface ExplodeOpts {
  self?: number;
  burn?: boolean;
  color?: ExplosionColor;
  shake?: number;
  sound?: boolean;
}

export function explode(g: Game, x: number, y: number, radius: number, dmg: number, o: ExplodeOpts = {}) {
  const color = o.color ?? 'fire';
  if (o.sound !== false) sfx.explosion(radius);
  g.rings.push({ x, y, max: radius, t: 0, dur: 0.4 + radius / 700, color });
  g.shake = Math.max(g.shake, o.shake ?? Math.min(16, radius / 11));
  if (color === 'nuke') g.flashT = 1;
  const pal = PALETTE[color];
  const n = Math.floor((radius / 4) * q());
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283;
    const s = (60 + Math.random() * 280) * Math.max(0.5, radius / 140);
    g.addParticle({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.35 + Math.random() * 0.5,
      max: 0.85,
      size: 2 + Math.random() * 4,
      color: pal[i % 3],
      kind: 'spark',
      rot: 0,
    });
  }
  for (let i = 0; i < Math.floor((radius / 14) * q()); i++) {
    const a = Math.random() * 6.283;
    const s = 20 + Math.random() * 100;
    g.addParticle({
      x: x + Math.cos(a) * radius * 0.3 * Math.random(),
      y: y + Math.sin(a) * radius * 0.3 * Math.random(),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.9,
      max: 0.9,
      size: 8 + Math.random() * 10,
      color: color === 'acid' ? 'rgba(110,150,60,' : 'rgba(70,64,58,',
      kind: 'smoke',
      rot: 0,
    });
  }
  // зона поражения на земле (подпалина)
  g.scorch(x, y, radius * 0.45, color === 'acid' ? 'rgba(60,90,20,0.35)' : 'rgba(18,14,10,0.5)');

  for (const e of g.enemies.slice()) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - x, e.y - y) - e.r;
    if (d < radius) {
      const k = 1 - Math.max(0, Math.min(1, d / radius)) * 0.55;
      const ang = Math.atan2(e.y - y, e.x - x);
      g.damageEnemy(e, dmg * k, ang, { noArmor: true });
      if (o.burn && !e.dead) e.burnT = 3;
      if (!e.dead) {
        const kb = (1 - d / radius) * 380;
        e.vx += Math.cos(ang) * kb * e.kbMul;
        e.vy += Math.sin(ang) * kb * e.kbMul;
      }
    }
  }
  if (o.self) {
    const p = g.player;
    const pd = Math.hypot(p.x - x, p.y - y) - p.r;
    if (pd < radius) g.hurtPlayer(o.self * (1 - Math.max(0, Math.min(1, pd / radius)) * 0.65));
  }
}

/** Снаряд закончил жизнь (попал, упал или долетел) */
export function finishBullet(g: Game, b: Bullet) {
  if (b.done) return;
  b.done = true;
  switch (b.kind) {
    case 'rocket':
    case 'missile':
      explode(g, b.x, b.y, b.splash, b.splashDmg, {
        self: b.selfDmg,
        color: b.nuke ? 'nuke' : 'fire',
        shake: b.nuke ? 26 : b.kind === 'missile' ? 3 : undefined,
      });
      break;
    case 'plasma':
      explode(g, b.x, b.y, b.splash, b.splashDmg, { color: 'plasma', shake: 2, sound: false });
      break;
    case 'singularity':
      g.fields.push({ x: b.x, y: b.y, r: 280, t: 0, max: 3.4, tick: 0 });
      sfx.stomp();
      break;
    case 'acid':
      for (let i = 0; i < 4; i++) {
        g.addParticle({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.4, max: 0.4, size: 2.4, color: '#9fd33a', kind: 'spark', rot: 0 });
      }
      break;
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Обновление эффектов                                                 */
/* ------------------------------------------------------------------ */
export function updateFx(g: Game, dt: number) {
  const p = g.player;
  if (g.flashT > 0) g.flashT = Math.max(0, g.flashT - dt * 1.1);

  for (const r of g.rings) r.t += dt;
  g.rings = g.rings.filter((r) => r.t < r.dur);
  for (const b of g.beams) b.t -= dt;
  g.beams = g.beams.filter((b) => b.t > 0);
  for (const f of g.floaters) {
    f.t -= dt;
    f.y -= 34 * dt;
  }
  g.floaters = g.floaters.filter((f) => f.t > 0);

  // ядовитые облака
  for (const c of g.clouds) {
    c.t += dt;
    c.tick -= dt;
    if (Math.random() < dt * 10 * q()) {
      const a = Math.random() * 6.283;
      const d = Math.random() * c.r;
      g.addParticle({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, vx: 0, vy: -14, life: 1.2, max: 1.2, size: 5, color: 'rgba(130,190,60,', kind: 'smoke', rot: 0 });
    }
    if (c.tick <= 0 && g.state === 'playing') {
      c.tick = 0.5;
      if (Math.hypot(p.x - c.x, p.y - c.y) < c.r + p.r * 0.5 && Math.hypot(p.x - CENTER.x, p.y - CENTER.y) > SAFE_RADIUS) {
        g.hurtPlayer(5, true);
      }
    }
  }
  g.clouds = g.clouds.filter((c) => c.t < c.max);

  // чёрные дыры
  for (const f of g.fields) {
    f.t += dt;
    f.tick -= dt;
    const tickNow = f.tick <= 0;
    if (tickNow) f.tick = 0.2;
    for (const e of g.enemies.slice()) {
      if (e.dead) continue;
      const dx = f.x - e.x;
      const dy = f.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < f.r) {
        const str = (e.type === 'colossus' ? 80 : 300) * (1 - (d / f.r) * 0.6);
        e.x += (dx / d) * str * dt;
        e.y += (dy / d) * str * dt;
        e.stuckT = 0;
        if (tickNow && d < 100) g.damageEnemy(e, 14, Math.atan2(dy, dx) + Math.PI, { quiet: true, noArmor: true });
      }
    }
    if (Math.random() < dt * 40 * q()) {
      const a = Math.random() * 6.283;
      const d = f.r * (0.4 + Math.random() * 0.6);
      g.addParticle({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 1.6, vy: -Math.sin(a) * d * 1.6, life: 0.6, max: 0.6, size: 2, color: '#b070ff', kind: 'spark', rot: 0 });
    }
  }
  for (const f of g.fields) {
    if (f.t >= f.max) explode(g, f.x, f.y, 175, 340, { color: 'plasma', shake: 12 });
  }
  g.fields = g.fields.filter((f) => f.t < f.max);
}

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
type InView = (x: number, y: number) => boolean;

/** Слой под существами: облака яда, воронки */
export function drawFxGround(g: Game, ctx: Ctx, inView: InView) {
  for (const c of g.clouds) {
    if (!inView(c.x, c.y)) continue;
    const a = Math.min(1, (c.max - c.t) / 1.5) * 0.4;
    const grad = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, c.r);
    grad.addColorStop(0, `rgba(140,200,60,${a})`);
    grad.addColorStop(0.75, `rgba(100,160,40,${a * 0.7})`);
    grad.addColorStop(1, 'rgba(100,160,40,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of g.fields) {
    if (!inView(f.x, f.y)) continue;
    const k = Math.min(1, f.t / 0.3) * Math.min(1, (f.max - f.t) / 0.4 + 0.3);
    const grad = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r);
    grad.addColorStop(0, `rgba(0,0,0,${0.9 * k})`);
    grad.addColorStop(0.18, `rgba(30,0,60,${0.55 * k})`);
    grad.addColorStop(1, 'rgba(60,0,120,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(g.time * 4);
    ctx.strokeStyle = `rgba(190,120,255,${0.6 * k})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 30 + i * 34, i, i + 2.2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 16 + Math.sin(g.time * 12) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(210,150,255,${k})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

const RING_COL: Record<Ring['color'], string> = {
  fire: '255,170,70',
  plasma: '190,110,255',
  acid: '170,220,70',
  nuke: '255,230,140',
  scream: '255,255,255',
  stomp: '210,180,130',
  frost: '120,240,255',
};

/** Слой над существами: взрывы, лучи, цифры урона */
export function drawFxTop(g: Game, ctx: Ctx, inView: InView) {
  ctx.save();
  for (const r of g.rings) {
    if (!inView(r.x, r.y) && r.max < 200) continue;
    const k = r.t / r.dur;
    const rad = r.max * (r.color === 'nuke' ? 1 : 0.35 + 0.65 * Math.sqrt(k));
    const col = RING_COL[r.color];
    if (r.color === 'scream' || r.color === 'stomp' || r.color === 'frost') {
      ctx.strokeStyle = `rgba(${col},${(1 - k) * 0.75})`;
      ctx.lineWidth = 3 + (1 - k) * 5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.max * k, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(r.x, r.y, rad * 0.1, r.x, r.y, rad);
    grad.addColorStop(0, `rgba(255,250,220,${(1 - k) * 0.85})`);
    grad.addColorStop(0.45, `rgba(${col},${(1 - k) * 0.55})`);
    grad.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = `rgba(${col},${(1 - k) * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad * (0.7 + 0.3 * k), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const b of g.beams) {
    const a = b.t / b.max;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `${b.color}${a * 0.35})`;
    ctx.lineWidth = b.w * 3 * a + 2;
    ctx.beginPath();
    b.pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
    ctx.stroke();
    ctx.strokeStyle = `${b.color}${a * 0.9})`;
    ctx.lineWidth = b.w * a + 1;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = b.core;
    ctx.globalAlpha = a;
    ctx.lineWidth = Math.max(1, b.w * 0.4 * a);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  if (settings.dmgNumbers) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of g.floaters) {
      if (!inView(f.x, f.y)) continue;
      const a = Math.min(1, f.t / (f.max * 0.5));
      ctx.globalAlpha = a;
      ctx.font = `bold ${f.big ? 17 : 12}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawBullet(ctx: Ctx, b: Bullet, time: number) {
  const m = Math.hypot(b.vx, b.vy) || 1;
  const ux = b.vx / m;
  const uy = b.vy / m;
  switch (b.kind) {
    case 'bullet': {
      const l = Math.min(26, b.speed * 0.022);
      ctx.strokeStyle = b.from === 'p' ? b.color : 'rgba(255,170,90,0.85)';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = b.from === 'p' ? 1.8 : 2.2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - ux * l, b.y - uy * l);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'flame': {
      const k = b.age / b.maxLife;
      const r = b.size + k * 15;
      const a = (1 - k) * 0.8;
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      grad.addColorStop(0, `rgba(255,${Math.floor(240 - k * 120)},120,${a})`);
      grad.addColorStop(0.5, `rgba(255,${Math.floor(130 - k * 60)},30,${a * 0.7})`);
      grad.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'cryo': {
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 12);
      grad.addColorStop(0, 'rgba(220,250,255,0.95)');
      grad.addColorStop(0.4, 'rgba(120,220,255,0.6)');
      grad.addColorStop(1, 'rgba(80,180,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(180,240,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - ux * 18, b.y - uy * 18);
      ctx.stroke();
      break;
    }
    case 'plasma': {
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 16);
      grad.addColorStop(0, 'rgba(255,240,255,1)');
      grad.addColorStop(0.3, 'rgba(200,110,255,0.8)');
      grad.addColorStop(1, 'rgba(120,50,220,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,110,255,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - ux * 22, b.y - uy * 22);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'rocket':
    case 'missile': {
      const big = b.kind === 'rocket' ? b.size / 6 : 0.65;
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(b.x - ux * 8, b.y - uy * 8, 0, b.x - ux * 8, b.y - uy * 8, 18 * big);
      grad.addColorStop(0, 'rgba(255,230,160,0.95)');
      grad.addColorStop(0.5, 'rgba(255,130,40,0.5)');
      grad.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x - ux * 8, b.y - uy * 8, 18 * big, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.strokeStyle = b.nuke ? '#e8d878' : '#6a6e58';
      ctx.lineWidth = 4 * big + 1;
      ctx.beginPath();
      ctx.moveTo(b.x + ux * 7 * big, b.y + uy * 7 * big);
      ctx.lineTo(b.x - ux * 7 * big, b.y - uy * 7 * big);
      ctx.stroke();
      ctx.strokeStyle = '#d25a2a';
      ctx.lineWidth = 2 * big + 0.5;
      ctx.beginPath();
      ctx.moveTo(b.x + ux * 9 * big, b.y + uy * 9 * big);
      ctx.lineTo(b.x + ux * 5 * big, b.y + uy * 5 * big);
      ctx.stroke();
      break;
    }
    case 'singularity': {
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 26);
      grad.addColorStop(0, 'rgba(160,80,255,0.6)');
      grad.addColorStop(1, 'rgba(100,30,200,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#05010c';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(200,140,255,${0.7 + 0.3 * Math.sin(time * 20)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case 'acid': {
      ctx.fillStyle = 'rgba(70,110,20,0.7)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size + 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8dc3c';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,200,0.6)';
      ctx.beginPath();
      ctx.arc(b.x - 1.5, b.y - 1.5, b.size * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}
