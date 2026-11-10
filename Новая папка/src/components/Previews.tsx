
import { useEffect, useRef } from 'react';
import { drawWeapon } from '../game/weaponArt';
import { drawShowcase, hasModel } from '../game/weaponModels';
import { drawStructureShape, defaultShape } from '../game/structures';
import { STRUCTS, type StructId } from '../game/items';
import { drawEnemySprite, ENEMIES, type EnemyType } from '../game/enemies';
import type { AmmoType, WeaponId } from '../game/weapons';
import { drawAmmoScene } from '../game/ammoArt';

export function WeaponPreview({ id, width = 150, height = 54, dim = false, showcase = false }: { id: WeaponId; width?: number; height?: number; dim?: boolean; showcase?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (hasModel(id)) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = width * dpr;
      c.height = height * dpr;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (dim) ctx.filter = 'brightness(0) opacity(0.5)';
      if (showcase) drawShowcase(ctx, id, width, height);
      else {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        drawShowcase(ctx, id, width, height);
        ctx.restore();
      }
      return;
    }
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (showcase) {
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, '#26241f');
        bg.addColorStop(1, '#0d0c0a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);
        const sp = ctx.createRadialGradient(width / 2, height * 0.46, 4, width / 2, height * 0.46, width * 0.52);
        sp.addColorStop(0, 'rgba(255,214,150,0.28)');
        sp.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.fillStyle = sp;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(0, height - 12, width, 1);
        ctx.strokeStyle = 'rgba(200,160,90,0.28)';
        ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      }
      ctx.save();
      const s = Math.min((width - 16) / 72, (height - 6) / 20);
      ctx.translate(width / 2 - 28 * s, height / 2);
      ctx.scale(s, s);
      if (dim) ctx.filter = 'brightness(0) opacity(0.5)';
      drawWeapon(ctx, id, dim ? 0 : t / 1000);
      ctx.restore();
      if (!dim) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [id, width, height, dim, showcase]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}

export function AmmoPreview({ type, width = 260, height = 96 }: { type: AmmoType; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const animated = type === 'energy' || type === 'nuke';
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawAmmoScene(ctx, type, width, height, t / 1000);
      if (animated) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [type, width, height]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}

export function EnemyPreview({ type, size = 92 }: { type: EnemyType; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext('2d')!;
    const def = ENEMIES[type];
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(120,110,90,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2 + 4, size / 2);
      const s = (size * 0.34) / def.r;
      ctx.scale(s, s);
      ctx.rotate(-0.5 + Math.sin(t / 1400) * 0.25);
      drawEnemySprite(ctx, type, { r: def.r, phase: t / 120, time: t / 1000, act: 0, vis: 0 });
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [type, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="block" />;
}

export function StructPreview({ id, width = 220, height = 110 }: { id: StructId; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const d = STRUCTS[id];
    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#2b2a24');
      bg.addColorStop(1, '#14130f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      // «земля»
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 53) % width, (i * 29) % height, 2, 1);
      const g = ctx.createRadialGradient(width / 2, height / 2, 4, width / 2, height / 2, width * 0.5);
      g.addColorStop(0, 'rgba(255,214,150,0.18)');
      g.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const base = Math.max(d.w, d.h);
      const sc = Math.min((width - 40) / base, (height - 30) / base, 2.2);
      ctx.scale(sc, sc);
      const o = defaultShape();
      o.time = t / 1000;
      o.aim = d.turret ? -0.3 + Math.sin(t / 900) * 0.9 : 0;
      o.open = id === 'gate' && Math.sin(t / 1400) > 0;
      o.flash = d.turret && Math.sin(t / 130) > 0.85 ? 1 : 0;
      drawStructureShape(ctx, id, o);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,160,90,0.28)';
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [id, width, height]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}
