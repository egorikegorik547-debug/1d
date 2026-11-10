
import { useCallback, useEffect, useRef, useState } from 'react';
import { Game, emptyInv, type ShopItem, type Snapshot } from '../game/engine';
import { generateWorld, type World } from '../game/world';
import { emptyReserve } from '../game/weapons';
import { emptyRes } from '../game/items';
import { initAudio } from '../game/audio';
import Hud from './Hud';
import Shop from './Shop';
import Workbench from './Workbench';
import MainMenu from './MainMenu';
import { DeadScreen, PauseMenu } from './Screens';

let cachedWorld: World | null = null;

const EMPTY: Snapshot = {
  state: 'menu',
  paused: false,
  hp: 100,
  maxHp: 100,
  armor: 0,
  money: 0,
  weapon: 'pistol',
  mag: 12,
  magSize: 12,
  reserve: { ...emptyReserve(), '9mm': 48 },
  owned: ['pistol'],
  reloadProgress: -1,
  wave: 0,
  enemiesLeft: 0,
  intermission: 0,
  kills: 0,
  nearTrader: false,
  shopOpen: false,
  banner: null,
  toasts: [],
  time: 0,
  hurt: 0,
  flareGun: false,
  flares: 0,
  incoming: null,
  crate: null,
  boss: null,
  burning: false,
  slowed: false,
  day: 1,
  waveInDay: 0,
  phase: 'day',
  loc: 'surface',
  res: emptyRes(),
  inv: emptyInv(),
  structCount: 0,
  buildOpen: false,
  buildSel: null,
  buildOk: false,
  buildReason: '',
  craftOpen: false,
  prompt: null,
  promptProgress: -1,
  onTower: false,
  hasBench: false,
  furnBuilt: {},
  bandages: 0,
  firstAids: 0,
  genStock: 0,
  wireMode: false,
  wireFrom: false,
  inside: null,
};

export default function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let game: Game | null = null;
    // небольшая задержка, чтобы показать экран загрузки до тяжёлой генерации города
    const t = window.setTimeout(() => {
      if (cancelled || !canvasRef.current) return;
      if (!cachedWorld) cachedWorld = generateWorld(1337);
      game = new Game(canvasRef.current, cachedWorld, setSnap);
      gameRef.current = game;
      if (new URLSearchParams(window.location.search).has('debug')) (window as unknown as { __game: Game }).__game = game;
      setReady(true);
    }, 30);
    // аудио можно запустить только после жеста пользователя
    const unlock = () => initAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      game?.destroy();
      gameRef.current = null;
    };
  }, []);

  const start = useCallback(() => gameRef.current?.start(), []);
  const toMenu = useCallback(() => gameRef.current?.toMenu(), []);
  const resume = useCallback(() => gameRef.current?.setPaused(false), []);
  const buy = useCallback((item: ShopItem) => gameRef.current?.buy(item), []);
  const closeShop = useCallback(() => gameRef.current?.setShop(false), []);
  const closeCraft = useCallback(() => gameRef.current?.setCraft(false), []);
  const craft = useCallback((id: string) => gameRef.current?.craft(id), []);
  const buildSelect = useCallback((id: string | null) => gameRef.current?.selectBuild(id), []);
  const save = useCallback(async (slot: number) => {
    await gameRef.current?.saveGame(slot);
  }, []);
  const load = useCallback(async (slot: number) => (await gameRef.current?.loadSlot(slot)) ?? false, []);

  const uiOpen = snap.shopOpen || snap.craftOpen || snap.paused;
  const hideCursor = snap.state === 'playing' && !uiOpen && (snap.loc === 'surface' || !!snap.buildSel);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black" style={{ cursor: hideCursor ? 'none' : 'default' }}>
      <canvas ref={canvasRef} className="absolute inset-0 block" style={{ cursor: hideCursor ? 'none' : 'default' }} />
      {snap.state === 'playing' && <Hud s={snap} onBuildSelect={buildSelect} />}
      {snap.state === 'playing' && snap.shopOpen && <Shop s={snap} onBuy={buy} onClose={closeShop} />}
      {snap.state === 'playing' && snap.craftOpen && <Workbench s={snap} onCraft={craft} onClose={closeCraft} />}
      {snap.state === 'playing' && snap.paused && <PauseMenu onResume={resume} onMenu={toMenu} onSave={save} onLoad={load} />}
      {snap.state === 'menu' && <MainMenu onStart={start} onLoad={load} loading={!ready} />}
      {snap.state === 'dead' && <DeadScreen s={snap} onRestart={start} onMenu={toMenu} onLoad={load} />}
    </div>
  );
}
