
import { WEAPONS, AMMO } from '../game/weapons';
import type { Snapshot } from '../game/engine';
import { FRAME_ORDER, FURN, FURN_ORDER, RES, RES_ORDER, STRUCTS, STRUCT_ORDER, WIRE_COST, canAfford, costText } from '../game/items';

function Bar({ value, max, color, label, icon }: { value: number; max: number; color: string; label: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-center text-sm text-stone-300/80">{icon}</span>
      <div className="relative h-4 w-52 overflow-hidden border border-stone-500/50 bg-black/60">
        <div className="h-full transition-[width] duration-150" style={{ width: `${pct}%`, background: color }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-black/20" />
      </div>
      <span className="w-12 text-sm tabular-nums text-stone-200">
        {value}
        <span className="text-stone-500 text-xs"> {label}</span>
      </span>
    </div>
  );
}

function BuildPanel({ s, onSelect }: { s: Snapshot; onSelect: (id: string | null) => void }) {
  const basement = s.loc === 'basement';
  const items: { id: string; name: string; sub: string; ok: boolean }[] = basement
    ? [
        ...FURN_ORDER.map((id) =>
          id === 'generator'
            ? { id: id as string, name: FURN[id].name, sub: s.genStock > 0 ? `в запасе ×${s.genStock}` : 'нет в запасе', ok: s.genStock > 0 }
            : { id: id as string, name: FURN[id].name, sub: costText(FURN[id].cost), ok: canAfford(s.res, FURN[id].cost) },
        ),
        { id: 'wire', name: '⚡ Провод', sub: `${costText(WIRE_COST)} · ПКМ — снять`, ok: canAfford(s.res, WIRE_COST) },
        ...(s.inv.workbench > 0 ? [{ id: 'workbench', name: 'Верстак', sub: `в запасе ×${s.inv.workbench}`, ok: true }] : []),
      ]
    : STRUCT_ORDER.filter((id) => s.inv[id] > 0).map((id) => ({ id: id as string, name: STRUCTS[id].name, sub: `×${s.inv[id]}`, ok: true }));
  return (
    <div className="pointer-events-none absolute left-[23rem] right-[12.5rem] top-4 flex justify-center">
      <div className="pointer-events-auto max-h-[12.5rem] max-w-[44rem] overflow-y-auto border border-amber-700/50 bg-black/85 p-3 backdrop-blur-[2px]">
        <div className="mb-2 text-[11px] uppercase tracking-[0.25em] text-amber-200/90">
          <div>{basement ? '🛠 Обустройство подвала' : '🛠 Режим стройки'}</div>
          <div className="mt-1 text-[10px] normal-case tracking-wider text-stone-400">B — закрыть · 1–9 — выбор · R — повернуть · ПКМ — убрать</div>
        </div>
        {items.length === 0 ? (
          <div className="px-2 py-3 text-sm text-stone-400">В инвентаре пусто. Купите постройки у торговца (вкладки «Оборона» и «Турели») или скрафтите на верстаке.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => onSelect(s.buildSel === it.id ? null : it.id)}
                className={`relative cursor-pointer border px-3 py-1.5 text-left text-xs transition ${
                  s.buildSel === it.id ? 'border-amber-300 bg-amber-800/50 text-white' : it.ok ? 'border-stone-600 bg-stone-900/80 text-stone-200 hover:border-amber-500' : 'border-red-900/60 bg-red-950/30 text-red-300/80 hover:border-red-700'
                }`}
              >
                <span className="absolute right-1 top-0 text-[9px] text-stone-500">{i < 9 ? i + 1 : ''}</span>
                <div className="font-bold uppercase tracking-wider">{it.name}</div>
                <div className="text-[10px] text-stone-400">{it.sub}</div>
              </button>
            ))}
          </div>
        )}
        {s.buildSel && (
          <div className={`mt-2 text-xs uppercase tracking-widest ${s.buildOk ? 'text-lime-300/90' : 'text-red-300/90'}`}>
            {s.wireMode
              ? s.buildOk
                ? s.wireFrom
                  ? 'ЛКМ — подключить сюда'
                  : 'ЛКМ — начать провод отсюда'
                : s.buildReason || '—'
              : s.buildOk
                ? 'ЛКМ — поставить здесь'
                : `Нельзя: ${s.buildReason || '—'}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hud({ s, onBuildSelect }: { s: Snapshot; onBuildSelect: (id: string | null) => void }) {
  const w = WEAPONS[s.weapon];
  const reserve = s.reserve[w.ammo];
  const lowAmmo = !w.melee && s.mag === 0 && reserve === 0;

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-mono text-stone-200">
      {/* Левый верх: ресурсы */}
      <div className="absolute left-4 top-4 space-y-1">
        <div className="flex items-center gap-2 border border-stone-500/40 bg-black/55 px-3 py-1.5 text-xl font-bold tracking-wide text-amber-200/90 backdrop-blur-[2px]">
          <span className="text-amber-300/80">₽</span> {s.money}
        </div>
        <div className="flex items-center gap-2 border border-stone-500/40 bg-black/55 px-3 py-1 text-xs uppercase tracking-widest">
          <span className={s.phase === 'night' ? 'text-cyan-300' : 'text-amber-200'}>{s.phase === 'night' ? '☾ Ночь' : '☀ День'} {s.day}</span>
          {s.phase === 'day' && s.wave > 0 && <span className="text-stone-400">· волна {s.waveInDay}/5</span>}
          {s.loc === 'basement' && <span className="text-stone-400">· подвал</span>}
          {s.inside && <span className="text-amber-300/90">· {s.inside === 'upper' ? 'второй этаж' : 'подвал дома'}</span>}
          {s.phase === 'night' && !s.inside && s.loc === 'surface' && <span className="text-cyan-200/80">· город открыт</span>}
        </div>
        <div className="flex items-center gap-3 border border-stone-500/40 bg-black/55 px-3 py-1 text-xs tabular-nums">
          {RES_ORDER.map((r) => (
            <span key={r} title={RES[r].name} style={{ color: RES[r].color }}>
              {RES[r].icon} {s.res[r]}
            </span>
          ))}
        </div>
        {FRAME_ORDER.some((f) => s.res[f] > 0) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border border-amber-800/40 bg-black/55 px-3 py-1 text-[11px] tabular-nums text-amber-200/90">
            <span className="uppercase tracking-widest text-stone-400">Основы:</span>
            {FRAME_ORDER.filter((f) => s.res[f] > 0).map((f) => (
              <span key={f} title={RES[f].name}>
                {RES[f].icon} {RES[f].name.replace('Основа ', '').replace('штурмовой винтовки', 'штурм. винт.').replace('снайперской винтовки', 'снайп.')} ×{s.res[f]}
              </span>
            ))}
          </div>
        )}
        <div className="border border-stone-500/40 bg-black/55 px-3 py-1.5 text-xs uppercase tracking-widest text-stone-300">
          {s.phase === 'night' ? (
            <>
              Ночь · <b className="text-cyan-300">вылазка</b> · Зомби: <b className="text-red-300/90">{s.enemiesLeft}</b>
            </>
          ) : s.wave > 0 ? (
            <>
              Волна <b className="text-stone-100">{s.wave}</b> · Врагов:{' '}
              <b className="text-red-300/90">{s.enemiesLeft}</b>
            </>
          ) : (
            <>Приготовьтесь…</>
          )}
          <div className="mt-0.5 text-[11px] text-stone-400">
            Убито: {s.kills} · Время: {Math.floor(s.time / 60)}:{String(s.time % 60).padStart(2, '0')}
          </div>
        </div>
        {s.intermission > 0 && s.wave > 0 && (
          <div className="border border-amber-700/50 bg-amber-950/60 px-3 py-1.5 text-xs uppercase tracking-widest text-amber-200/90">
            Следующая волна через {s.intermission} с
          </div>
        )}
        {s.intermission > 0 && s.wave === 0 && (
          <div className="border border-amber-700/50 bg-amber-950/60 px-3 py-1.5 text-xs uppercase tracking-widest text-amber-200/90">
            Первая волна через {s.intermission} с
          </div>
        )}
      </div>

      {/* Тосты */}
      <div className="absolute left-4 top-60 max-w-[17rem] space-y-1.5">
        {s.toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-[fadein_0.2s_ease-out] border-l-4 bg-black/60 px-3 py-1 text-sm ${
              t.kind === 'good' ? 'border-lime-600/80 text-lime-100/90' : t.kind === 'bad' ? 'border-red-700/80 text-red-200/90' : 'border-stone-400/70 text-stone-200'
            }`}
            style={{ opacity: Math.min(1, t.t * 1.5) }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Босс */}
      {s.boss && (
        <div className={`absolute inset-x-0 flex justify-center px-4 ${s.buildOpen ? 'top-[14rem]' : 'top-4'}`}>
          <div className="w-full max-w-xl">
            <div className="mb-1 flex items-end justify-between">
              <span className="font-display text-lg uppercase tracking-[0.3em] text-red-400 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">☠ {s.boss.name}</span>
              <span className="font-mono text-xs text-stone-300">
                {s.boss.hp} / {s.boss.max}
              </span>
            </div>
            <div className="h-3.5 border border-red-900/80 bg-black/70 p-[2px]">
              <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-[width] duration-150" style={{ width: `${(s.boss.hp / s.boss.max) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Аирдроп: ожидание */}
      {s.incoming !== null && (
        <div className={`absolute inset-x-0 flex justify-center ${s.buildOpen ? 'top-[20rem]' : 'top-[30%]'}`}>
          <div className="animate-pulse border border-red-700/60 bg-black/65 px-5 py-2 text-sm uppercase tracking-[0.3em] text-red-200">
            ✈ Аирдроп прибудет через {s.incoming} с
          </div>
        </div>
      )}

      {/* Баннер */}
      {s.banner && (
        <div className={`absolute inset-x-0 flex flex-col items-center text-center ${s.buildOpen ? 'top-[15rem]' : 'top-[18%]'}`}>
          <div className="animate-[fadein_0.4s_ease-out] border-y border-stone-500/50 bg-black/55 px-12 py-3 backdrop-blur-[2px]">
            <div className="text-3xl font-black uppercase tracking-[0.25em] text-stone-100 drop-shadow">{s.banner.title}</div>
            <div className="mt-1 text-sm tracking-wider text-stone-300/90">{s.banner.sub}</div>
          </div>
        </div>
      )}

      {/* Подсказка ящика */}
      {s.crate?.near && (
        <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-2">
          <div className="border border-amber-400/70 bg-black/75 px-5 py-2 text-sm uppercase tracking-widest text-amber-100">
            <span className="mr-2 border border-amber-400/80 px-1.5 py-0.5 text-amber-300">E</span>
            Удерживайте, чтобы открыть груз
          </div>
          <div className="h-2 w-64 border border-amber-700/70 bg-black/70 p-[1px]">
            <div className="h-full bg-gradient-to-r from-amber-600 to-yellow-300" style={{ width: `${s.crate.progress * 100}%` }} />
          </div>
        </div>
      )}

      {/* Контекстная подсказка */}
      {s.prompt && !s.crate?.near && !s.buildSel && (
        <div className="absolute inset-x-0 bottom-28 flex flex-col items-center gap-2">
          <div className="border border-amber-500/70 bg-black/75 px-5 py-2 text-sm uppercase tracking-widest text-amber-100">
            <span className="mr-2 border border-amber-400/80 px-1.5 py-0.5 text-amber-300">E</span>
            {s.prompt}
          </div>
          {s.promptProgress >= 0 && (
            <div className="h-2 w-64 border border-amber-700/70 bg-black/70 p-[1px]">
              <div className="h-full bg-gradient-to-r from-amber-600 to-yellow-300" style={{ width: `${s.promptProgress * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {s.onTower && (
        <div className="absolute inset-x-0 top-24 flex justify-center">
          <div className="border border-cyan-700/60 bg-black/65 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-cyan-200">▲ Вы на вышке · пули летят над укрытиями</div>
        </div>
      )}

      {s.buildOpen && <BuildPanel s={s} onSelect={onBuildSelect} />}

      {/* Подсказка торговца */}
      {s.nearTrader && !s.shopOpen && !s.crate?.near && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center">
          <div className="animate-pulse border border-amber-600/60 bg-black/70 px-5 py-2 text-sm uppercase tracking-widest text-amber-100">
            <span className="mr-2 border border-amber-500/70 px-1.5 py-0.5 text-amber-300">E</span>
            Поговорить с торговцем
          </div>
        </div>
      )}

      {/* Левый низ: здоровье */}
      <div className="absolute bottom-4 left-4 space-y-1.5 border border-stone-500/40 bg-black/55 p-3 backdrop-blur-[2px]">
        <Bar value={s.hp} max={s.maxHp} color="linear-gradient(#a8483a,#7c2c22)" label="HP" icon="✚" />
        <Bar value={s.armor} max={100} color="linear-gradient(#8a9aa4,#5e6e78)" label="БР" icon="⛨" />
        {(s.bandages > 0 || s.firstAids > 0) && (
          <div className="flex gap-3 pt-0.5 text-[11px] uppercase tracking-widest">
            <span className={s.bandages > 0 ? 'text-stone-200' : 'text-stone-600'}>
              <b className="mr-1 border border-stone-500/70 px-1 text-amber-300">G</b>Бинты ×{s.bandages}
            </span>
            <span className={s.firstAids > 0 ? 'text-stone-200' : 'text-stone-600'}>
              <b className="mr-1 border border-stone-500/70 px-1 text-amber-300">H</b>Аптечки ×{s.firstAids}
            </span>
          </div>
        )}
        {(s.burning || s.slowed) && (
          <div className="flex gap-2 pt-0.5 text-[11px] uppercase tracking-widest">
            {s.burning && <span className="animate-pulse border border-orange-600/70 bg-orange-950/60 px-2 py-0.5 text-orange-300">🔥 Горите</span>}
            {s.slowed && <span className="border border-lime-700/70 bg-lime-950/60 px-2 py-0.5 text-lime-300">☣ Замедление</span>}
          </div>
        )}
      </div>

      {/* Сигнальный пистолет */}
      {s.flareGun && (
        <div className="absolute bottom-4 left-[19.5rem] hidden items-center gap-2 border border-red-800/50 bg-black/60 px-3 py-2 text-xs uppercase tracking-widest text-stone-300 md:flex">
          <span className="border border-red-500/70 px-1.5 py-0.5 text-red-300">F</span>
          <span>Сигнал</span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-3 w-1.5 ${i < s.flares ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-stone-700'}`} />
            ))}
          </span>
        </div>
      )}

      {/* Правый низ: оружие */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex max-w-[34rem] flex-wrap justify-end gap-1.5">
          {s.owned.map((id, i) => {
            const active = id === s.weapon;
            const sp = WEAPONS[id].special;
            return (
              <div
                key={id}
                className={`relative flex h-11 w-[4.4rem] flex-col items-center justify-center border text-[10px] leading-tight transition ${
                  active
                    ? sp
                      ? 'border-cyan-300/90 bg-cyan-900/50 text-white shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                      : 'border-amber-300/80 bg-stone-700/70 text-stone-50'
                    : sp
                      ? 'border-cyan-800/60 bg-black/55 text-cyan-200/80'
                      : 'border-stone-500/50 bg-black/55 text-stone-300'
                }`}
              >
                <span className="absolute left-1 top-0.5 text-[10px] text-stone-400">{i < 10 ? (i + 1) % 10 : ''}</span>
                <span className="mt-2 px-1 text-center">{WEAPONS[id].short}</span>
              </div>
            );
          })}
        </div>
        <div className="text-right text-[10px] uppercase tracking-widest text-stone-500">
          <b className="mr-1 border border-stone-500/70 px-1 text-amber-300">V</b>холодное оружие · <b className="mr-1 border border-stone-500/70 px-1 text-amber-300">Q</b>прошлое
        </div>
        <div className="min-w-[17rem] border border-stone-500/40 bg-black/60 p-3 backdrop-blur-[2px]">
          <div className="text-xs uppercase tracking-widest text-stone-400">{w.name}</div>
          {w.melee ? (
            <>
              <div className="mt-1 flex items-baseline justify-end gap-2">
                <span className="text-3xl font-black text-stone-100">⚔</span>
                <span className="text-lg uppercase tracking-widest text-stone-300">В руках</span>
              </div>
              <div className="mt-0.5 text-right text-[11px] text-stone-500">Ближний бой · ЛКМ — удар · урон {w.damage}</div>
            </>
          ) : (
            <>
              <div className="mt-1 flex items-baseline justify-end gap-2">
                <span className={`text-4xl font-black tabular-nums ${s.mag === 0 ? 'text-red-400' : 'text-stone-100'}`}>{s.mag}</span>
                <span className="text-xl text-stone-500">/</span>
                <span className={`text-2xl tabular-nums ${reserve === 0 ? 'text-red-400/80' : 'text-stone-300'}`}>{reserve}</span>
              </div>
              <div className="mt-0.5 text-right text-[11px] text-stone-500">{AMMO[w.ammo].name}</div>
            </>
          )}
          <div className="mt-2 h-1.5 overflow-hidden bg-stone-800">
            {s.reloadProgress >= 0 && <div className="h-full bg-amber-300/80" style={{ width: `${s.reloadProgress * 100}%` }} />}
          </div>
          <div className="mt-1 h-4 text-right text-[11px] uppercase tracking-wider">
            {s.reloadProgress >= 0 ? (
              <span className="text-amber-200/90">Перезарядка…</span>
            ) : w.melee ? null : lowAmmo ? (
              <span className="text-red-300">Нет патронов — к торговцу!</span>
            ) : !w.melee && s.mag === 0 ? (
              <span className="text-amber-200/90">[R] Перезарядить</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
