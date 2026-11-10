
import { useEffect, useMemo, useState } from 'react';
import type { Snapshot } from '../game/engine';
import { getRecords } from '../game/records';
import { sfx } from '../game/audio';
import { DIFFICULTY, useSettings } from '../game/settings';
import SettingsPanel from './SettingsPanel';
import SavePanel from './SavePanel';

function Btn({ children, onClick, tone = 'amber' }: { children: React.ReactNode; onClick: () => void; tone?: 'amber' | 'red' | 'stone' }) {
  const cls = {
    amber: 'border-amber-500/80 bg-amber-900/40 text-amber-100 hover:bg-amber-700/50',
    red: 'border-red-800/80 bg-red-950/40 text-red-100 hover:bg-red-900/50',
    stone: 'border-stone-600 bg-stone-900/60 text-stone-200 hover:bg-stone-700/60',
  }[tone];
  return (
    <button
      onClick={() => {
        sfx.click();
        onClick();
      }}
      onMouseEnter={() => sfx.hover()}
      className={`font-display w-full cursor-pointer border-2 py-3 text-lg uppercase tracking-[0.25em] transition ${cls}`}
    >
      {children}
    </button>
  );
}

export function PauseMenu({
  onResume,
  onMenu,
  onSave,
  onLoad,
}: {
  onResume: () => void;
  onMenu: () => void;
  onSave: (slot: number) => Promise<void>;
  onLoad: (slot: number) => Promise<boolean | void>;
}) {
  const [sub, setSub] = useState<'main' | 'settings' | 'saves'>('main');
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (sub !== 'main') setSub('main');
      else onResume();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [sub, onResume]);

  return (
    <div className="font-cond absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[3px]">
      <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
      {sub === 'main' ? (
        <div className="relative w-full max-w-sm animate-[panelin_0.25s_ease-out] border border-stone-600/70 bg-gradient-to-b from-stone-900 to-black p-7 shadow-2xl">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.5em] text-stone-500">Игра приостановлена</div>
            <h2 className="font-display mt-1 text-4xl uppercase tracking-[0.2em] text-stone-100">Пауза</h2>
          </div>
          <div className="mt-6 space-y-3">
            <Btn onClick={onResume}>Продолжить</Btn>
            <Btn onClick={() => setSub('saves')}>Сохранить / загрузить</Btn>
            <Btn tone="stone" onClick={() => setSub('settings')}>
              Настройки
            </Btn>
            <Btn tone="red" onClick={onMenu}>
              В главное меню
            </Btn>
          </div>
          <p className="mt-5 text-center text-[11px] uppercase tracking-[0.3em] text-stone-600">Esc — продолжить</p>
        </div>
      ) : (
        <div className="relative flex max-h-full w-full max-w-4xl animate-[panelin_0.25s_ease-out] flex-col border border-stone-600/70 bg-gradient-to-b from-stone-900 to-black shadow-2xl">
          <div className="flex items-center justify-between border-b border-stone-700 px-5 py-3">
            <div className="font-display text-2xl uppercase tracking-[0.2em] text-stone-100">{sub === 'saves' ? 'Сохранения' : 'Настройки'}</div>
            <button
              onClick={() => {
                sfx.click();
                setSub('main');
              }}
              className="cursor-pointer border border-stone-600 px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-stone-300 hover:border-amber-400 hover:text-amber-200"
            >
              ✕ Назад
            </button>
          </div>
          <div className="overflow-y-auto p-5">
            {sub === 'saves' ? <SavePanel canSave onSave={onSave} onLoad={onLoad} /> : <SettingsPanel />}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeadScreen({ s, onRestart, onMenu, onLoad }: { s: Snapshot; onRestart: () => void; onMenu: () => void; onLoad: (slot: number) => Promise<boolean | void> }) {
  const [showLoad, setShowLoad] = useState(false);
  const rec = useMemo(() => getRecords(), []);
  const set = useSettings();
  const newBest = s.wave >= rec.bestWave && s.wave > 0;
  return (
    <div className="font-cond absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative w-full max-w-md animate-[panelin_0.4s_ease-out] border-2 border-red-900/70 bg-gradient-to-b from-stone-900 to-black p-8 text-center shadow-[0_0_80px_rgba(120,0,0,0.5)]">
        <h2 className="font-display text-5xl uppercase tracking-[0.18em] text-red-500/90 drop-shadow-[0_0_18px_rgba(220,38,38,0.6)]">Вы погибли</h2>
        <p className="mt-2 text-sm italic text-stone-400">Город забрал ещё одного.</p>
        <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-stone-600">Сложность: {DIFFICULTY[set.difficulty].name}</div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ['Волна', s.wave],
            ['Убито', s.kills],
            ['Время', `${Math.floor(s.time / 60)}:${String(s.time % 60).padStart(2, '0')}`],
          ].map(([k, v]) => (
            <div key={k} className="border border-stone-700 bg-black/40 py-3">
              <div className="font-display text-2xl text-stone-100">{v}</div>
              <div className="text-[11px] uppercase tracking-widest text-stone-500">{k}</div>
            </div>
          ))}
        </div>
        {newBest && <div className="mt-3 animate-pulse text-sm uppercase tracking-[0.3em] text-amber-300">★ Новый рекорд по волнам ★</div>}
        <div className="mt-6 space-y-3">
          <Btn tone="red" onClick={onRestart}>
            Заново
          </Btn>
          <Btn onClick={() => setShowLoad((v) => !v)}>{showLoad ? 'Скрыть сохранения' : 'Загрузить сохранение'}</Btn>
          {showLoad && (
            <div className="text-left">
              <SavePanel canSave={false} onLoad={onLoad} />
            </div>
          )}
          <Btn tone="stone" onClick={onMenu}>
            В главное меню
          </Btn>
        </div>
      </div>
    </div>
  );
}
