
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { sfx } from '../game/audio';
import { DIFFICULTY, setSetting, useSettings, type Difficulty } from '../game/settings';
import { getRecords } from '../game/records';
import { AMMO, MELEE_ORDER, SPECIAL_ORDER, WEAPONS, WEAPON_ORDER, type WeaponDef } from '../game/weapons';
import { ENEMIES, ENEMY_ORDER } from '../game/enemies';
import SavePanel from './SavePanel';
import SettingsPanel from './SettingsPanel';
import { EnemyPreview, WeaponPreview } from './Previews';
import { StatBar } from './ui';

type View = 'home' | 'settings' | 'arsenal' | 'bestiary' | 'controls' | 'load';

const TIPS = [
  'Купите сигнальный пистолет у торговца и вызовите аирдроп — внутри лежит особое оружие.',
  'Вздутые взрываются: стреляйте издалека и пусть взрыв заденет остальных.',
  'Штурмовики почти не чувствуют слабых пуль. Берите крупный калибр или дробь в упор.',
  'Крикун заводит всех вокруг. Убейте его первым.',
  'Каждые 5 волн приходит КОЛОСС. Не стойте на линии его тарана.',
  'Матка рожает ползунов, пока жива. Не дайте ей разойтись.',
  'Токсичный оставляет облако яда — не заходите в него.',
  'В лагере торговца зомби не могут вас достать. Используйте его, чтобы перевести дух.',
];

