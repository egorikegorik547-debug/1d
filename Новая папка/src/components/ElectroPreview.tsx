import { useEffect, useRef } from 'react';
import { drawBulb, drawElampTop, drawGenerator, drawGeneratorFx, drawWire } from '../game/power';

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#2a2925');
  bg.addColorStop(1, '#121210');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  // бетонные плиты
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

export function GeneratorPreview({ width = 300, height = 130 }: { width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const draw = (tm: number) => {
      const t = tm / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      backdrop(ctx, width, height);
      const on = Math.sin(t * 0.7) > -0.5;
      const look = { on, fuel: 0.72 };
      ctx.save();
      ctx.translate(width * 0.34, height * 0.58);
      const k = Math.min((width * 0.5) / 78, (height * 0.62) / 54);
      ctx.scale(k, k);
      drawGenerator(ctx, t, look);
      drawGeneratorFx(ctx, t, look);
      ctx.restore();
      // лампочка на проводе
      const bx = width * 0.82;
      const by = height * 0.34;
      ctx.save();
      ctx.translate(width * 0.34 + 20 * k, height * 0.58 + 22 * k);
      ctx.restore();
      drawWire(ctx, width * 0.34 + 14 * k, height * 0.58 + 24 * k, bx, by, on, t);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1.4, 1.4);
      drawBulb(ctx, t, on, 0.85 + 0.15 * Math.sin(t * 13));
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,160,90,0.28)';
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}

export function FurnPreview({ type, width = 200, height = 90 }: { type: 'lamp' | 'bulb'; width?: number; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    const draw = (tm: number) => {
      const t = tm / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      backdrop(ctx, width, height);
      const lit = Math.sin(t * 0.9) > -0.3;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(2.2, 2.2);
      const fl = 0.88 + 0.12 * Math.sin(t * 14);
      if (type === 'bulb') drawBulb(ctx, t, lit, fl);
      else drawElampTop(ctx, t, lit, fl);
      ctx.restore();
      ctx.strokeStyle = 'rgba(200,160,90,0.28)';
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [type, width, height]);
  return <canvas ref={ref} style={{ width, height }} className="block" />;
}
