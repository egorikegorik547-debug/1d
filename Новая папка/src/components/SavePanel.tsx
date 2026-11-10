
import { useCallback, useEffect, useState } from 'react';
import { AUTO_SLOT, MANUAL_SLOTS, deleteSave, listSaves, type SaveEntry } from '../game/saves';
import { sfx } from '../game/audio';

const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
const fmtDate = (t: number) => new Date(t).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function Small({ children, onClick, tone = 'stone', disabled }: { children: React.ReactNode; onClick: () => void; tone?: 'stone' | 'amber' | 'red'; disabled?: boolean }) {
  const cls = {
    stone: 'border-stone-600 text-stone-300 hover:bg-stone-700/60',
    amber: 'border-amber-600/80 bg-amber-900/40 text-amber-100 hover:bg-amber-700/50',
    red: 'border-red-900/80 text-red-300 hover:bg-red-950/60',
  }[tone];
  return (
    <button
      disabled={disabled}
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className={`pointer-events-auto cursor-pointer border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition disabled:cursor-default disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export default function SavePanel({
  canSave,
  onSave,
  onLoad,
}: {
  canSave: boolean;
  onSave?: (slot: number) => Promise<void> | void;
  onLoad?: (slot: number) => Promise<boolean | void> | void;
}) {
  const [saves, setSaves] = useState<SaveEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => setSaves(await listSaves()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const slots = [AUTO_SLOT, ...MANUAL_SLOTS];
  const by = (slot: number) => saves?.find((s) => s.slot === slot);

  return (
    <div className="space-y-3">
      {msg && <div className="border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">{msg}</div>}
      {saves === null && <div className="text-sm text-stone-500">Загрузка сохранений…</div>}
      {saves !== null &&
        slots.map((slot) => {
          const e = by(slot);
          return (
            <div key={slot} className="flex flex-wrap items-center gap-3 border border-stone-700/70 bg-black/40 p-3">
              <div className="min-w-[8rem]">
                <div className="font-display text-sm uppercase tracking-[0.2em] text-stone-200">{slot === AUTO_SLOT ? 'Автосохранение' : `Слот ${slot}`}</div>
                <div className="text-[11px] text-stone-500">{e ? fmtDate(e.updatedAt) : 'пусто'}</div>
              </div>
              <div className="min-w-0 flex-1 text-xs text-stone-400">
                {e ? (
                  <>
                    <span className="text-amber-200">День {e.summary.day}</span> · {e.summary.phase === 'night' ? '🌙 ночь' : '☀ день'} · {e.summary.loc === 'basement' ? 'подвал' : 'поверхность'} · ₽{e.summary.money} · убито {e.summary.kills} · оружия {e.summary.weapons} · построек {e.summary.structures} · {fmtTime(e.summary.time)}
                    <span className="text-stone-600"> · {e.summary.difficulty}</span>
                  </>
                ) : (
                  <span className="text-stone-600">Нет данных</span>
                )}
              </div>
              <div className="flex gap-2">
                {onSave && slot !== AUTO_SLOT && (
                  <Small
                    tone="amber"
                    disabled={!canSave || busy}
                    onClick={async () => {
                      setBusy(true);
                      await onSave(slot);
                      await refresh();
                      setMsg(`Сохранено в слот ${slot}`);
                      setBusy(false);
                    }}
                  >
                    Сохранить
                  </Small>
                )}
                {onLoad && (
                  <Small
                    tone="amber"
                    disabled={!e || busy}
                    onClick={async () => {
                      setBusy(true);
                      const ok = await onLoad(slot);
                      if (ok === false) setMsg('Не удалось загрузить сохранение');
                      setBusy(false);
                    }}
                  >
                    Загрузить
                  </Small>
                )}
                {e && slot !== AUTO_SLOT && (
                  <Small
                    tone="red"
                    disabled={busy}
                    onClick={async () => {
                      await deleteSave(slot);
                      await refresh();
                    }}
                  >
                    ✕
                  </Small>
                )}
              </div>
            </div>
          );
        })}
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-600">Автосохранение — в конце каждой волны, дня и при спуске в подвал. Сохранения хранятся в базе данных и в браузере.</p>
    </div>
  );
}