function Embers() {
  const items = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        dur: 7 + Math.random() * 9,
        delay: -Math.random() * 14,
        drift: (Math.random() - 0.5) * 120,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((e) => (
        <span
          key={e.id}
          className="absolute bottom-[-10px] rounded-full bg-amber-400"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            boxShadow: '0 0 8px 2px rgba(251,146,60,0.8)',
            animation: `ember ${e.dur}s linear ${e.delay}s infinite`,
            ['--drift' as string]: `${e.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function MenuButton({
  index,
  label,
  sub,
  onClick,
  active,
  primary,
  disabled,
}: {
  index: string;
  label: string;
  sub: string;
  onClick: () => void;
  active?: boolean;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={() => {
        sfx.click();
        onClick();
      }}
      onMouseEnter={() => sfx.hover()}
      disabled={disabled}
      className={`group relative flex w-full cursor-pointer items-center gap-4 overflow-hidden border-l-4 text-left transition-all duration-200 disabled:cursor-wait disabled:opacity-60 ${
        primary
          ? 'border-amber-400 bg-gradient-to-r from-amber-600/50 via-amber-700/25 to-transparent px-5 py-4 hover:from-amber-500/70 hover:pl-8'
          : active
            ? 'border-amber-400 bg-gradient-to-r from-stone-700/70 to-transparent px-5 py-2.5 pl-8'
            : 'border-stone-600/70 bg-gradient-to-r from-black/50 to-transparent px-5 py-2.5 hover:border-amber-400/80 hover:from-stone-800/80 hover:pl-8'
      }`}
    >
      <span className={`font-mono text-xs ${primary ? 'text-amber-300' : 'text-stone-500 group-hover:text-amber-300'}`}>{index}</span>
      <span className="flex-1">
        <span className={`font-display block uppercase tracking-[0.18em] ${primary ? 'text-2xl text-amber-50' : 'text-lg text-stone-200 group-hover:text-white'}`}>{label}</span>
        <span className="block text-[11px] uppercase tracking-[0.2em] text-stone-500 group-hover:text-stone-400">{sub}</span>
      </span>
      <span className={`text-xl transition-transform group-hover:translate-x-1 ${primary ? 'text-amber-300' : 'text-stone-600 group-hover:text-amber-300'}`}>›</span>
      {primary && <span className="pointer-events-none absolute inset-y-0 -left-20 w-16 -skew-x-12 bg-white/10 transition-all duration-700 group-hover:left-[110%]" />}
    </button>
  );
}

function Panel({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="flex max-h-full min-h-0 w-full flex-col border border-stone-600/60 bg-gradient-to-b from-stone-900/92 to-black/92 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-sm animate-[panelin_0.3s_ease-out]">
      <div className="flex items-center justify-between border-b border-stone-700/70 bg-black/40 px-5 py-3">
        <div>
          <div className="font-display text-2xl uppercase tracking-[0.2em] text-stone-100">{title}</div>
          {sub && <div className="text-[11px] uppercase tracking-[0.25em] text-stone-500">{sub}</div>}
        </div>
        <button
          onClick={() => {
            sfx.click();
            onClose();
          }}
          className="cursor-pointer border border-stone-600 px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-stone-300 transition hover:border-amber-400 hover:text-amber-200"
        >
          ✕ Назад
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  );
}

/* ----------------------------- Арсенал ----------------------------- */
function WeaponCard({ w, locked }: { w: WeaponDef; locked: boolean }) {
  return (
    <div className={`flex flex-col border p-3 ${w.special ? 'border-cyan-700/40 bg-gradient-to-br from-cyan-950/25 to-stone-950/80' : 'border-stone-700/60 bg-stone-900/70'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-sm uppercase tracking-wider text-stone-100">{locked ? '??? ЗАСЕКРЕЧЕНО' : w.name}</div>
        {!w.special && (
          <span className="shrink-0 font-mono text-xs text-amber-300/90">
            {w.melee ? 'верстак' : w.homemade ? `${w.price} ₽ · самоделка` : w.price === 0 ? 'старт' : 'верстак · основа'}
          </span>
        )}
        {w.special && <span className="shrink-0 border border-cyan-500/50 px-1.5 text-[10px] uppercase text-cyan-300">аирдроп</span>}
      </div>
      <div className="my-2 flex justify-center bg-black/40 py-1">
        <WeaponPreview id={w.id} dim={locked} />
      </div>
      <p className="min-h-[2.4rem] text-xs text-stone-400">{locked ? 'Вызовите аирдроп сигнальным пистолетом и найдите это оружие в ящике.' : w.desc}</p>
      {!locked && w.perk && <p className="mt-1 text-xs text-cyan-300/90">★ {w.perk}</p>}
      {!locked && (
        <div className="mt-2 space-y-1">
          <StatBar label="Урон" value={(w.damage * w.pellets) / 320} color={w.special ? 'bg-cyan-300/80' : 'bg-stone-300/80'} />
          <StatBar label="Скорость" value={Math.min(1, 1 / w.cooldown / 14)} />
          <StatBar label="Дальность" value={w.range / 1800} />
          {!w.melee && <StatBar label="Магазин" value={w.mag / 60} />}
          <div className="pt-1 text-[11px] text-stone-500">{w.melee ? 'Ближний бой — боеприпасы не нужны' : `Боеприпасы: ${AMMO[w.ammo].name}`}</div>
        </div>
      )}
    </div>
  );
}

function Arsenal() {
  const [tab, setTab] = useState<'basic' | 'special'>('basic');
  const found = useMemo(() => getRecords().found, []);
  return (
    <>
      <div className="mb-4 flex gap-2">
        {(
          [
            ['basic', `Обычное · ${WEAPON_ORDER.length + MELEE_ORDER.length}`],
            ['special', `Особое · ${found.filter((f) => SPECIAL_ORDER.includes(f as never)).length}/${SPECIAL_ORDER.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              sfx.click();
              setTab(id);
            }}
            className={`cursor-pointer border px-4 py-2 text-xs uppercase tracking-[0.2em] ${tab === id ? 'border-amber-400/80 bg-amber-600/20 text-amber-100' : 'border-stone-700 text-stone-400 hover:text-stone-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'special' && <p className="mb-3 text-sm text-stone-400">Особое оружие нельзя купить — оно лежит только в ящиках с аирдропа. Найденные образцы открываются здесь навсегда.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(tab === 'basic' ? [...WEAPON_ORDER, ...MELEE_ORDER] : SPECIAL_ORDER).map((id) => (
          <WeaponCard key={id} w={WEAPONS[id]} locked={WEAPONS[id].special && !found.includes(id)} />
        ))}
      </div>
    </>
  );
}

/* ---------------------------- Бестиарий ---------------------------- */
function Bestiary() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ENEMY_ORDER.map((t) => {
        const d = ENEMIES[t];
        return (
          <div key={t} className={`flex gap-3 border p-3 ${d.boss ? 'border-red-800/60 bg-gradient-to-br from-red-950/40 to-stone-950/80 sm:col-span-2 xl:col-span-3' : 'border-stone-700/60 bg-stone-900/70'}`}>
            <div className="shrink-0 border border-stone-800 bg-black/40">
              <EnemyPreview type={t} size={d.boss ? 120 : 92} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className={`font-display text-sm uppercase tracking-wider ${d.boss ? 'text-red-300' : 'text-stone-100'}`}>{d.name}</div>
                <span className="shrink-0 border border-stone-600 px-1.5 text-[10px] uppercase text-stone-400">{d.boss ? 'каждые 5 волн' : t === 'bandit' ? 'лагеря · засады' : t === 'rat' ? 'подвалы' : `волна ${d.minWave}+`}</span>
              </div>
              <p className="mt-1 text-xs leading-snug text-stone-400">{d.desc}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-amber-300/90">⚡ {d.ability}</p>
              <div className="mt-2 space-y-1">
                <StatBar label="Здоровье" value={Math.min(1, d.hp / 450)} color="bg-red-700/80" />
                <StatBar label="Скорость" value={Math.min(1, d.speed / 130)} color="bg-lime-600/80" />
                <StatBar label="Урон" value={Math.min(1, d.dmg / 50)} color="bg-amber-600/80" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Управление --------------------------- */
function Controls() {
  const rows: [string, string][] = [
    ['W A S D', 'движение'],
    ['Shift', 'бег'],
    ['Мышь', 'прицел и выстрел / удар холодным оружием (ЛКМ)'],
    ['R', 'перезарядка'],
    ['V', 'взять в руки нож/топор/копьё (ещё раз — вернуть огнестрел)'],
    ['G / H', 'бинт (+25 HP) / аптечка (+70 HP)'],
    ['1 – 0', 'выбрать оружие по порядку'],
    ['Колесо / Q', 'листать оружие / предыдущее'],
    ['E', 'торговец · люк · лестница и подвал дома (ночью) · вышка · ворота · верстак · удерживать — ящик'],
    ['B', 'режим стройки (R — повернуть, ЛКМ — поставить, ПКМ — убрать)'],
    ['F', 'выстрелить сигнальной ракетой'],
    ['Esc', 'пауза / закрыть магазин'],
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center gap-4 border border-stone-800 bg-black/30 px-3 py-2">
            <span className="min-w-[8rem] border border-stone-600 bg-black/50 px-2 py-1 text-center font-mono text-xs text-amber-200/90">{k}</span>
            <span className="text-sm text-stone-300">{v}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-stone-400">
        <div className="border border-amber-800/50 bg-amber-950/20 p-4">
          <div className="font-display mb-2 text-base uppercase tracking-[0.2em] text-amber-200">Как вызвать аирдроп</div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Накопите деньги и купите у торговца «Сигнальный пистолет» и сигнальные патроны.</li>
            <li>Выйдите на открытое место и нажмите F — ракета полетит к курсору.</li>
            <li>Подождите: самолёт пролетит над точкой и сбросит ящик на парашюте.</li>
            <li>Подойдите к ящику и удерживайте E. Внутри — особое оружие, броня и боезапас.</li>
          </ol>
          <p className="mt-2 text-xs text-stone-500">Шум падения привлекает зомби. Ящик исчезнет через ~110 секунд.</p>
        </div>
        <p>Лагерь торговца в центре — безопасная зона. Зомби не заходят внутрь, а их пули не пролетают сквозь периметр.</p>
      </div>
    </div>
  );
}

/* ------------------------------ Главная ---------------------------- */
export default function MainMenu({ onStart, onLoad, loading }: { onStart: () => void; onLoad: (slot: number) => Promise<boolean | void>; loading: boolean }) {
  const [view, setView] = useState<View>('home');
  const s = useSettings();
  const rec = useMemo(() => getRecords(), []);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  const foundSpecial = rec.found.filter((f) => SPECIAL_ORDER.includes(f as never)).length;
  const diff = DIFFICULTY[s.difficulty];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && view === 'home' && !loading) onStart();
      if (e.code === 'Escape' && view !== 'home') setView('home');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, loading, onStart]);

  const titles: Record<Exclude<View, 'home'>, [string, string]> = {
    settings: ['Настройки', 'Звук · графика · интерфейс · сложность'],
    arsenal: ['Арсенал', `${WEAPON_ORDER.length + MELEE_ORDER.length} обычных и ${SPECIAL_ORDER.length} особых видов оружия`],
    bestiary: ['Бестиарий', `${ENEMY_ORDER.length} видов заражённых`],
    controls: ['Управление', 'Клавиши, оборона, подвал и вылазки'],
    load: ['Загрузить игру', 'Сохранения хранятся в базе данных и в браузере'],
  };

  return (
    <div className="font-cond absolute inset-0 z-30 select-none overflow-hidden text-stone-200">
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_100%,rgba(180,60,20,0.28),transparent_60%)]" />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
      <Embers />

      <div className="relative flex h-full flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:gap-12 lg:p-12">
        {/* левая колонка */}
        <div className={`${view === 'home' ? 'flex' : 'hidden lg:flex'} min-h-0 w-full flex-col justify-between overflow-y-auto lg:w-[460px] lg:shrink-0`}>
          <div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-stone-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600 shadow-[0_0_10px_#dc2626]" />
              Зона заражения · Выживание
            </div>
            <h1 className="mt-3 leading-[0.9]">
              <span className="glitch font-display block text-5xl uppercase tracking-[0.08em] text-stone-100 sm:text-6xl lg:text-7xl" data-text="МЁРТВЫЙ">
                МЁРТВЫЙ
              </span>
              <span className="font-display block bg-gradient-to-b from-red-500 via-red-600 to-red-900 bg-clip-text text-5xl uppercase tracking-[0.08em] text-transparent drop-shadow-[0_0_24px_rgba(220,38,38,0.55)] sm:text-6xl lg:text-7xl">
                ГОРОД
              </span>
            </h1>
            <p className="mt-4 max-w-sm border-l-2 border-red-800 pl-3 text-sm italic text-stone-400">Волны мертвецов. Один торговец. Один шанс дожить до рассвета.</p>
          </div>

          <div className="my-6 space-y-2">
            <MenuButton index="01" label={loading ? 'Загрузка города…' : 'Играть'} sub={`Сложность: ${diff.name}`} onClick={onStart} primary disabled={loading} />
            <MenuButton index="02" label="Арсенал" sub={`${WEAPON_ORDER.length + MELEE_ORDER.length + SPECIAL_ORDER.length} видов оружия`} onClick={() => setView('arsenal')} active={view === 'arsenal'} />
            <MenuButton index="03" label="Бестиарий" sub={`${ENEMY_ORDER.length} видов зомби`} onClick={() => setView('bestiary')} active={view === 'bestiary'} />
            <MenuButton index="04" label="Настройки" sub="Звук · графика · прицел" onClick={() => setView('settings')} active={view === 'settings'} />
            <MenuButton index="05" label="Управление" sub="Клавиши · оборона · подвал" onClick={() => setView('controls')} active={view === 'controls'} />
            <MenuButton index="06" label="Загрузить игру" sub="Продолжить сохранённую партию" onClick={() => setView('load')} active={view === 'load'} />

            <div className="pt-3">
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.3em] text-stone-500">Сложность</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(DIFFICULTY) as Difficulty[]).map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      sfx.click();
                      setSetting('difficulty', id);
                    }}
                    className={`cursor-pointer border px-1 py-1.5 text-[11px] uppercase tracking-wider transition ${
                      s.difficulty === id ? 'text-black' : 'border-stone-700 bg-black/40 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                    }`}
                    style={s.difficulty === id ? { background: DIFFICULTY[id].color, borderColor: DIFFICULTY[id].color } : undefined}
                  >
                    {DIFFICULTY[id].name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.3em] text-stone-600">
            v2.0 · Enter — начать · <span className="text-stone-500">15 видов зомби · 35 оружий · турели · подвал · вылазки</span>
          </div>
        </div>

        {/* правая колонка */}
        <div className="flex min-h-0 flex-1 items-center">
          {view === 'home' ? (
            <div className="hidden w-full max-w-xl flex-col gap-4 lg:ml-auto lg:flex">
              <div className="border border-stone-700/60 bg-black/55 p-5 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-2 w-2 rotate-45 bg-amber-500" />
                  <span className="font-display text-sm uppercase tracking-[0.3em] text-amber-200/90">Ваши рекорды</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-stone-600 to-transparent" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Волна', rec.bestWave],
                    ['Убийств', rec.bestKills],
                    ['Игр', rec.games],
                    ['Спецоружие', `${foundSpecial}/${SPECIAL_ORDER.length}`],
                  ].map(([k, v]) => (
                    <div key={k} className="border border-stone-800 bg-black/50 py-3">
                      <div className="font-display text-2xl text-stone-100">{v}</div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{k}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-stone-700/60 bg-black/55 p-5 backdrop-blur-sm">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-2 w-2 rotate-45 bg-red-600" />
                  <span className="font-display text-sm uppercase tracking-[0.3em] text-red-300/90">Что нового</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-stone-600 to-transparent" />
                </div>
                <ul className="space-y-2 text-sm text-stone-300">
                  <li className="flex gap-3"><span className="text-red-500">⛫</span> Турели, баррикады, мины, колючка, заборы, ворота и вышка</li>
                  <li className="flex gap-3"><span className="text-cyan-400">☾</span> После 5 волн — ночь: подвал, вылазки в город и крафт на верстаке</li>
                  <li className="flex gap-3"><span className="text-lime-400">⌖</span> 12 новых стволов и красивые 3D-модели оружия в магазине</li>
                  <li className="flex gap-3"><span className="text-amber-400">💾</span> Сохранения в слоты и автосохранение</li>
                  <li className="flex gap-3"><span className="text-amber-400">⌖</span> 8 новых стволов у торговца — от револьвера до «Носорога»</li>
                  <li className="flex gap-3"><span className="text-cyan-400">✦</span> Сигнальный пистолет и аирдропы с 10 особыми оружиями</li>
                  <li className="flex gap-3"><span className="text-lime-400">⚙</span> Настройки: звук, графика, прицел, сложность</li>
                </ul>
              </div>

              <div className="border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100/80 backdrop-blur-sm">
                <span className="mr-2 font-display text-xs uppercase tracking-[0.3em] text-amber-400">Совет</span>
                {tip}
              </div>
            </div>
          ) : (
            <div className="flex h-full max-h-[calc(100vh-4rem)] w-full items-center">
              <Panel title={titles[view][0]} sub={titles[view][1]} onClose={() => setView('home')}>
                {view === 'settings' && <SettingsPanel />}
                {view === 'arsenal' && <Arsenal />}
                {view === 'bestiary' && <Bestiary />}
                {view === 'controls' && <Controls />}
                {view === 'load' && <SavePanel canSave={false} onLoad={onLoad} />}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
