
import { applyVolumes, sfx } from '../game/audio';
import {
  CROSSHAIR_COLORS,
  DIFFICULTY,
  resetSettings,
  setSetting,
  useSettings,
  type CrosshairColor,
  type CrosshairStyle,
  type Difficulty,
  type Quality,
  type Settings,
} from '../game/settings';
import { Section, Segmented, Slider, Toggle } from './ui';

export default function SettingsPanel() {
  const s = useSettings();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSetting(k, v);
    if (k === 'master' || k === 'sfx' || k === 'music') applyVolumes();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Звук">
        <Slider label="Общая громкость" value={s.master} onChange={(v) => set('master', v)} />
        <Slider label="Эффекты" value={s.sfx} onChange={(v) => set('sfx', v)} />
        <Slider label="Музыка" value={s.music} onChange={(v) => set('music', v)} />
        <button
          onClick={() => sfx.explosion(120)}
          className="mt-1 cursor-pointer border border-stone-600 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-stone-300 hover:border-amber-500/70 hover:text-amber-200"
        >
          ▶ Проверить звук
        </button>
      </Section>

      <Section title="Графика">
        <Segmented<Quality>
          label="Частицы и кровь"
          value={s.particles}
          onChange={(v) => set('particles', v)}
          options={[
            { id: 'low', label: 'Низко' },
            { id: 'med', label: 'Средне' },
            { id: 'high', label: 'Высоко' },
          ]}
        />
        <Slider label="Затемнение по краям" value={s.vignette} onChange={(v) => set('vignette', v)} />
        <Slider label="Тряска экрана" value={s.shake} onChange={(v) => set('shake', v)} />
        <Slider label="Обзор мышью" value={s.look} min={0} max={0.4} step={0.01} format={(v) => Math.round((v / 0.4) * 100) + '%'} onChange={(v) => set('look', v)} />
      </Section>

      <Section title="Интерфейс">
        <Toggle label="Миникарта" desc="Радар в правом верхнем углу" value={s.minimap} onChange={(v) => set('minimap', v)} />
        <Toggle label="Цифры урона" desc="Всплывающий урон над врагами" value={s.dmgNumbers} onChange={(v) => set('dmgNumbers', v)} />
        <Toggle label="Счётчик FPS" value={s.fps} onChange={(v) => set('fps', v)} />
        <Segmented<CrosshairStyle>
          label="Вид прицела"
          value={s.crosshair}
          onChange={(v) => set('crosshair', v)}
          options={[
            { id: 'cross', label: 'Крест' },
            { id: 'dot', label: 'Точка' },
            { id: 'circle', label: 'Круг' },
          ]}
        />
        <Segmented<CrosshairColor>
          label="Цвет прицела"
          value={s.crosshairColor}
          onChange={(v) => set('crosshairColor', v)}
          options={(Object.keys(CROSSHAIR_COLORS) as CrosshairColor[]).map((id) => ({
            id,
            label: { white: 'Белый', lime: 'Зелёный', red: 'Красный', amber: 'Янтарь', cyan: 'Голубой' }[id],
            swatch: `rgb(${CROSSHAIR_COLORS[id]})`,
          }))}
        />
      </Section>

      <Section title="Геймплей">
        <Segmented<Difficulty>
          label="Сложность"
          value={s.difficulty}
          onChange={(v) => set('difficulty', v)}
          options={(Object.keys(DIFFICULTY) as Difficulty[]).map((id) => ({ id, label: DIFFICULTY[id].name, swatch: DIFFICULTY[id].color }))}
        />
        <p className="mt-1 text-xs text-stone-500">
          {DIFFICULTY[s.difficulty].desc}. Здоровье врагов ×{DIFFICULTY[s.difficulty].hp}, урон ×{DIFFICULTY[s.difficulty].dmg}, награда ×{DIFFICULTY[s.difficulty].reward}. Применяется при новой игре.
        </p>
        <button
          onClick={() => {
            sfx.click();
            resetSettings();
            applyVolumes();
          }}
          className="mt-4 cursor-pointer border border-red-900/70 bg-red-950/30 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-red-300/90 hover:bg-red-900/40"
        >
          ↺ Сбросить настройки
        </button>
      </Section>
    </div>
  );
}
