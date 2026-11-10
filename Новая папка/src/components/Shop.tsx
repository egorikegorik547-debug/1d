
import { useState } from 'react';
import {
  AMMO,
  AMMO_ORDER,
  ARMOR_PRICE,
  ALL_ORDER,
  FLAREGUN_PRICE,
  FLARE_CAP,
  FLARE_PRICE,
  MEDKIT_HEAL,
  MEDKIT_PRICE,
  WEAPONS,
  SHOP_ORDER,
  type AmmoType,
  type WeaponDef,
} from '../game/weapons';
import type { ShopItem, Snapshot } from '../game/engine';
import { AmmoPreview, StructPreview, WeaponPreview } from './Previews';
import { STRUCTS, STRUCT_ORDER, GAS_PRICE, GEN_PRICE, GEN_CAN, FURN, type StructDef } from '../game/items';
import { GeneratorPreview, FurnPreview } from './ElectroPreview';

type Tab = 'weapons' | 'ammo' | 'gear' | 'defense' | 'turrets' | 'power' | 'supply';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 text-stone-400">{label}</span>
      <div className="h-1.5 flex-1 bg-stone-900">
        <div className="h-full bg-stone-300/80" style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} />
      </div>
    </div>
  );
}

function PriceBtn({ price, money, disabled, label, onClick }: { price: number; money: number; disabled?: boolean; label?: string; onClick: () => void }) {
  const cant = money < price;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto mt-3 w-full border px-3 py-2 text-sm font-bold uppercase tracking-widest transition ${
        disabled
          ? 'cursor-default border-stone-700 bg-stone-800/60 text-stone-500'
          : cant
            ? 'cursor-pointer border-red-900/70 bg-red-950/40 text-red-300/80 hover:bg-red-950/60'
            : 'cursor-pointer border-amber-600/70 bg-amber-900/40 text-amber-100 hover:bg-amber-700/50'
      }`}
    >
      {label ?? `Купить · ${price} ₽`}
    </button>
  );
}

function WeaponCard({ w, owned, equipped, money, onBuy }: { w: WeaponDef; owned: boolean; equipped: boolean; money: number; onBuy: () => void }) {
  return (
    <div className={`flex flex-col border bg-stone-900/80 p-4 ${equipped ? 'border-amber-500/60' : 'border-stone-600/50'}`}>
      <div className="flex items-start justify-between">
        <div className="text-base font-bold uppercase tracking-wider text-stone-100">{w.name}</div>
        {owned && <span className="border border-lime-700/60 px-1.5 text-[10px] uppercase text-lime-300/80">{equipped ? 'В руках' : 'Есть'}</span>}
      </div>
      <div className="my-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
        <WeaponPreview id={w.id} width={260} height={96} showcase />
      </div>
      <p className="min-h-[2.6rem] text-xs text-stone-400">{w.desc}</p>
      <div className="mt-2 space-y-1">
        <Stat label="Урон" value={(w.damage * w.pellets) / 300} />
        <Stat label="Скорость" value={Math.min(1, 1 / w.cooldown / 14)} />
        <Stat label="Дальность" value={w.range / 1800} />
        <Stat label="Магазин" value={w.mag / 60} />
      </div>
      <div className="mt-2 text-[11px] text-stone-500">Боеприпасы: {AMMO[w.ammo].name.replace(/^(Патроны|Картечь) /, "")}</div>
      {w.price === 0 ? (
        <PriceBtn price={0} money={money} disabled label="Стартовое оружие" onClick={() => {}} />
      ) : (
        <PriceBtn price={w.price} money={money} disabled={owned} label={owned ? 'Куплено' : undefined} onClick={onBuy} />
      )}
    </div>
  );
}

function StructCard({ d, have, money, onBuy }: { d: StructDef; have: number; money: number; onBuy: () => void }) {
  return (
    <div className="flex flex-col border border-stone-600/50 bg-stone-900/80 p-4">
      <div className="flex items-start justify-between">
        <div className="text-base font-bold uppercase tracking-wider text-stone-100">{d.name}</div>
        {have > 0 && <span className="border border-lime-700/60 px-1.5 text-[10px] uppercase text-lime-300/80">В запасе: {have}</span>}
      </div>
      <div className="my-2 flex justify-center overflow-hidden border border-stone-700/60">
        <StructPreview id={d.id} width={260} height={120} />
      </div>
      <p className="min-h-[3.4rem] text-xs text-stone-400">{d.desc}</p>
      <div className="mt-1 space-y-1">
        <Stat label="Прочность" value={d.hp / 800} />
        {d.turret && <Stat label="Дальность" value={d.turret.range / 500} />}
        {d.turret && <Stat label="Урон/с" value={(d.turret.dmg * d.turret.pellets) / d.turret.cd / 700} />}
      </div>
      {d.turret && <div className="mt-2 text-[11px] text-stone-500">Боеприпасы: {AMMO[d.turret.ammo].name} · заряжать клавишей E</div>}
      <PriceBtn price={d.price} money={money} onClick={onBuy} />
    </div>
  );
}

export default function Shop({ s, onBuy, onClose }: { s: Snapshot; onBuy: (item: ShopItem) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('weapons');
  const tabs: [Tab, string][] = [
    ['weapons', 'Оружие'],
    ['ammo', 'Патроны'],
    ['gear', 'Снаряжение'],
    ['defense', 'Оборона ⛨'],
    ['turrets', 'Турели ⛫'],
    ['power', 'Электричество ⚡'],
    ['supply', 'Снабжение ✈'],
  ];

  const visibleAmmo = AMMO_ORDER.filter(
    (a) => AMMO[a].price > 0 && (a === '9x39' || SHOP_ORDER.some((id) => WEAPONS[id].ammo === a) || ALL_ORDER.some((id) => s.owned.includes(id) && WEAPONS[id].ammo === a)),
  );

  const usedBy = (a: AmmoType) =>
    ALL_ORDER.filter((id) => WEAPONS[id].ammo === a && (!WEAPONS[id].special || s.owned.includes(id)))
      .map((id) => WEAPONS[id].name)
      .join(', ');

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-4 font-mono backdrop-blur-[2px]">
      <div className="flex max-h-full w-full max-w-5xl flex-col border-2 border-stone-600/70 bg-gradient-to-b from-stone-800 to-stone-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-600/60 bg-stone-900/80 px-5 py-3">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-stone-100">Торговец</div>
            <div className="text-xs italic text-stone-400">«Самоделки, патроны, броня. Фабричное — только с верстака, сталкер.»</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-amber-700/50 bg-black/50 px-4 py-1.5 text-xl font-bold text-amber-200">₽ {s.money}</div>
            <button
              onClick={onClose}
              className="pointer-events-auto cursor-pointer border border-stone-500/60 px-3 py-1.5 text-xs uppercase tracking-widest text-stone-300 hover:bg-stone-700/60"
            >
              Закрыть [Esc]
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-stone-700/60 bg-stone-900/50 px-5 pt-3">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`pointer-events-auto cursor-pointer border border-b-0 px-5 py-2 text-xs font-bold uppercase tracking-widest ${
                tab === id ? 'border-stone-500 bg-stone-800 text-amber-100' : 'border-stone-700/50 bg-stone-900/60 text-stone-500 hover:text-stone-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {tab === 'weapons' && (
            <div className="space-y-4">
              <div className="border border-amber-900/50 bg-gradient-to-r from-amber-950/30 to-stone-900/80 p-4 text-sm text-stone-300">
                <b className="uppercase tracking-widest text-amber-200">Только самоделки.</b> Торговец продаёт кустарное и самопальное оружие. Фабричное (АКМ, M4, СВД и др.) не продаётся —
                его можно <b>скрафтить на верстаке</b> из <b>основы</b> нужного типа (выпадает из армейских ящиков и лагерей бандитов) и металла. Ножи, топоры и копья тоже делаются на верстаке.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SHOP_ORDER.map((id) => (
                <WeaponCard
                  key={id}
                  w={WEAPONS[id]}
                  owned={s.owned.includes(id)}
                  equipped={s.weapon === id}
                  money={s.money}
                  onBuy={() => onBuy({ kind: 'weapon', id })}
                />
              ))}
              </div>
            </div>
          )}

          {tab === 'defense' && (
            <div className="space-y-4">
              <div className="border border-amber-900/50 bg-gradient-to-r from-amber-950/30 to-stone-900/80 p-4 text-sm text-stone-300">
                Купленное попадает в инвентарь. Нажмите <span className="border border-stone-500 px-1 text-amber-200">B</span> — режим стройки: <b>ЛКМ</b> поставить, <b>R</b> повернуть, <b>ПКМ</b> убрать (вернётся в инвентарь).
                После <b>5 волн</b> день заканчивается — зомби уходят, а в подвале можно обустроить убежище.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STRUCT_ORDER.filter((id) => STRUCTS[id].group !== 'turret').map((id) => (
                  <StructCard key={id} d={STRUCTS[id]} have={s.inv[id]} money={s.money} onBuy={() => onBuy({ kind: 'struct', id })} />
                ))}
              </div>
            </div>
          )}

          {tab === 'turrets' && (
            <div className="space-y-4">
              <div className="border border-cyan-900/50 bg-gradient-to-r from-cyan-950/30 to-stone-900/80 p-4 text-sm text-stone-300">
                Турели сами выбирают цель в зоне видимости. Боезапас заряжается из вашего запаса: подойдите и нажмите <span className="border border-stone-500 px-1 text-amber-200">E</span>.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {STRUCT_ORDER.filter((id) => STRUCTS[id].group === 'turret').map((id) => (
                  <StructCard key={id} d={STRUCTS[id]} have={s.inv[id]} money={s.money} onBuy={() => onBuy({ kind: 'struct', id })} />
                ))}
              </div>
            </div>
          )}

          {tab === 'ammo' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleAmmo.map((id) => {
                const a = AMMO[id];
                const have = s.reserve[id];
                return (
                  <div key={id} className="border border-stone-600/50 bg-stone-900/80 p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-base font-bold uppercase tracking-wider text-stone-100">{a.name}</div>
                      <div className="text-sm text-stone-300">
                        {have}
                        <span className="text-stone-500"> / {a.cap}</span>
                      </div>
                    </div>
                    <div className="my-2 flex justify-center overflow-hidden border border-stone-700/60 bg-black/40">
                      <AmmoPreview type={id} width={300} height={104} />
                    </div>
                    <p className="min-h-[2rem] text-xs text-stone-400">Подходит к: {usedBy(id)}</p>
                    <div className="mt-2 h-1.5 bg-stone-950">
                      <div className="h-full bg-amber-600/70" style={{ width: `${(have / a.cap) * 100}%` }} />
                    </div>
                    <PriceBtn
                      price={a.price}
                      money={s.money}
                      disabled={have >= a.cap}
                      label={have >= a.cap ? 'Полный запас' : `+${a.pack} шт. · ${a.price} ₽`}
                      onClick={() => onBuy({ kind: 'ammo', id })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'power' && (
            <div className="space-y-4">
              <div className="border border-yellow-900/50 bg-gradient-to-r from-yellow-950/30 to-stone-900/80 p-4 text-sm text-stone-300">
                <b className="uppercase tracking-widest text-yellow-300">⚡ Электричество.</b> Генератор ставится в <b>подвале</b> (клавиша <span className="border border-stone-500 px-1 text-amber-200">B</span>) и работает на <b>бензине</b>.
                Заправка — <span className="border border-stone-500 px-1 text-amber-200">F</span>, пуск и остановка — <span className="border border-stone-500 px-1 text-amber-200">E</span>.
                От генератора протяните провода к лампам и лампочкам (инструмент «Провод» в меню стройки). Генератор можно также найти в ящиках или скрафтить на верстаке.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col border border-stone-600/50 bg-stone-900/80 p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-base font-bold uppercase tracking-wider text-stone-100">Бензиновый генератор</div>
                    {s.genStock > 0 && <span className="border border-lime-700/60 px-1.5 text-[10px] uppercase text-lime-300/80">В запасе: {s.genStock}</span>}
                  </div>
                  <div className="my-2 flex justify-center overflow-hidden border border-stone-700/60">
                    <GeneratorPreview width={300} height={130} />
                  </div>
                  <p className="min-h-[3.4rem] text-xs text-stone-400">{FURN.generator.desc} Одного бака хватает надолго, пока подключено немного ламп.</p>
                  <PriceBtn price={GEN_PRICE} money={s.money} onClick={() => onBuy({ kind: 'generator' })} />
                </div>
                <div className="flex flex-col border border-stone-600/50 bg-stone-900/80 p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-base font-bold uppercase tracking-wider text-stone-100">Канистра бензина</div>
                    <div className="text-sm text-stone-300">⛽ {s.res.gas}</div>
                  </div>
                  <div className="my-2 flex justify-center overflow-hidden border border-stone-700/60">
                    <AmmoPreview type="fuel" width={300} height={130} />
                  </div>
                  <p className="min-h-[3.4rem] text-xs text-stone-400">Одна канистра = {GEN_CAN}% бака генератора. Бензин также можно найти в бочках и ящиках, а также выбить из бандитов.</p>
                  <PriceBtn price={GAS_PRICE} money={s.money} label={`+1 канистра · ${GAS_PRICE} ₽`} onClick={() => onBuy({ kind: 'gas' })} />
                </div>
                <div className="flex flex-col border border-stone-600/50 bg-stone-900/80 p-4 sm:col-span-2">
                  <div className="text-base font-bold uppercase tracking-wider text-stone-100">Лампы и лампочки</div>
                  <div className="my-2 grid grid-cols-2 gap-3">
                    <div className="overflow-hidden border border-stone-700/60"><FurnPreview type="lamp" width={200} height={90} /></div>
                    <div className="overflow-hidden border border-stone-700/60"><FurnPreview type="bulb" width={200} height={90} /></div>
                  </div>
                  <p className="text-xs text-stone-400">
                    Лампу и лампочку делают прямо в подвале: меню стройки <span className="border border-stone-500 px-1 text-amber-200">B</span> → «Лампа» / «Лампочка». Каждое подключение требует провода (⚙1 ≋1).
                    Один генератор тянет до 8 потребителей.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'supply' && (
            <div className="space-y-4">
              <div className="border border-red-900/50 bg-gradient-to-r from-red-950/30 to-stone-900/80 p-4 text-sm text-stone-300">
                <b className="uppercase tracking-widest text-red-300">✈ Аирдроп.</b> Выстрелите сигнальной ракетой (клавиша <span className="border border-stone-500 px-1 text-amber-200">F</span>) — самолёт сбросит ящик
                с <b className="text-cyan-300">особым оружием</b>, бронёй и патронами. Подойдите и удерживайте <span className="border border-stone-500 px-1 text-amber-200">E</span>, чтобы открыть. Шум падения привлечёт зомби.
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className={`border bg-stone-900/80 p-4 ${s.flareGun ? 'border-lime-800/60' : 'border-stone-600/50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="text-base font-bold uppercase tracking-wider text-stone-100">Сигнальный пистолет</div>
                    {s.flareGun && <span className="border border-lime-700/60 px-1.5 text-[10px] uppercase text-lime-300/80">Есть</span>}
                  </div>
                  <svg viewBox="0 0 120 40" className="my-3 h-12 w-full">
                    <rect x="22" y="12" width="52" height="11" rx="2" fill="#a8392a" />
                    <rect x="22" y="12" width="52" height="3" fill="#d86a4a" />
                    <rect x="70" y="10" width="26" height="15" rx="3" fill="#4a4d52" />
                    <circle cx="96" cy="17.5" r="5.5" fill="#15171a" />
                    <circle cx="96" cy="17.5" r="2.5" fill="#ff5a3a" />
                    <path d="M24 22 L38 36 L50 36 L44 22 Z" fill="#3a2a20" />
                    <rect x="52" y="23" width="8" height="5" fill="#2a2c2f" />
                  </svg>
                  <p className="min-h-[2.6rem] text-xs text-stone-400">Стреляет яркой ракетой в точку у курсора. Нужен, чтобы вызвать аирдроп. В комплекте — один сигнальный патрон.</p>
                  <PriceBtn price={FLAREGUN_PRICE} money={s.money} disabled={s.flareGun} label={s.flareGun ? 'Куплено' : undefined} onClick={() => onBuy({ kind: 'flaregun' })} />
                </div>
                <div className="border border-stone-600/50 bg-stone-900/80 p-4">
                  <div className="flex items-start justify-between">
                    <div className="text-base font-bold uppercase tracking-wider text-stone-100">Сигнальный патрон</div>
                    <div className="text-sm text-stone-300">
                      {s.flares}
                      <span className="text-stone-500"> / {FLARE_CAP}</span>
                    </div>
                  </div>
                  <div className="my-3 flex h-12 items-center justify-center gap-3">
                    {Array.from({ length: FLARE_CAP }, (_, i) => (
                      <div key={i} className={`h-10 w-4 rounded-t-full border ${i < s.flares ? 'border-red-400 bg-gradient-to-b from-red-500 to-red-900 shadow-[0_0_14px_rgba(239,68,68,0.7)]' : 'border-stone-700 bg-stone-900'}`} />
                    ))}
                  </div>
                  <p className="min-h-[2.6rem] text-xs text-stone-400">Один патрон — один вызов аирдропа. Требует сигнальный пистолет.</p>
                  <PriceBtn
                    price={FLARE_PRICE}
                    money={s.money}
                    disabled={!s.flareGun || s.flares >= FLARE_CAP}
                    label={!s.flareGun ? 'Нужен пистолет' : s.flares >= FLARE_CAP ? 'Полный запас' : `+1 патрон · ${FLARE_PRICE} ₽`}
                    onClick={() => onBuy({ kind: 'flare' })}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'gear' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="border border-stone-600/50 bg-stone-900/80 p-4">
                <div className="flex items-start justify-between">
                  <div className="text-base font-bold uppercase tracking-wider text-stone-100">Бронежилет</div>
                  <div className="text-sm text-stone-300">
                    {s.armor}
                    <span className="text-stone-500"> / 100</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-stone-400">Поглощает 65% входящего урона, пока не износится. Покупка полностью восстанавливает прочность.</p>
                <div className="mt-2 h-1.5 bg-stone-950">
                  <div className="h-full bg-slate-400/70" style={{ width: `${s.armor}%` }} />
                </div>
                <PriceBtn
                  price={ARMOR_PRICE}
                  money={s.money}
                  disabled={s.armor >= 100}
                  label={s.armor >= 100 ? 'Надет, как новый' : `${s.armor > 0 ? 'Починить' : 'Купить'} · ${ARMOR_PRICE} ₽`}
                  onClick={() => onBuy({ kind: 'armor' })}
                />
              </div>
              <div className="border border-stone-600/50 bg-stone-900/80 p-4">
                <div className="flex items-start justify-between">
                  <div className="text-base font-bold uppercase tracking-wider text-stone-100">Аптечка</div>
                  <div className="text-sm text-stone-300">
                    {s.hp}
                    <span className="text-stone-500"> / {s.maxHp}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-stone-400">Восстанавливает {MEDKIT_HEAL} здоровья. Бинты, спирт и немного удачи.</p>
                <div className="mt-2 h-1.5 bg-stone-950">
                  <div className="h-full bg-red-800/80" style={{ width: `${(s.hp / s.maxHp) * 100}%` }} />
                </div>
                <PriceBtn
                  price={MEDKIT_PRICE}
                  money={s.money}
                  disabled={s.hp >= s.maxHp}
                  label={s.hp >= s.maxHp ? 'Вы здоровы' : `Купить · ${MEDKIT_PRICE} ₽`}
                  onClick={() => onBuy({ kind: 'medkit' })}
                />
              </div>
            </div>
          )}
        </div>

        {s.toasts.length > 0 && (
          <div className="border-t border-stone-700/60 bg-black/40 px-5 py-2 text-sm text-amber-100/90">{s.toasts[s.toasts.length - 1].text}</div>
        )}
      </div>
    </div>
  );
}
