
import type { ReactNode } from 'react';
import { sfx } from '../game/audio';

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between text-sm uppercase tracking-[0.15em]">
        <span className="text-stone-300">{label}</span>
        <span className="font-mono text-amber-300/90">{format ? format(value) : Math.round(value * 100) + '%'}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 bg-stone-800 ring-1 ring-stone-700">
          <div className="h-full bg-gradient-to-r from-amber-700 to-amber-400" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 border border-amber-200 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onPointerUp={() => sfx.tick()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

export function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => {
        sfx.click();
        onChange(!value);
      }}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 py-2 text-left"
    >
      <span>
        <span className="block text-sm uppercase tracking-[0.15em] text-stone-300 group-hover:text-stone-100">{label}</span>
        {desc && <span className="block text-xs normal-case tracking-normal text-stone-500">{desc}</span>}
      </span>
      <span className={`relative h-6 w-12 shrink-0 border transition ${value ? 'border-amber-400/80 bg-amber-600/30' : 'border-stone-600 bg-stone-900'}`}>
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 transition-all ${value ? 'left-[1.625rem] bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'left-0.5 bg-stone-500'}`}
          style={{ height: '1.1rem', width: '1.1rem' }}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; swatch?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-2">
      <div className="mb-1.5 text-sm uppercase tracking-[0.15em] text-stone-300">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              sfx.click();
              onChange(o.id);
            }}
            className={`flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition ${
              value === o.id ? 'border-amber-400/80 bg-amber-600/25 text-amber-100' : 'border-stone-700 bg-stone-900/70 text-stone-400 hover:border-stone-500 hover:text-stone-200'
            }`}
          >
            {o.swatch && <span className="h-3 w-3 border border-black/50" style={{ background: o.swatch }} />}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border border-stone-700/60 bg-black/30 p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="h-2 w-2 rotate-45 bg-amber-500" />
        <span className="font-display text-sm uppercase tracking-[0.3em] text-amber-200/90">{title}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-stone-600 to-transparent" />
      </div>
      {children}
    </div>
  );
}

export function StatBar({ label, value, color = 'bg-stone-300/80' }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider">
      <span className="w-20 text-stone-500">{label}</span>
      <div className="h-1.5 flex-1 bg-stone-900">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} />
      </div>
    </div>
  );
}
