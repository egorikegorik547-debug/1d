import {
  AMMO,
  ARMOR_MAX,
  ARMOR_PRICE,
  FLAREGUN_PRICE,
  FLARE_CAP,
  FLARE_PRICE,
  MEDKIT_HEAL,
  MEDKIT_PRICE,
  WEAPONS,
  ALL_ORDER,
  MELEE_ORDER,
  emptyReserve,
  flashLen,
  type AmmoType,
  type WeaponId,
} from './weapons';
import { CELL, CENTER, DAY_RADIUS, GRID, NIGHT_RADIUS, SAFE_RADIUS, WORLD, inCoreRect, regenerateRing, type Access, type Collider, type World } from './world';
import { mulberry32 } from './rng';
import { drawPerson, drawPickup, drawWeapon } from './draw';
import { sfx, initAudio } from './audio';
import { settings, DIFFICULTY, QUALITY_MUL, CROSSHAIR_COLORS } from './settings';
import { saveRun } from './records';
import {
  HATCH,
  addStructure,
  canPlace,
  climbTower,
  drawGhost,
  drawStructures,
  enemyStructContact,
  fallFromTower,
  nearestStruct,
  refillTurret,
  removeStructure,
  sizeOf,
  toggleGate,
  updateStructures,
  type Structure,
} from './structures';
import {
  FURN,
  FRAME_ORDER,
  FURN_ORDER,
  RECIPES,
  RES,
  RES_ORDER,
  STRUCTS,
  STRUCT_ORDER,
  ALL_RES,
  canAfford,
  emptyRes,
  GAS_PRICE,
  GEN_CAN,
  GEN_CAP,
  GEN_PRICE,
  type FurnId,
  type ResId,
  type StructId,
} from './items';
import { connectWire, disconnectWire, genFuelFrac, isConsumer, isSource, updatePower, canWire, refuelAmount } from './power';
import { ENTRY, basementTarget, canPlaceFurn, drawBasement, furnAt, bsView, updateBasement, type Furn } from './basement';
import { CRATE_NAMES, clearExpedition, drawCrates, drawResPickup, nearestCrate, spawnExpedition, updateCrates, type LootCrate } from './expedition';
import { drawDarkness, type Light } from './lighting';
import {
  roomOf,
  buildInterior,
  campLights,
  drawAccessMarkers,
  drawCamps,
  drawCityBorder,
  drawInterior,
  drawInteriorDark,
  populateInterior,
  updateInterior,
  type Interior,
} from './interior';
import { writeSave, readSave, type SaveSummary } from './saves';
import { ENEMIES, enemyAI, drawEnemySprite, type EnemyType } from './enemies';
import {
  drawBullet,
  drawFxGround,
  drawFxTop,
  explode,
  finishBullet,
  fireWeapon,
  updateFx,
  type Beam,
  type Cloud,
  type Field,
  type Floater,
  type Ring,
} from './combat';
import {
  airdropInfo,
  drawAirdropAir,
  drawAirdropGround,
  drawDropPointers,
  drawDropsMinimap,
  fireFlare,
  updateAirdrop,
  type Drop,
  type FlareShot,
} from './airdrop';

export type GameState = 'menu' | 'playing' | 'dead';
export type { EnemyType };

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  angle: number;
  attackCd: number;
  shootCd: number;
  flash: number;
  vx: number;
  vy: number;
  phase: number;
  stuckT: number;
  detourT: number;
  detourDir: number;
  strafe: number;
  dmg: number;
  dead: boolean;
  kbMul: number;
  // способности и состояния
  abilityCd: number;
  act: number;
  actT: number;
  ax: number;
  ay: number;
  aux: number;
  vis: number;
  rage: number;
  burnT: number;
  burnTick: number;
  slowT: number;
  frozenT: number;
  freezeStack: number;
  strCd: number;
  wander: boolean;
  aggro: boolean;
  wa: number;
  wt: number;
  /** место стоянки (лагерь / засада) */
  home?: { x: number; y: number };
  ambush?: boolean;
}

export type BulletKind = 'bullet' | 'flame' | 'cryo' | 'plasma' | 'rocket' | 'missile' | 'singularity' | 'acid';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  maxLife: number;
  speed: number;
  from: 'p' | 'e';
  pierce: number;
  hit: number[];
  dead: boolean;
  kind: BulletKind;
  size: number;
  age: number;
  splash: number;
  splashDmg: number;
  selfDmg: number;
  burn: boolean;
  slow: boolean;
  homing: number;
  target: number;
  nuke: boolean;
  color: string;
  done: boolean;
  high: boolean;
}

export interface Pickup {
  x: number;
  y: number;
  kind: 'cash' | 'ammo' | 'medkit' | 'res';
  amount: number;
  ammo?: AmmoType;
  res?: ResId;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'blood' | 'spark' | 'dust' | 'casing' | 'smoke';
  rot: number;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad';
  t: number;
}

export interface Snapshot {
  state: GameState;
  paused: boolean;
  hp: number;
  maxHp: number;
  armor: number;
  money: number;
  weapon: WeaponId;
  mag: number;
  magSize: number;
  reserve: Record<AmmoType, number>;
  owned: WeaponId[];
  reloadProgress: number;
  wave: number;
  enemiesLeft: number;
  intermission: number;
  kills: number;
  nearTrader: boolean;
  shopOpen: boolean;
  banner: { title: string; sub: string } | null;
  toasts: Toast[];
  time: number;
  hurt: number;
  flareGun: boolean;
  flares: number;
  incoming: number | null;
  crate: { near: boolean; progress: number } | null;
  boss: { name: string; hp: number; max: number } | null;
  burning: boolean;
  slowed: boolean;
  day: number;
  waveInDay: number;
  phase: 'day' | 'night';
  loc: 'surface' | 'basement';
  res: Record<ResId, number>;
  inv: Record<StructId, number>;
  structCount: number;
  buildOpen: boolean;
  buildSel: string | null;
  buildOk: boolean;
  buildReason: string;
  craftOpen: boolean;
  prompt: string | null;
  promptProgress: number;
  onTower: boolean;
  hasBench: boolean;
  furnBuilt: Record<string, number>;
  bandages: number;
  firstAids: number;
  genStock: number;
  wireMode: boolean;
  wireFrom: boolean;
  inside: 'upper' | 'cellar' | null;
}

export interface SaveData {
  v: number;
  day: number;
  phase: 'day' | 'night';
  loc: 'surface' | 'basement';
  resume: number;
  money: number;
  kills: number;
  survived: number;
  hp: number;
  maxHp: number;
  armor: number;
  weapon: WeaponId;
  owned: Record<string, { mag: number }>;
  reserve: Record<AmmoType, number>;
  flares: number;
  hasFlareGun: boolean;
  inv: Record<StructId, number>;
  res: Record<ResId, number>;
  structures: { type: StructId; x: number; y: number; rot: 0 | 1; hp: number; open: boolean; ammo: number }[];
  furn: { type: FurnId; x: number; y: number; rot: 0 | 1; used: boolean; fuel?: number; on?: boolean; wireIdx?: number }[];
  px: number;
  py: number;
  difficulty: string;
  bandages?: number;
  firstAids?: number;
  genStock?: number;
  nightSeed?: number;
}

export const WAVES_PER_DAY = 5;
export const emptyInv = (): Record<StructId, number> => Object.fromEntries(STRUCT_ORDER.map((k) => [k, 0])) as Record<StructId, number>;

export type ShopItem =
  | { kind: 'weapon'; id: WeaponId }
  | { kind: 'ammo'; id: AmmoType }
  | { kind: 'armor' }
  | { kind: 'medkit' }
  | { kind: 'flaregun' }
  | { kind: 'flare' }
  | { kind: 'struct'; id: StructId }
  | { kind: 'generator' }
  | { kind: 'gas' };

const PLAYER_R = 14;
const TRADER_RANGE = 125;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  world: World;
  onUpdate: (s: Snapshot) => void;

  dpr = 1;
  W = 800;
  H = 600;

  state: GameState = 'menu';
  paused = false;
  diff = DIFFICULTY.normal;
  flashT = 0;
  fpsAcc = 60;
  shopOpen = false;
  time = 0;
  raf = 0;
  lastT = 0;
  uiTimer = 0;
  running = true;

  keys = new Set<string>();
  mouse = { x: 0, y: 0, down: false, buffer: 0 };

  cam = { x: CENTER.x, y: CENTER.y + 40 };
  camTop = { x: 0, y: 0 };
  shake = 0;

  player = {
    x: CENTER.x,
    y: CENTER.y + 100,
    r: PLAYER_R,
    hp: 100,
    maxHp: 100,
    armor: 0,
    angle: -Math.PI / 2,
    phase: 0,
    moving: false,
    flash: 0,
    hurt: 0,
    slowT: 0,
    burnT: 0,
    burnTick: 0,
  };
  money = 0;
  kills = 0;
  weapon: WeaponId = 'pistol';
  owned: Record<string, { mag: number }> = {};
  reserve: Record<AmmoType, number> = emptyReserve();
  lastWeapon: WeaponId = 'pistol';
  cooldown = 0;
  reloadT = 0;
  reloading = false;
  emptyClickT = 0;
  survived = 0;

  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  pickups: Pickup[] = [];
  particles: Particle[] = [];
  nextId = 1;

  // новое
  rings: Ring[] = [];
  beams: Beam[] = [];
  clouds: Cloud[] = [];
  fields: Field[] = [];
  floaters: Floater[] = [];
  flareShots: FlareShot[] = [];
  drops: Drop[] = [];
  flares = 0;
  hasFlareGun = false;
  flareCd = 0;
  bossDue = false;
  bossRef: Enemy | null = null;

  wave = 0;
  nextWave = 1;
  toSpawn = 0;
  spawned = 0;
  spawnTimer = 0;
  intermission = 0;
  bannerT = 0;
  banner: { title: string; sub: string } | null = null;
  toasts: Toast[] = [];
  toastId = 1;

  // --- день / ночь, оборона, подвал ---
  day = 1;
  phase: 'day' | 'night' = 'day';
  loc: 'surface' | 'basement' = 'surface';
  res: Record<ResId, number> = emptyRes();
  inv: Record<StructId, number> = emptyInv();
  structures: Structure[] = [];
  furn: Furn[] = [];
  crates: LootCrate[] = [];
  onTower: Structure | null = null;
  craftOpen = false;
  buildOpen = false;
  buildSel: string | null = null;
  buildRot: 0 | 1 = 0;
  ghost = { x: 0, y: 0, ok: false, reason: '' };
  nightT = 0;
  genStock = 0;
  wirePending: number | null = null;
  /** переход (лестница): время, длительность, действие в середине */
  fadeT = 0;
  fadeDur = 0;
  fadeCb: (() => void) | null = null;

  // --- ближний бой, расходники, интерьеры, границы города ---
  lastMelee: WeaponId = 'knife';
  lastGun: WeaponId = 'pistol';
  swingT = 0;
  swingDur = 0.2;
  swingDir: 1 | -1 = 1;
  bandages = 0;
  firstAids = 0;
  useCd = 0;
  cityR = DAY_RADIUS;
  borderWarn = 0;
  inside: Interior | null = null;
  interiors = new Map<number, Interior>();
  stash: {
    world: World;
    enemies: Enemy[];
    pickups: Pickup[];
    crates: LootCrate[];
    structures: Structure[];
    px: number;
    py: number;
  } | null = null;

  tmp: Collider[] = [];
  handlers: [EventTarget, string, EventListener][] = [];

  constructor(canvas: HTMLCanvasElement, world: World, onUpdate: (s: Snapshot) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.world = world;
    this.onUpdate = onUpdate;
    this.reset();
    this.bind();
    this.resize();
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  /* ---------------------------------------------------------------- */
  bind() {
    const on = (t: EventTarget, ev: string, fn: (e: never) => void) => {
      t.addEventListener(ev, fn as EventListener);
      this.handlers.push([t, ev, fn as EventListener]);
    };
    on(window, 'resize', () => this.resize());
    on(window, 'keydown', (e: KeyboardEvent) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.onKey(e.code);
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code));
    on(window, 'blur', () => {
      this.keys.clear();
      this.mouse.down = false;
      if (this.state === 'playing' && !this.shopOpen && !this.paused) this.setPaused(true);
    });
    on(this.canvas, 'mousemove', (e: MouseEvent) => {
      const rc = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rc.left;
      this.mouse.y = e.clientY - rc.top;
    });
    on(this.canvas, 'mousedown', (e: MouseEvent) => {
      const idle = this.state !== 'playing' || this.shopOpen || this.craftOpen || this.paused;
      if (e.button === 0) {
        if (this.buildSel && !idle) {
          this.placeSelected();
          return;
        }
        this.mouse.down = true;
        this.mouse.buffer = 0.14;
      } else if (e.button === 2 && this.buildSel && !idle) {
        this.removeAtCursor();
      }
    });
    on(window, 'mouseup', (e: MouseEvent) => {
      if (e.button === 0) this.mouse.down = false;
    });
    on(this.canvas, 'contextmenu', (e: Event) => e.preventDefault());
    on(this.canvas, 'wheel', (e: WheelEvent) => {
      if (this.state !== 'playing' || this.shopOpen || this.craftOpen || this.paused || this.buildOpen) return;
      const list = ALL_ORDER.filter((w) => this.owned[w]);
      const i = list.indexOf(this.weapon);
      const n = list[(i + (e.deltaY > 0 ? 1 : -1) + list.length) % list.length];
      this.switchWeapon(n);
    });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    for (const [t, ev, fn] of this.handlers) t.removeEventListener(ev, fn);
    this.handlers = [];
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
  }

  onKey(code: string) {
    if (this.state !== 'playing') return;
    if (this.paused) return;
    if (code === 'KeyE') {
      if (this.shopOpen) this.setShop(false);
      else if (this.craftOpen) this.setCraft(false);
      else this.interact();
      return;
    }
    if (code === 'Escape') {
      if (this.shopOpen) this.setShop(false);
      else if (this.craftOpen) this.setCraft(false);
      else if (this.buildOpen || this.buildSel) this.setBuild(false);
      else this.setPaused(true);
      return;
    }
    if (this.shopOpen || this.craftOpen) return;
    if (code === 'KeyG') return this.useBandage();
    if (code === 'KeyH') return this.useFirstAid();
    if (this.inside && code === 'KeyB') return;
    if (code === 'KeyB') {
      this.setBuild(!this.buildOpen);
      return;
    }
    if (this.buildSel && code === 'KeyR') {
      this.buildRot = this.buildRot ? 0 : 1;
      return;
    }
    if (this.loc === 'basement') {
      if (code === 'KeyF') {
        const t = basementTarget(this);
        if (t && t.kind === 'generator' && t.f) this.refuelGenerator(t.f);
        return;
      }
      const mb = /^Digit([1-9])$/.exec(code);
      if (mb && this.buildOpen) {
        const id = this.buildList()[parseInt(mb[1], 10) - 1];
        if (id) this.selectBuild(id);
      }
      return;
    }
    if (code === 'KeyV') return this.toggleMelee();
    if (code === 'KeyR') this.startReload();
    if (code === 'KeyF' && !this.inside) this.useFlare();
    if (code === 'KeyQ') {
      if (this.lastWeapon !== this.weapon && this.owned[this.lastWeapon]) this.switchWeapon(this.lastWeapon);
    }
    const m = /^Digit([0-9])$/.exec(code);
    if (m) {
      const n = parseInt(m[1], 10);
      if (this.buildOpen) {
        const id = this.buildList()[n - 1];
        if (id) this.selectBuild(id);
        return;
      }
      const list = ALL_ORDER.filter((w) => this.owned[w]);
      const idx = n === 0 ? 9 : n - 1;
      if (list[idx]) this.switchWeapon(list[idx]);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Взаимодействие, постройка, крафт                                  */
  /* ---------------------------------------------------------------- */
  nearAccess(): Access | null {
    if (this.inside || this.loc !== 'surface') return null;
    const p = this.player;
    let best: Access | null = null;
    let bd = 54;
    for (const a of this.world.accesses) {
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    return best;
  }

  nearExit() {
    const it = this.inside;
    if (!it) return false;
    return Math.hypot(this.player.x - it.exit.x, this.player.y - it.exit.y) < 66;
  }

  /** Подъём по лестнице / спуск: затемнение, шаги, смена этажа */
  beginClimb(cb: () => void, steps = true) {
    if (this.fadeCb) return;
    this.fadeT = 0;
    this.fadeDur = 0.8;
    this.fadeCb = cb;
    this.mouse.down = false;
    if (steps) sfx.climb();
    else sfx.pickup();
  }

  tryEnter(ac: Access) {
    if (this.phase !== 'night') return this.enterInterior(ac);
    this.beginClimb(() => this.enterInterior(ac), ac.kind === 'upper');
  }

  enterInterior(ac: Access) {
    if (this.phase !== 'night') {
      this.toast('Дверь заколочена. Заходить в дома можно только ночью', 'bad');
      sfx.deny();
      return;
    }
    let it = this.interiors.get(ac.id);
    if (!it) {
      it = buildInterior(this, ac);
      this.interiors.set(ac.id, it);
    }
    this.stash = {
      world: this.world,
      enemies: this.enemies,
      pickups: this.pickups,
      crates: this.crates,
      structures: this.structures,
      px: ac.x,
      py: ac.y,
    };
    this.world = { ...this.world, grid: it.grid };
    this.enemies = it.enemies;
    this.pickups = it.pickups;
    this.crates = it.crates;
    this.structures = [];
    this.bullets = [];
    this.rings = [];
    this.beams = [];
    this.clouds = [];
    this.fields = [];
    this.floaters = [];
    this.inside = it;
    if (!it.populated) populateInterior(this, it);
    it.seen = true;
    const p = this.player;
    p.x = it.spawn.x;
    p.y = it.spawn.y;
    p.burnT = 0;
    this.mouse.down = false;
    this.buildSel = null;
    this.buildOpen = false;
    this.cam.x = p.x;
    this.cam.y = p.y;
    sfx.pickup();
    this.toast(ac.kind === 'upper' ? 'Вы поднялись на второй этаж. Здесь темно…' : 'Вы спустились в подвал дома. Здесь темно и сыро…', 'info');
  }

  leaveInterior(toast = true) {
    const it = this.inside;
    const st = this.stash;
    if (!it || !st) return;
    it.enemies = this.enemies;
    it.pickups = this.pickups;
    it.crates = this.crates;
    this.world = st.world;
    this.enemies = st.enemies;
    this.pickups = st.pickups;
    this.crates = st.crates;
    this.structures = st.structures;
    this.bullets = [];
    this.rings = [];
    this.beams = [];
    this.clouds = [];
    this.fields = [];
    this.floaters = [];
    this.inside = null;
    this.stash = null;
    const p = this.player;
    p.x = st.px;
    p.y = st.py + 38;
    if (this.world.grid.circleBlocked(p.x, p.y, p.r)) {
      p.x = st.px;
      p.y = st.py;
    }
    this.mouse.down = false;
    this.cam.x = p.x;
    this.cam.y = p.y;
    sfx.pickup();
    if (toast) this.toast('Вы вышли наружу', 'info');
  }

  interact() {
    if (this.inside) {
      if (nearestCrate(this)) return;
      if (this.nearExit()) return this.beginClimb(() => this.leaveInterior(), this.inside.kind === 'upper');
      return;
    }
    if (this.loc === 'basement') return this.interactBasement();
    if (this.onTower) {
      fallFromTower(this, 0);
      return;
    }
    if (this.nearCrate()) return;
    if (nearestCrate(this)) return;
    const ac = this.nearAccess();
    if (ac) return this.tryEnter(ac);
    if (this.nearTrader()) return this.setShop(true);
    const p = this.player;
    if (Math.hypot(p.x - HATCH.x, p.y - HATCH.y) < 62) return this.enterBasement();
    const tw = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'tower', 52);
    if (tw) return climbTower(this, tw);
    const gt = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'gate', 70);
    if (gt) return toggleGate(this, gt);
    const tu = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'turret', 62);
    if (tu) return refillTurret(this, tu);
    const bn = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'bench', 72);
    if (bn) return this.setCraft(true);
  }

  interactBasement() {
    const t = basementTarget(this);
    if (!t) return;
    const p = this.player;
    switch (t.kind) {
      case 'ladder':
        return this.leaveBasement();
      case 'mattress':
      case 'bed':
        return this.sleep(t.kind);
      case 'medcab':
        if (t.f && !t.f.used) {
          t.f.used = true;
          p.hp = Math.min(p.maxHp, p.hp + 100);
          this.toast('Вы перевязались и приняли лекарства', 'good');
          sfx.buy();
        } else this.toast('Шкаф пуст — до завтра', 'info');
        return;
      case 'armorstand':
        if (t.f && !t.f.used) {
          t.f.used = true;
          p.armor = ARMOR_MAX;
          this.toast('Бронежилет починен', 'good');
          sfx.buy();
        } else this.toast('Сегодня броня уже починена', 'info');
        return;
      case 'workbench':
        return this.setCraft(true);
      case 'generator':
        if (t.f) this.toggleGenerator(t.f);
        return;
    }
  }

  toggleGenerator(f: Furn) {
    if (f.on) {
      f.on = false;
      sfx.genStop();
      this.toast('Генератор остановлен', 'info');
      return;
    }
    if ((f.fuel ?? 0) <= 0) {
      if (this.res.gas > 0) this.refuelGenerator(f, true);
      else {
        sfx.deny();
        this.toast('В баке пусто. Нужен бензин — ищите в бочках и ящиках или купите у торговца', 'bad');
        return;
      }
    }
    f.on = true;
    f.spark = 0.5;
    sfx.genStart();
    this.toast('Генератор запущен — по проводам пошёл ток', 'good');
  }

  refuelGenerator(f: Furn, silent = false) {
    const fuel = f.fuel ?? 0;
    if (fuel > GEN_CAP - GEN_CAN * 0.5) {
      if (!silent) this.toast('Бак полон', 'info');
      return;
    }
    if (this.res.gas <= 0) {
      sfx.deny();
      this.toast('Нет бензина', 'bad');
      return;
    }
    this.res.gas--;
    f.fuel = Math.min(GEN_CAP, fuel + GEN_CAN);
    sfx.genRefuel();
    if (!silent) this.toast(`Заправлено: бак ${Math.round(genFuelFrac(f) * 100)}%`, 'good');
  }

  wireClick() {
    const m = this.mouseWorld();
    const hov = furnAt(this, m.x, m.y);
    const bad = (msg: string) => {
      sfx.deny();
      this.toast(msg, 'bad');
    };
    if (this.wirePending === null) {
      if (!hov || !(isSource(hov.type) || isConsumer(hov.type))) return bad('Нажмите на генератор или лампу — оттуда потянем провод');
      this.wirePending = hov.id;
      sfx.click();
      this.toast('Теперь нажмите на лампу или лампочку (ПКМ — отмена)', 'info');
      this.emit();
      return;
    }
    const src = this.furn.find((q) => q.id === this.wirePending);
    if (!src || !hov) {
      if (!hov) return bad('Нажмите на лампу или лампочку');
      this.wirePending = null;
      return;
    }
    const r = connectWire(this, src, hov);
    if (!r.ok) return bad(r.msg);
    sfx.wireConnect();
    this.toast(r.msg, 'good');
    this.wirePending = null;
    this.emit();
  }

  enterBasement() {
    if (this.phase === 'day') {
      this.toast(`Люк заперт: сначала переживите день (волна ${((this.wave - 1) % WAVES_PER_DAY) + 1 || 1}/${WAVES_PER_DAY})`, 'bad');
      sfx.deny();
      return;
    }
    this.loc = 'basement';
    this.player.x = ENTRY.x;
    this.player.y = ENTRY.y + 12;
    this.player.burnT = 0;
    this.player.slowT = 0;
    this.mouse.down = false;
    this.buildSel = null;
    this.buildOpen = false;
    sfx.pickup();
    this.toast('Вы в подвале. Обустройте убежище или ложитесь спать — наступит новый день', 'info');
    this.autosave();
  }

  leaveBasement() {
    this.loc = 'surface';
    this.player.x = HATCH.x;
    this.player.y = HATCH.y - 44;
    this.mouse.down = false;
    this.buildSel = null;
    this.buildOpen = false;
    sfx.pickup();
    if (this.phase === 'night') this.toast('Ночь. Город кишит зомби — ищите ящики с ресурсами и возвращайтесь к люку', 'info');
  }

  sleep(kind: 'mattress' | 'bed') {
    if (this.phase !== 'night') {
      this.toast('Спать можно только когда день закончен', 'bad');
      return;
    }
    const p = this.player;
    if (kind === 'bed') {
      p.hp = p.maxHp;
      p.armor = Math.max(p.armor, 50);
    } else p.hp = Math.max(p.hp, p.maxHp * 0.7);
    this.newDay();
  }

  endDay(bonus: number) {
    this.phase = 'night';
    this.intermission = 0;
    this.nextWave = this.wave + 1;
    this.toSpawn = 0;
    this.spawned = 0;
    this.nightT = 0;
    this.interiors.clear();
    this.rebuildNightCity((Math.random() * 1e9) | 0);
    this.toast('Границы города расширились — окраины каждую ночь выглядят по-новому', 'info');
    this.banner = { title: `День ${this.day} пережит`, sub: `Награда ${bonus} ₽ · зомби отступили. Спуститесь в подвал (люк у лагеря) или идите на вылазку` };
    this.bannerT = 7;
    sfx.pickup();
    spawnExpedition(this);
    this.autosave();
  }

  /** Каждую ночь внешняя часть города строится заново */
  rebuildNightCity(nightSeed: number) {
    // постройки игрока в зоне заражения — в инвентарь
    let moved = 0;
    for (const st of [...this.structures]) {
      if (inCoreRect(st.x, st.y)) continue;
      this.inv[st.type]++;
      removeStructure(this, st);
      moved++;
    }
    this.pickups = this.pickups.filter((k) => inCoreRect(k.x, k.y));
    regenerateRing(this.world, nightSeed);
    if (moved > 0) this.toast(`Постройки вне ядра города убраны в инвентарь (${moved})`, 'info');
  }

  newDay() {
    this.day++;
    this.phase = 'day';
    this.interiors.clear();
    clearExpedition(this);
    this.toSpawn = 0;
    this.spawned = 0;
    this.nextWave = this.wave + 1;
    this.intermission = 30;
    for (const s of this.structures) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.4);
    for (const f of this.furn) f.used = false;
    const first = this.nextWave;
    this.banner = { title: `День ${this.day}`, sub: `Волны ${first}–${first + WAVES_PER_DAY - 1} · поднимайтесь наверх и готовьте оборону` };
    this.bannerT = 6;
    sfx.wave();
    this.toast('Вы выспались. Постройки частично починены', 'good');
    this.autosave();
  }

  updateNight(dt: number) {
    this.nightT += dt;
    // редкое появление новых блуждающих зомби вдали от игрока
    if (this.loc !== 'surface') return;
    if (this.nightT % 38 < dt && this.enemies.length < 24) {
      const p = this.player;
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * 6.283;
        const d = 800 + Math.random() * 400;
        const x = p.x + Math.cos(a) * d;
        const y = p.y + Math.sin(a) * d;
        if (x < 80 || y < 80 || x > WORLD - 80 || y > WORLD - 80) continue;
        if (Math.hypot(x - CENTER.x, y - CENTER.y) < SAFE_RADIUS + 300) continue;
        if (this.world.grid.circleBlocked(x, y, 28)) continue;
        const e = this.spawnOne(this.rollType(), x, y, true);
        e.wander = true;
        break;
      }
    }
  }

  alertEnemies(x: number, y: number, r: number) {
    for (const e of this.enemies) {
      if (e.wander && !e.aggro && Math.hypot(e.x - x, e.y - y) < r) e.aggro = true;
    }
  }

  setCraft(open: boolean) {
    if (open) {
      const near = this.loc === 'basement' ? basementTarget(this)?.kind === 'workbench' : !!nearestStruct(this, (s) => STRUCTS[s.type].kind === 'bench', 90);
      if (!near) return;
      this.mouse.down = false;
      this.buildSel = null;
      this.buildOpen = false;
      sfx.pickup();
    }
    this.craftOpen = open;
    this.emit();
  }

  craft(id: string) {
    const r = RECIPES.find((q) => q.id === id);
    if (!r) return;
    const fail = (m: string) => {
      sfx.deny();
      this.toast(m, 'bad');
      this.emit();
    };
    if (!canAfford(this.res, r.cost)) return fail('Не хватает ресурсов');
    const p = this.player;
    if (r.out.kind === 'ammo') {
      const a = AMMO[r.out.id];
      if (this.reserve[a.id] >= a.cap) return fail('Больше патронов не унести');
      this.reserve[a.id] = Math.min(a.cap, this.reserve[a.id] + r.out.n);
    } else if (r.out.kind === 'medkit') {
      if (p.hp >= p.maxHp) return fail('Вы здоровы');
      p.hp = Math.min(p.maxHp, p.hp + 50);
    } else if (r.out.kind === 'bandage') {
      if (this.bandages >= 12) return fail('Больше бинтов не унести');
      this.bandages = Math.min(12, this.bandages + 2);
    } else if (r.out.kind === 'firstaid') {
      if (this.firstAids >= 6) return fail('Больше аптечек не унести');
      this.firstAids++;
    } else if (r.out.kind === 'weapon') {
      const w = WEAPONS[r.out.id];
      if (this.owned[w.id]) return fail('У вас уже есть ' + w.name);
      this.owned[w.id] = { mag: w.mag };
      this.reserve = { ...this.reserve };
    } else if (r.out.kind === 'armor') {
      if (p.armor >= ARMOR_MAX) return fail('Броня в порядке');
      p.armor = ARMOR_MAX;
    } else if (r.out.kind === 'generator') {
      this.genStock++;
    } else if (r.out.kind === 'gas') {
      this.res.gas += r.out.n;
    } else {
      this.inv[r.out.id] += r.out.n;
    }
    for (const k of ALL_RES) this.res[k] -= r.cost[k] ?? 0;
    sfx.buy();
    this.toast('Изготовлено: ' + r.name, 'good');
    this.emit();
  }

  setBuild(open: boolean) {
    this.buildOpen = open;
    if (!open) {
      this.buildSel = null;
      this.wirePending = null;
    }
    else this.mouse.down = false;
    this.emit();
  }

  buildList(): string[] {
    if (this.loc === 'basement') return [...FURN_ORDER, 'wire', ...(this.inv.workbench > 0 ? ['workbench'] : [])];
    return STRUCT_ORDER.filter((id) => this.inv[id] > 0);
  }

  selectBuild(id: string | null) {
    this.buildSel = id;
    this.wirePending = null;
    if (id) this.buildOpen = true;
    this.mouse.down = false;
    this.emit();
  }

  mouseWorld() {
    if (this.loc === 'basement') {
      const v = bsView(this);
      return { x: (this.mouse.x - v.ox) / v.sc, y: (this.mouse.y - v.oy) / v.sc };
    }
    return { x: this.mouse.x + this.camTop.x, y: this.mouse.y + this.camTop.y };
  }

  updateGhost() {
    const id = this.buildSel;
    if (!id) return;
    const w = this.mouseWorld();
    const gx = Math.round(w.x / 10) * 10;
    const gy = Math.round(w.y / 10) * 10;
    this.ghost.x = gx;
    this.ghost.y = gy;
    if (this.loc === 'basement' && id === 'wire') {
      const m = this.mouseWorld();
      const hov = furnAt(this, m.x, m.y);
      this.ghost.x = m.x;
      this.ghost.y = m.y;
      if (this.wirePending === null) {
        this.ghost.ok = !!hov && (isSource(hov.type) || isConsumer(hov.type));
        this.ghost.reason = 'Нажмите на генератор или лампу, откуда тянуть провод';
      } else {
        const src = this.furn.find((q) => q.id === this.wirePending);
        const rr = src && hov ? canWire(this, src, hov) : { ok: false, msg: 'Нажмите на лампу или лампочку' };
        this.ghost.ok = rr.ok;
        this.ghost.reason = rr.msg;
      }
      return;
    }
    if (this.loc === 'basement') {
      const r = canPlaceFurn(this, id as FurnId, gx, gy, this.buildRot);
      this.ghost.ok = r.ok;
      this.ghost.reason = r.reason;
    } else {
      const r = canPlace(this, id as StructId, gx, gy, this.buildRot);
      this.ghost.ok = r.ok;
      this.ghost.reason = r.reason;
    }
  }

  placeSelected() {
    const id = this.buildSel;
    if (!id) return;
    this.updateGhost();
    const bad = (m: string) => {
      sfx.deny();
      this.toast(m, 'bad');
    };
    if (this.loc === 'basement' && id === 'wire') return this.wireClick();
    if (!this.ghost.ok) return bad(this.ghost.reason || 'Нельзя поставить здесь');
    if (this.loc === 'basement') {
      if (id === 'workbench') {
        if (this.inv.workbench <= 0) return bad('Нет верстака в инвентаре');
        this.inv.workbench--;
      } else if (id === 'generator') {
        if (this.genStock <= 0) return bad('Нет генератора: найдите, купите у торговца или скрафтите на верстаке');
        this.genStock--;
      } else {
        const d = FURN[id as Exclude<FurnId, 'workbench'>];
        if (!canAfford(this.res, d.cost)) return bad('Не хватает ресурсов');
        for (const k of RES_ORDER) this.res[k] -= d.cost[k] ?? 0;
      }
      this.furn.push({ id: this.nextId++, type: id as FurnId, x: this.ghost.x, y: this.ghost.y, rot: id === 'generator' ? 0 : this.buildRot, used: false, ...(id === 'generator' ? { fuel: 0, on: false } : {}) });
      if (id === 'generator') {
        this.buildSel = null;
        this.toast('Генератор установлен. Заправьте его (F) и запустите (E), затем протяните провода', 'good');
      }
      sfx.buy();
      if (id === 'workbench') this.buildSel = null;
    } else {
      const t = id as StructId;
      if (this.inv[t] <= 0) return bad('Нет в инвентаре — купите у торговца');
      this.inv[t]--;
      addStructure(this, t, this.ghost.x, this.ghost.y, this.buildRot);
      sfx.buy();
      if (this.inv[t] <= 0) this.buildSel = null;
    }
    this.emit();
  }

  removeAtCursor() {
    const w = this.mouseWorld();
    if (this.loc === 'basement') {
      const f = furnAt(this, w.x, w.y);
      if (this.buildSel === 'wire') {
        if (this.wirePending !== null) {
          this.wirePending = null;
          return;
        }
        if (f && disconnectWire(this, f)) {
          sfx.wireCut();
          this.toast('Провод снят', 'info');
          this.emit();
        }
        return;
      }
      if (!f) return;
      this.furn.splice(this.furn.indexOf(f), 1);
      for (const q of this.furn) if (q.wire === f.id) q.wire = undefined;
      if (f.type === 'generator') {
        this.genStock++;
        this.res.gas += refuelAmount(f);
      } else if (f.type === 'workbench') this.inv.workbench++;
      else {
        const d = FURN[f.type];
        for (const k of RES_ORDER) this.res[k] += Math.floor((d.cost[k] ?? 0) / 2);
      }
      this.toast('Убрано', 'info');
      this.emit();
      return;
    }
    let found: Structure | null = null;
    for (const s of this.structures) {
      const z = sizeOf(s.type, s.rot);
      if (Math.abs(w.x - s.x) <= z.w / 2 + 4 && Math.abs(w.y - s.y) <= z.h / 2 + 4) found = s;
    }
    if (!found) return;
    if (Math.hypot(this.player.x - found.x, this.player.y - found.y) > 320) return this.toast('Слишком далеко', 'bad');
    if (this.onTower === found) return;
    this.inv[found.type]++;
    removeStructure(this, found);
    this.toast('Демонтировано — вернулось в инвентарь', 'info');
    this.emit();
  }

  getPrompt(): { text: string; progress: number } | null {
    if (this.state !== 'playing') return null;
    if (this.loc === 'basement') {
      const t = basementTarget(this);
      return t ? { text: t.text, progress: -1 } : null;
    }
    if (this.onTower) return { text: 'Слезть с вышки', progress: -1 };
    if (this.inside) {
      const ic = nearestCrate(this);
      if (ic) return { text: `Удерживайте, чтобы обыскать: ${CRATE_NAMES[ic.kind]}`, progress: ic.prog };
      if (this.nearExit()) return { text: this.inside.kind === 'upper' ? 'Спуститься вниз' : 'Подняться наверх', progress: -1 };
      return null;
    }
    const na = this.nearAccess();
    if (na && !nearestCrate(this)) return { text: this.phase === 'night' ? (na.kind === 'upper' ? 'Подняться на второй этаж' : 'Спуститься в подвал дома') : 'Заколочено до ночи', progress: -1 };
    const c = nearestCrate(this);
    if (c) return { text: `Удерживайте, чтобы обыскать: ${CRATE_NAMES[c.kind]}`, progress: c.prog };
    if (this.nearTrader()) return null;
    const p = this.player;
    if (Math.hypot(p.x - HATCH.x, p.y - HATCH.y) < 62) return { text: this.phase === 'day' ? 'Люк в подвал (заперт до конца дня)' : 'Спуститься в подвал', progress: -1 };
    const tw = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'tower', 52);
    if (tw) return { text: 'Залезть на вышку', progress: -1 };
    const gt = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'gate', 70);
    if (gt) return { text: gt.open ? 'Закрыть ворота' : 'Открыть ворота', progress: -1 };
    const tu = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'turret', 62);
    if (tu) {
      const t = STRUCTS[tu.type].turret!;
      return { text: `Зарядить турель (${Math.round((tu.ammo / t.cap) * 100)}%)`, progress: -1 };
    }
    const bn = nearestStruct(this, (s) => STRUCTS[s.type].kind === 'bench', 72);
    if (bn) return { text: 'Верстак: крафт', progress: -1 };
    return null;
  }

  /* ---------------------------------------------------------------- */
  /* Сохранения                                                        */
  /* ---------------------------------------------------------------- */
  serialize(): SaveData {
    const resume = this.phase === 'day' ? (this.intermission > 0 ? this.nextWave : Math.max(1, this.wave)) : this.wave + 1;
    return {
      v: 1,
      day: this.day,
      phase: this.phase,
      loc: this.loc,
      resume,
      money: this.money,
      kills: this.kills,
      survived: this.survived,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      armor: this.player.armor,
      weapon: this.weapon,
      owned: JSON.parse(JSON.stringify(this.owned)),
      reserve: { ...this.reserve },
      flares: this.flares,
      hasFlareGun: this.hasFlareGun,
      inv: { ...this.inv },
      res: { ...this.res },
      structures: this.structures.map((s) => ({ type: s.type, x: s.x, y: s.y, rot: s.rot, hp: s.hp, open: s.open, ammo: s.ammo })),
      furn: this.furn.map((f) => ({ type: f.type, x: f.x, y: f.y, rot: f.rot, used: f.used, fuel: f.fuel, on: f.on, wireIdx: f.wire === undefined ? undefined : this.furn.findIndex((q) => q.id === f.wire) })),
      px: this.inside && this.stash ? this.stash.px : this.player.x,
      py: this.inside && this.stash ? this.stash.py + 38 : this.player.y,
      difficulty: settings.difficulty,
      bandages: this.bandages,
      firstAids: this.firstAids,
      genStock: this.genStock,
      nightSeed: this.world.nightSeed,
    };
  }

  summary(): SaveSummary {
    return {
      day: this.day,
      wave: this.phase === 'night' ? this.wave : Math.max(0, this.wave),
      money: this.money,
      kills: this.kills,
      phase: this.phase,
      loc: this.loc,
      weapons: Object.keys(this.owned).length,
      structures: this.structures.length + this.furn.length,
      time: Math.floor(this.survived),
      difficulty: DIFFICULTY[settings.difficulty].name,
    };
  }

  autosave() {
    if (this.state !== 'playing') return;
    void writeSave(0, this.serialize(), this.summary());
  }

  async saveGame(slot: number): Promise<void> {
    if (this.state !== 'playing') return;
    await writeSave(slot, this.serialize(), this.summary());
    this.toast(slot === 0 ? 'Автосохранение' : `Игра сохранена в слот ${slot}`, 'good');
    this.emit();
  }

  async loadSlot(slot: number): Promise<boolean> {
    const d = (await readSave(slot)) as SaveData | null;
    if (!d || typeof d !== 'object' || d.v !== 1) return false;
    this.loadSave(d);
    return true;
  }

  loadSave(d: SaveData) {
    initAudio();
    sfx.start();
    this.reset();
    this.diff = DIFFICULTY[d.difficulty as keyof typeof DIFFICULTY] ?? this.diff;
    this.state = 'playing';
    this.paused = false;
    this.day = d.day;
    this.phase = d.phase;
    this.kills = d.kills;
    this.survived = d.survived;
    this.money = d.money;
    this.player.hp = d.hp;
    this.player.maxHp = d.maxHp;
    this.player.armor = d.armor;
    const owned: Record<string, { mag: number }> = {};
    for (const id of Object.keys(d.owned)) if (WEAPONS[id as WeaponId]) owned[id] = { mag: d.owned[id].mag };
    if (!owned.pistol) owned.pistol = { mag: WEAPONS.pistol.mag };
    this.owned = owned;
    this.weapon = owned[d.weapon] ? d.weapon : 'pistol';
    this.lastWeapon = this.weapon;
    this.reserve = { ...emptyReserve(), ...d.reserve };
    this.flares = d.flares;
    this.hasFlareGun = d.hasFlareGun;
    this.inv = { ...emptyInv(), ...d.inv };
    this.res = { ...emptyRes(), ...d.res };
    this.bandages = d.bandages ?? 0;
    this.firstAids = d.firstAids ?? 0;
    this.cityR = d.phase === 'night' ? NIGHT_RADIUS : DAY_RADIUS;
    for (const st of d.structures) {
      if (!STRUCTS[st.type]) continue;
      addStructure(this, st.type, st.x, st.y, st.rot, { hp: st.hp, open: st.open, ammo: st.ammo });
    }
    {
      const src = d.furn.filter((f) => f.type === 'workbench' || FURN[f.type as Exclude<FurnId, 'workbench'>]);
      const made: Furn[] = src.map((f) => ({ id: this.nextId++, type: f.type, x: f.x, y: f.y, rot: f.rot, used: f.used, fuel: f.fuel, on: f.on }));
      src.forEach((f, i) => {
        if (f.wireIdx !== undefined && f.wireIdx >= 0 && made[f.wireIdx]) made[i].wire = made[f.wireIdx].id;
      });
      this.furn = made;
    }
    this.genStock = d.genStock ?? 0;
    this.wave = Math.max(0, d.resume - 1);
    this.nextWave = d.resume;
    this.toSpawn = 0;
    this.spawned = 0;
    this.loc = d.loc;
    if (d.loc === 'basement') {
      this.player.x = ENTRY.x;
      this.player.y = ENTRY.y + 12;
    } else {
      let x = d.px;
      let y = d.py;
      if (this.world.grid.circleBlocked(x, y, this.player.r)) {
        x = HATCH.x;
        y = HATCH.y - 44;
      }
      this.player.x = x;
      this.player.y = y;
    }
    this.cam.x = this.player.x;
    this.cam.y = this.player.y;
    if (this.phase === 'night') {
      this.intermission = 0;
      regenerateRing(this.world, d.nightSeed ?? ((Math.random() * 1e9) | 0));
      spawnExpedition(this);
    } else this.intermission = d.loc === 'basement' ? 25 : 12;
    this.banner = { title: 'Игра загружена', sub: `День ${this.day} · ${this.phase === 'night' ? 'ночь' : 'готовьтесь к волне ' + this.nextWave}` };
    this.bannerT = 4;
    this.emit();
  }

  nearCrate() {
    return this.drops.some((d) => d.landed && Math.hypot(this.player.x - d.x, this.player.y - d.y) < 62);
  }

  useFlare() {
    if (!this.hasFlareGun) return this.toast('Сигнальный пистолет можно купить у торговца', 'info');
    if (this.flares <= 0) return this.toast('Нет сигнальных патронов — купите у торговца', 'bad');
    if (this.flareCd > 0) return;
    fireFlare(this);
  }

  setPaused(v: boolean) {
    if (this.state !== 'playing') return;
    this.paused = v;
    if (v) {
      this.mouse.down = false;
      this.keys.clear();
    }
    this.emit();
  }

  toMenu() {
    this.reset();
    this.state = 'menu';
    this.paused = false;
    this.emit();
  }

  /* ---------------------------------------------------------------- */
  reset() {
    if (this.inside) this.leaveInterior(false);
    this.interiors.clear();
    this.bandages = 0;
    this.firstAids = 0;
    this.genStock = 0;
    this.wirePending = null;
    this.fadeT = 0;
    this.fadeCb = null;
    this.cityR = DAY_RADIUS;
    this.swingT = 0;
    this.useCd = 0;
    this.borderWarn = 0;
    this.onTower = null;
    for (const st of [...this.structures]) removeStructure(this, st);
    this.structures = [];
    this.furn = [];
    this.crates = [];
    this.res = emptyRes();
    this.inv = emptyInv();
    this.day = 1;
    this.phase = 'day';
    this.loc = 'surface';
    this.craftOpen = false;
    this.buildOpen = false;
    this.buildSel = null;
    this.buildRot = 0;
    this.nightT = 0;
    this.player.x = CENTER.x;
    this.player.y = CENTER.y + 100;
    this.player.hp = 100;
    this.player.armor = 0;
    this.player.angle = -Math.PI / 2;
    this.player.hurt = 0;
    this.player.slowT = 0;
    this.player.burnT = 0;
    this.player.burnTick = 0;
    this.diff = DIFFICULTY[settings.difficulty];
    this.money = this.diff.money;
    this.kills = 0;
    this.survived = 0;
    this.weapon = 'pistol';
    this.lastWeapon = 'pistol';
    this.lastGun = 'pistol';
    this.lastMelee = 'knife';
    this.owned = { pistol: { mag: WEAPONS.pistol.mag } };
    this.reserve = emptyReserve();
    this.reserve['9mm'] = 48;
    this.rings = [];
    this.beams = [];
    this.clouds = [];
    this.fields = [];
    this.floaters = [];
    this.flareShots = [];
    this.drops = [];
    this.flares = 0;
    this.hasFlareGun = false;
    this.flareCd = 0;
    this.bossDue = false;
    this.bossRef = null;
    this.flashT = 0;
    this.paused = false;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadT = 0;
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.toasts = [];
    this.wave = 0;
    this.nextWave = 1;
    this.toSpawn = 0;
    this.spawned = 0;
    this.intermission = 5;
    this.shopOpen = false;
    this.pickups = [];
    const r = mulberry32(Date.now() & 0xffff);
    for (const s of this.world.lootSpots) {
      if (!r.chance(0.7)) continue;
      const q = r.next();
      if (q < 0.42) this.pickups.push({ x: s.x, y: s.y, kind: 'cash', amount: r.int(20, 70), life: Infinity });
      else if (q < 0.85) {
        const t = r.pick<AmmoType>(['9mm', '9mm', '9mm', '12ga', '545', '545', '762']);
        this.pickups.push({ x: s.x, y: s.y, kind: 'ammo', ammo: t, amount: Math.ceil(AMMO[t].pack * r.range(0.5, 1)), life: Infinity });
      } else this.pickups.push({ x: s.x, y: s.y, kind: 'medkit', amount: 35, life: Infinity });
    }
  }

  start() {
    initAudio();
    sfx.start();
    this.reset();
    this.state = 'playing';
    this.banner = { title: 'Заброшенный город', sub: 'Загляните к торговцу и готовьтесь к первой волне' };
    this.bannerT = 4.5;
  }

  nearTrader() {
    return Math.hypot(this.player.x - CENTER.x, this.player.y - CENTER.y) < TRADER_RANGE;
  }

  setShop(open: boolean) {
    if (open && !this.nearTrader()) return;
    this.shopOpen = open;
    if (open) {
      this.mouse.down = false;
      sfx.pickup();
    }
    this.emit();
  }

  toast(text: string, kind: Toast['kind'] = 'info') {
    this.toasts.push({ id: this.toastId++, text, kind, t: 3.2 });
    if (this.toasts.length > 5) this.toasts.shift();
  }

  /* ---------------------------------------------------------------- */
  /* Магазин                                                           */
  /* ---------------------------------------------------------------- */
  buy(item: ShopItem): void {
    const fail = (msg: string) => {
      sfx.deny();
      this.toast(msg, 'bad');
      this.emit();
    };
    const ok = (msg: string) => {
      sfx.buy();
      this.toast(msg, 'good');
      this.emit();
    };
    if (!this.nearTrader()) return fail('Вы слишком далеко от торговца');
    if (item.kind === 'weapon') {
      const w = WEAPONS[item.id];
      if (w.special) return fail('Это оружие нельзя купить — ищите в аирдропах');
      if (!w.homemade) return fail('Фабричное оружие не продаётся — скрафтите его на верстаке из основы');
      if (this.owned[w.id]) return fail('У вас уже есть ' + w.name);
      if (this.money < w.price) return fail('Не хватает денег');
      this.money -= w.price;
      this.owned[w.id] = { mag: w.mag };
      this.switchWeapon(w.id);
      return ok('Куплено: ' + w.name);
    }
    if (item.kind === 'ammo') {
      const a = AMMO[item.id];
      if (a.price <= 0) return fail('Эти боеприпасы не продаются');
      if (this.reserve[a.id] >= a.cap) return fail('Больше патронов не унести');
      if (this.money < a.price) return fail('Не хватает денег');
      this.money -= a.price;
      this.reserve[a.id] = Math.min(a.cap, this.reserve[a.id] + a.pack);
      return ok(`+${a.pack} · ${a.name}`);
    }
    if (item.kind === 'armor') {
      if (this.player.armor >= ARMOR_MAX) return fail('Бронежилет уже в идеальном состоянии');
      if (this.money < ARMOR_PRICE) return fail('Не хватает денег');
      this.money -= ARMOR_PRICE;
      this.player.armor = ARMOR_MAX;
      return ok('Бронежилет надет');
    }
    if (item.kind === 'flaregun') {
      if (this.hasFlareGun) return fail('Сигнальный пистолет уже у вас');
      if (this.money < FLAREGUN_PRICE) return fail('Не хватает денег');
      this.money -= FLAREGUN_PRICE;
      this.hasFlareGun = true;
      this.flares = Math.min(FLARE_CAP, this.flares + 1);
      return ok('Куплен сигнальный пистолет · клавиша F');
    }
    if (item.kind === 'flare') {
      if (!this.hasFlareGun) return fail('Сначала купите сигнальный пистолет');
      if (this.flares >= FLARE_CAP) return fail('Больше сигнальных патронов не унести');
      if (this.money < FLARE_PRICE) return fail('Не хватает денег');
      this.money -= FLARE_PRICE;
      this.flares++;
      return ok('Сигнальный патрон +1');
    }
    if (item.kind === 'generator') {
      if (this.money < GEN_PRICE) return fail('Не хватает денег');
      this.money -= GEN_PRICE;
      this.genStock++;
      return ok('Куплен бензиновый генератор · ставьте его в подвале (B)');
    }
    if (item.kind === 'gas') {
      if (this.money < GAS_PRICE) return fail('Не хватает денег');
      this.money -= GAS_PRICE;
      this.res.gas++;
      return ok('Канистра бензина +1');
    }
    if (item.kind === 'struct') {
      const d = STRUCTS[item.id];
      if (this.money < d.price) return fail('Не хватает денег');
      this.money -= d.price;
      this.inv[item.id]++;
      return ok(`Куплено: ${d.name} · нажмите B, чтобы поставить`);
    }
    if (this.player.hp >= this.player.maxHp) return fail('Вы здоровы');
    if (this.money < MEDKIT_PRICE) return fail('Не хватает денег');
    this.money -= MEDKIT_PRICE;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + MEDKIT_HEAL);
    return ok('Аптечка использована');
  }

  /* ---------------------------------------------------------------- */
  /* Оружие                                                            */
  /* ---------------------------------------------------------------- */
  switchWeapon(id: WeaponId, force = false) {
    if (!this.owned[id] || (id === this.weapon && !force)) return;
    if (id !== this.weapon) {
      this.lastWeapon = this.weapon;
      if (WEAPONS[this.weapon].melee) this.lastMelee = this.weapon;
      else this.lastGun = this.weapon;
    }
    this.weapon = id;
    this.reloading = false;
    this.reloadT = 0;
    this.cooldown = 0.25;
    sfx.reloadDone();
  }

  startReload() {
    const w = WEAPONS[this.weapon];
    const st = this.owned[this.weapon];
    if (w.melee) return;
    if (this.reloading || st.mag >= w.mag) return;
    if (this.reserve[w.ammo] <= 0) {
      this.toast('Нет патронов — купите у торговца', 'bad');
      return;
    }
    this.reloading = true;
    this.reloadT = 0;
    sfx.reload();
  }

  /* ---------------------------------------------------------------- */
  /* Ближний бой и расходники                                          */
  /* ---------------------------------------------------------------- */
  meleeSwing() {
    const w = WEAPONS[this.weapon];
    const p = this.player;
    this.cooldown = w.cooldown;
    this.swingDur = Math.min(0.32, w.cooldown * 0.8);
    this.swingT = this.swingDur;
    this.swingDir = this.swingDir === 1 ? -1 : 1;
    sfx.swing(w.damage > 80);
    const cands: { e: Enemy; d: number }[] = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > w.range + e.r) continue;
      let da = Math.atan2(dy, dx) - p.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      const tol = w.arc / 2 + Math.atan2(e.r, Math.max(d, 1));
      if (Math.abs(da) > tol) continue;
      if (d > e.r + 12 && !this.world.grid.hasLOS(p.x, p.y, e.x, e.y)) continue;
      cands.push({ e, d });
    }
    cands.sort((a, b) => a.d - b.d);
    let n = 0;
    for (const { e } of cands) {
      if (n > w.pierce) break;
      n++;
      const ang = Math.atan2(e.y - p.y, e.x - p.x);
      const dmg = w.damage * (0.9 + Math.random() * 0.2);
      this.damageEnemy(e, dmg, ang, { noArmor: w.id === 'bayonet' || w.id === 'spear' });
      if (!e.dead) {
        e.vx += Math.cos(ang) * w.knock * e.kbMul;
        e.vy += Math.sin(ang) * w.knock * e.kbMul;
        if (w.id === 'hammer') e.slowT = Math.max(e.slowT, 0.9);
      }
    }
    if (n > 0) {
      sfx.thud();
      this.shake = Math.max(this.shake, w.id === 'hammer' ? 7 : 2.4);
    }
    this.alertEnemies(p.x, p.y, 230);
  }

  /** V — взять в руки холодное оружие / вернуться к огнестрелу */
  toggleMelee() {
    if (WEAPONS[this.weapon].melee) {
      this.switchWeapon(this.owned[this.lastGun] && !WEAPONS[this.lastGun].melee ? this.lastGun : 'pistol');
      return;
    }
    const list = MELEE_ORDER.filter((id) => this.owned[id]);
    if (!list.length) {
      this.toast('Нет оружия ближнего боя — скрафтите нож на верстаке', 'bad');
      return;
    }
    this.switchWeapon(this.owned[this.lastMelee] && WEAPONS[this.lastMelee].melee ? this.lastMelee : list[list.length - 1]);
  }

  useBandage() {
    const p = this.player;
    if (this.state !== 'playing' || this.useCd > 0) return;
    if (this.bandages <= 0) return this.toast('Нет бинтов — скрафтите на верстаке', 'bad');
    if (p.hp >= p.maxHp) return this.toast('Вы здоровы', 'info');
    this.bandages--;
    this.useCd = 0.8;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    p.burnT = Math.max(0, p.burnT - 2);
    sfx.bandage();
    this.toast('Бинт: +25 HP', 'good');
  }

  useFirstAid() {
    const p = this.player;
    if (this.state !== 'playing' || this.useCd > 0) return;
    if (this.firstAids <= 0) return this.toast('Нет аптечек — скрафтите на верстаке', 'bad');
    if (p.hp >= p.maxHp) return this.toast('Вы здоровы', 'info');
    this.firstAids--;
    this.useCd = 1.2;
    p.hp = Math.min(p.maxHp, p.hp + 70);
    p.burnT = 0;
    p.slowT = 0;
    sfx.buy();
    this.toast('Аптечка: +70 HP', 'good');
  }

  fire() {
    const n = this.bullets.length;
    fireWeapon(this);
    if (this.onTower) {
      for (let i = n; i < this.bullets.length; i++) {
        this.bullets[i].high = true;
        this.bullets[i].life *= 1.3;
      }
    }
    const w = WEAPONS[this.weapon];
    this.alertEnemies(this.player.x, this.player.y, w.silent ? 170 : 700);
  }

  addParticle(q: Particle) {
    const k = QUALITY_MUL[settings.particles];
    if (k < 1 && (q.kind === 'smoke' || q.kind === 'dust' || q.kind === 'casing' || q.kind === 'spark') && Math.random() > k) return;
    this.particles.push(q);
  }

  /** Подпалина / пятно на земле */
  scorch(x: number, y: number, r: number, color: string) {
    if (this.inside) return;
    const ci = Math.floor(x / CELL);
    const cj = Math.floor(y / CELL);
    if (ci < 0 || cj < 0 || ci >= GRID || cj >= GRID) return;
    const c = this.world.cells[cj][ci].ctx;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x - ci * CELL, y - cj * CELL, r, r * (0.7 + Math.random() * 0.3), Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }

  /* ---------------------------------------------------------------- */
  /* Волны и враги                                                     */
  /* ---------------------------------------------------------------- */
  startWave(n: number) {
    this.wave = n;
    const boss = n % 5 === 0;
    this.toSpawn = Math.round((6 + n * 3 + Math.floor(n * n * 0.4)) * this.diff.count) + (boss ? 1 : 0);
    this.spawned = 0;
    this.spawnTimer = 1;
    this.intermission = 0;
    this.bossDue = boss;
    if (boss) {
      this.banner = { title: `Волна ${n} — БОСС`, sub: 'Приближается КОЛОСС. Готовьте тяжёлое оружие!' };
      this.bannerT = 4.5;
      sfx.boss();
    } else {
      this.banner = { title: `Волна ${n}`, sub: `Врагов: ${this.toSpawn}` };
      this.bannerT = 3.5;
      sfx.wave();
    }
  }

  rollType(): EnemyType {
    const n = this.wave;
    const pool: [EnemyType, number][] = [];
    let total = 0;
    for (const t of Object.keys(ENEMIES) as EnemyType[]) {
      const d = ENEMIES[t];
      if (d.boss || d.human || n < d.minWave) continue;
      let w = d.weight;
      if (t === 'walker') w = Math.max(2, 10 - 0.6 * n);
      if (t === 'runner' && n < 2) w = 1;
      pool.push([t, w]);
      total += w;
    }
    let q = Math.random() * total;
    for (const [t, w] of pool) {
      q -= w;
      if (q <= 0) return t;
    }
    return 'walker';
  }

  spawnOne(type: EnemyType, x: number, y: number, extra = false): Enemy {
    const def = ENEMIES[type];
    const scale = 1 + 0.07 * Math.max(0, this.wave - 1);
    const hp = def.hp * scale * this.diff.hp;
    const e: Enemy = {
      id: this.nextId++,
      type,
      x,
      y,
      r: def.r,
      hp,
      maxHp: hp,
      speed: def.speed * (0.9 + Math.random() * 0.2),
      angle: 0,
      attackCd: 0,
      shootCd: 1 + Math.random(),
      flash: 0,
      vx: 0,
      vy: 0,
      phase: Math.random() * 6,
      stuckT: 0,
      detourT: 0,
      detourDir: 1,
      strafe: Math.random() < 0.5 ? 1 : -1,
      dmg: def.dmg * this.diff.dmg,
      dead: false,
      kbMul: def.kbMul,
      abilityCd: 1.5 + Math.random() * 2.5,
      act: 0,
      actT: 0,
      ax: 0,
      ay: 0,
      aux: 3 + Math.random() * 3,
      vis: 0,
      rage: 0,
      burnT: 0,
      burnTick: 0,
      slowT: 0,
      frozenT: 0,
      freezeStack: 0,
      strCd: 0,
      wander: false,
      aggro: false,
      wa: Math.random() * 6.28,
      wt: Math.random() * 3,
    };
    this.enemies.push(e);
    if (!extra) this.spawned++;
    return e;
  }

  spawnEnemy() {
    const p = this.player;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2;
      const d = 520 + Math.random() * 320;
      const x = p.x + Math.cos(a) * d;
      const y = p.y + Math.sin(a) * d;
      if (x < 60 || y < 60 || x > WORLD - 60 || y > WORLD - 60) continue;
      if (Math.hypot(x - CENTER.x, y - CENTER.y) < SAFE_RADIUS + 50) continue;
      if (this.world.grid.circleBlocked(x, y, 26)) continue;
      if (this.bossDue) {
        this.bossDue = false;
        this.bossRef = this.spawnOne('colossus', x, y);
        this.toast('КОЛОСС вышел на охоту!', 'bad');
        return;
      }
      const type = this.rollType();
      const def = ENEMIES[type];
      const pack = Math.max(1, Math.min(def.pack ?? 1, this.toSpawn - this.spawned));
      this.spawnOne(type, x, y);
      for (let i = 1; i < pack; i++) {
        const o = this.spawnOne(type, x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50);
        if (this.world.grid.circleBlocked(o.x, o.y, o.r)) {
          o.x = x;
          o.y = y;
        }
      }
      return;
    }
  }

  /* ---------------------------------------------------------------- */
  resolve(e: { x: number; y: number; r: number }): boolean {
    const g = this.world.grid;
    g.query(e.x - e.r, e.y - e.r, e.x + e.r, e.y + e.r, this.tmp);
    let hit = false;
    for (let i = 0; i < this.tmp.length; i++) {
      const c = this.tmp[i];
      const nx = clamp(e.x, c.x, c.x + c.w);
      const ny = clamp(e.y, c.y, c.y + c.h);
      const dx = e.x - nx;
      const dy = e.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < e.r * e.r) {
        hit = true;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const k = (e.r - d) / d;
          e.x += dx * k;
          e.y += dy * k;
        } else {
          const l = e.x - c.x;
          const rr = c.x + c.w - e.x;
          const t = e.y - c.y;
          const b = c.y + c.h - e.y;
          const m = Math.min(l, rr, t, b);
          if (m === l) e.x = c.x - e.r;
          else if (m === rr) e.x = c.x + c.w + e.r;
          else if (m === t) e.y = c.y - e.r;
          else e.y = c.y + c.h + e.r;
        }
      }
    }
    return hit;
  }

  hurtPlayer(dmg: number, dot = false) {
    const p = this.player;
    if (this.state !== 'playing') return;
    let d = dmg;
    if (p.armor > 0) {
      const a = Math.min(p.armor, d * 0.65);
      p.armor -= a;
      d -= a;
    }
    p.hp -= d;
    p.hurt = dot ? Math.max(p.hurt, 0.18) : 0.35;
    if (!dot) {
      this.shake = Math.max(this.shake, 4);
      sfx.hurt();
      for (let i = 0; i < 5; i++) this.blood(p.x, p.y, Math.random() * 6.28, 1);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'dead';
      this.shopOpen = false;
      this.mouse.down = false;
      saveRun(this.wave, this.kills, Math.floor(this.survived));
    }
  }

  blood(x: number, y: number, ang: number, n: number) {
    const qm = QUALITY_MUL[settings.particles];
    n = Math.max(n > 0 ? 1 : 0, Math.round(n * qm));
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * 1.2;
      const s = 60 + Math.random() * 160;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.3,
        max: 0.6,
        size: 1.5 + Math.random() * 2.2,
        color: Math.random() < 0.5 ? '#6a1511' : '#4d0f0c',
        kind: 'blood',
        rot: 0,
      });
    }
  }

  stain(x: number, y: number, r: number, alpha = 0.5) {
    if (this.inside) return;
    const ci = Math.floor(x / CELL);
    const cj = Math.floor(y / CELL);
    if (ci < 0 || cj < 0 || ci >= GRID || cj >= GRID) return;
    const c = this.world.cells[cj][ci].ctx;
    c.fillStyle = `rgba(70,12,10,${alpha})`;
    c.beginPath();
    c.ellipse(x - ci * CELL, y - cj * CELL, r, r * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }

  damageEnemy(e: Enemy, dmg: number, ang: number, o: { quiet?: boolean; noArmor?: boolean } = {}) {
    if (e.dead) return;
    const def = ENEMIES[e.type];
    if (def.armored && !o.noArmor) {
      dmg = dmg >= 50 ? dmg * 0.9 : dmg * 0.5;
      if (!o.quiet && Math.random() < 0.6) {
        sfx.clang();
        this.addParticle({ x: e.x, y: e.y, vx: Math.cos(ang + Math.PI) * 120 + (Math.random() - 0.5) * 120, vy: Math.sin(ang + Math.PI) * 120 + (Math.random() - 0.5) * 120, life: 0.25, max: 0.25, size: 1.8, color: '#ffe8a0', kind: 'spark', rot: 0 });
      }
    }
    e.hp -= dmg;
    e.flash = 0.1;
    if (settings.dmgNumbers && !o.quiet && dmg >= 1 && this.floaters.length < 60) {
      this.floaters.push({
        x: e.x + (Math.random() - 0.5) * 14,
        y: e.y - e.r - 6,
        text: String(Math.round(dmg)),
        t: 0.8,
        max: 0.8,
        color: dmg >= 100 ? '#ff7a5a' : dmg >= 40 ? '#ffd070' : '#f0ece0',
        big: dmg >= 100,
      });
    }
    if (!o.quiet) {
      const kb = (Math.min(260, dmg * 2.2) * e.kbMul);
      e.vx += Math.cos(ang) * kb;
      e.vy += Math.sin(ang) * kb;
      this.blood(e.x, e.y, ang, 4);
      if (Math.random() < 0.5 * QUALITY_MUL[settings.particles]) this.stain(e.x + Math.cos(ang) * 8, e.y + Math.sin(ang) * 8, 3 + Math.random() * 3, 0.45);
      sfx.hit();
    }
    if (e.hp <= 0) this.killEnemy(e, ang);
  }

  killEnemy(e: Enemy, ang: number) {
    if (e.dead) return;
    e.dead = true;
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    this.kills++;
    sfx.zombieDie();
    this.blood(e.x, e.y, ang, 14);
    const def = ENEMIES[e.type];
    // труп остаётся на земле
    const ci = Math.floor(e.x / CELL);
    const cj = Math.floor(e.y / CELL);
    if (!this.inside && ci >= 0 && cj >= 0 && ci < GRID && cj < GRID && e.type !== 'bloater') {
      const c = this.world.cells[cj][ci].ctx;
      c.save();
      c.translate(e.x - ci * CELL, e.y - cj * CELL);
      c.fillStyle = 'rgba(70,12,10,0.6)';
      c.beginPath();
      c.ellipse(Math.cos(ang) * 4, Math.sin(ang) * 4, e.r * 1.5, e.r * 1.2, ang, 0, Math.PI * 2);
      c.fill();
      c.rotate(ang + Math.PI + (Math.random() - 0.5));
      c.fillStyle = def.clothDark;
      c.beginPath();
      c.ellipse(0, 0, e.r * 0.95, e.r * 0.6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = def.cloth;
      c.beginPath();
      c.ellipse(-1, 0, e.r * 0.75, e.r * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = def.skin;
      c.beginPath();
      c.arc(e.r * 0.8, 0, e.r * 0.42, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    // особые смерти
    if (e.type === 'bloater') {
      explode(this, e.x, e.y, 125, 85, { self: 34 * this.diff.dmg, color: 'acid', shake: 8 });
    } else if (e.type === 'toxic') {
      this.clouds.push({ x: e.x, y: e.y, r: 85, t: 0, max: 7, tick: 0 });
    } else if (e.type === 'mother') {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.283 + Math.random();
        this.spawnOne('crawler', e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, true);
      }
    } else if (e.type === 'colossus') {
      this.banner = { title: 'КОЛОСС ПОВЕРЖЕН', sub: 'Щедрая награда выпала из тела гиганта' };
      this.bannerT = 4.5;
      this.bossRef = null;
      this.shake = Math.max(this.shake, 16);
      sfx.explosion(200);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283;
        this.pickups.push({ x: e.x + Math.cos(a) * 36, y: e.y + Math.sin(a) * 36, kind: 'cash', amount: Math.round(this.diff.reward * 120), life: 90 });
      }
      this.pickups.push({ x: e.x + 20, y: e.y - 30, kind: 'medkit', amount: 60, life: 90 });
    }
    // добыча
    const reward = Math.round((def.reward[0] + Math.random() * (def.reward[1] - def.reward[0])) * this.diff.reward);
    if (Math.random() < 0.9) this.pickups.push({ x: e.x, y: e.y, kind: 'cash', amount: reward, life: 45 });
    if (e.type === 'bandit' && Math.random() < 0.08) {
      const fr = FRAME_ORDER[Math.floor(Math.random() * 3)];
      this.pickups.push({ x: e.x + 4, y: e.y - 12, kind: 'res', res: fr, amount: 1, life: 60 });
    }
    if (Math.random() < (e.type === 'marauder' || e.type === 'bandit' ? 0.4 : 0.12)) {
      const types = (Object.keys(AMMO) as AmmoType[]).filter((t) => AMMO[t].price > 0 && ALL_ORDER.some((w) => this.owned[w] && WEAPONS[w].ammo === t));
      const t = types[Math.floor(Math.random() * types.length)] ?? '9mm';
      this.pickups.push({ x: e.x + 10, y: e.y + 8, kind: 'ammo', ammo: t, amount: Math.ceil(AMMO[t].pack / 3), life: 45 });
    }
    if (Math.random() < 0.04) this.pickups.push({ x: e.x - 10, y: e.y + 6, kind: 'medkit', amount: 30, life: 45 });
    if (Math.random() < (this.phase === 'night' ? 0.28 : 0.15)) {
      const r = RES_ORDER[Math.floor(Math.random() * RES_ORDER.length)];
      this.pickups.push({ x: e.x - 8, y: e.y - 9, kind: 'res', res: r, amount: 1 + (Math.random() < 0.3 ? 1 : 0), life: 60 });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Обновление                                                        */
  /* ---------------------------------------------------------------- */
  update(dt: number) {
    if (this.paused && this.state === 'playing') return;
    this.time += dt;
    const p = this.player;
    // тосты и баннер
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner = null;
    }

    // частицы работают всегда
    this.updateParticles(dt);

    // камера в меню
    if (this.state === 'menu') {
      this.cam.x = CENTER.x + Math.sin(this.time * 0.15) * 120;
      this.cam.y = CENTER.y + 20 + Math.cos(this.time * 0.12) * 80;
      return;
    }
    if (this.state === 'dead') {
      p.hurt = Math.max(0, p.hurt - dt);
      for (const e of this.enemies) this.updateEnemy(e, dt, true);
      updateFx(this, dt);
      return;
    }
    if (this.shopOpen || this.craftOpen) return;

    if (this.fadeDur > 0) {
      const before = this.fadeT;
      this.fadeT += dt;
      if (before < this.fadeDur * 0.5 && this.fadeT >= this.fadeDur * 0.5 && this.fadeCb) {
        const cb = this.fadeCb;
        this.fadeCb = null;
        cb();
      }
      if (this.fadeT >= this.fadeDur) {
        this.fadeDur = 0;
        this.fadeT = 0;
        this.fadeCb = null;
      }
      return;
    }

    this.survived += dt;
    updatePower(this, dt);
    if (this.mouse.buffer > 0) this.mouse.buffer -= dt;
    if (this.emptyClickT > 0) this.emptyClickT -= dt;
    if (p.hurt > 0) p.hurt -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (this.swingT > 0) this.swingT -= dt;
    if (this.useCd > 0) this.useCd -= dt;

    if (this.loc === 'basement') {
      updateBasement(this, dt);
      this.updateGhost();
      return;
    }
    if (this.buildSel) this.updateGhost();

    // статусы игрока
    if (p.slowT > 0) p.slowT -= dt;
    if (p.burnT > 0) {
      p.burnT -= dt;
      p.burnTick -= dt;
      if (Math.random() < dt * 14) this.addParticle({ x: p.x + (Math.random() - 0.5) * 14, y: p.y + (Math.random() - 0.5) * 14, vx: 0, vy: -40, life: 0.5, max: 0.5, size: 3, color: '#ff9a30', kind: 'spark', rot: 0 });
      if (p.burnTick <= 0) {
        p.burnTick = 0.5;
        this.hurtPlayer(3 * this.diff.dmg, true);
      }
    }

    // движение
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    const len = Math.hypot(mx, my);
    p.moving = len > 0 && !this.onTower;
    if (len > 0 && !this.onTower) {
      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const sp = (sprint ? 255 : 195) * (this.reloading ? 0.92 : 1) * (p.slowT > 0 ? 0.6 : 1);
      p.x += (mx / len) * sp * dt;
      p.y += (my / len) * sp * dt;
      p.phase += dt * (sprint ? 16 : 12);
    }
    if (!this.onTower) {
      this.resolve(p);
      this.resolve(p);
    }
    p.x = clamp(p.x, 26, WORLD - 26);
    p.y = clamp(p.y, 26, WORLD - 26);

    // границы города: днём — кольцо, ночью расширяются на всю карту
    if (!this.inside) {
      const tgt = this.phase === 'night' ? NIGHT_RADIUS : DAY_RADIUS;
      if (this.cityR < tgt) this.cityR = Math.min(tgt, this.cityR + 320 * dt);
      else if (this.cityR > tgt) this.cityR = Math.max(tgt, this.cityR - 400 * dt);
      const dc = Math.hypot(p.x - CENTER.x, p.y - CENTER.y);
      if (dc > this.cityR && !this.onTower) {
        const k = this.cityR / dc;
        p.x = CENTER.x + (p.x - CENTER.x) * k;
        p.y = CENTER.y + (p.y - CENTER.y) * k;
        if (this.borderWarn <= 0) {
          this.borderWarn = 4;
          this.toast('Дальше — зона заражения. Ночью границы города расширятся', 'info');
        }
      }
      if (this.borderWarn > 0) this.borderWarn -= dt;
    }

    // прицел
    const wx = this.mouse.x + this.camTop.x;
    const wy = this.mouse.y + this.camTop.y;
    p.angle = Math.atan2(wy - p.y, wx - p.x);

    // перезарядка и стрельба
    const w = WEAPONS[this.weapon];
    const st = this.owned[this.weapon];
    if (this.cooldown > 0) this.cooldown -= dt;
    if (w.melee) {
      this.reloading = false;
      const swing = !this.buildSel && (this.mouse.down || this.mouse.buffer > 0);
      if (swing && this.cooldown <= 0) {
        this.meleeSwing();
        this.mouse.buffer = 0;
      }
    } else if (this.reloading) {
      this.reloadT += dt;
      if (this.reloadT >= w.reload) {
        const need = w.mag - st.mag;
        const take = Math.min(need, this.reserve[w.ammo]);
        st.mag += take;
        this.reserve[w.ammo] -= take;
        this.reloading = false;
        this.reloadT = 0;
        sfx.reloadDone();
      }
    } else {
      const wants = !this.buildSel && (w.auto ? this.mouse.down : this.mouse.buffer > 0);
      if (wants && this.cooldown <= 0) {
        if (st.mag > 0) {
          this.fire();
          this.mouse.buffer = 0;
        } else if (this.reserve[w.ammo] > 0) {
          this.startReload();
        } else if (this.emptyClickT <= 0) {
          sfx.empty();
          this.emptyClickT = 0.5;
          this.toast('Патроны закончились — загляните к торговцу', 'bad');
          this.mouse.buffer = 0;
        }
      }
      if (st.mag === 0 && this.reserve[w.ammo] > 0 && !this.reloading) this.startReload();
    }

    // внутри дома: отдельная комната, волны и город на паузе
    if (this.inside) {
      for (const e of this.enemies) this.updateEnemy(e, dt, false);
      this.updateBullets(dt);
      this.updatePickups(dt);
      updateCrates(this, dt);
      updateInterior(this, this.inside);
      updateFx(this, dt);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
      return;
    }

    // волны
    if (this.wave > 0 && this.intermission <= 0 && this.toSpawn > 0 && this.spawned >= this.toSpawn && this.enemies.length === 0) {
      const bonus = Math.round((40 + this.wave * 25) * this.diff.reward);
      this.money += bonus;
      this.nextWave = this.wave + 1;
      this.toSpawn = 0;
      if (this.wave % WAVES_PER_DAY === 0) this.endDay(bonus);
      else {
        this.intermission = 20;
        this.banner = { title: `Волна ${this.wave} отбита`, sub: `Награда: ${bonus} ₽ · загляните к торговцу` };
        this.bannerT = 4;
        sfx.pickup();
        this.autosave();
      }
    }
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.nextWave);
    } else if (this.wave > 0 && this.spawned < this.toSpawn) {
      this.spawnTimer -= dt;
      const cap = Math.min(8 + this.wave * 2, 28);
      if (this.spawnTimer <= 0 && this.enemies.length < cap) {
        this.spawnEnemy();
        this.spawnTimer = Math.max(0.3, 0.9 - this.wave * 0.04);
      }
    }

    // враги
    for (const e of this.enemies) this.updateEnemy(e, dt, false);
    // слишком далёкие враги подтягиваются к игроку
    for (const e of this.enemies) {
      if (!e.wander && Math.hypot(e.x - p.x, e.y - p.y) > 1500) {
        const a = Math.random() * 6.28;
        const nx = p.x + Math.cos(a) * 700;
        const ny = p.y + Math.sin(a) * 700;
        if (nx > 60 && ny > 60 && nx < WORLD - 60 && ny < WORLD - 60 && !this.world.grid.circleBlocked(nx, ny, 26)) {
          e.x = nx;
          e.y = ny;
        }
      }
    }

    this.updateBullets(dt);
    this.updatePickups(dt);
    updateCrates(this, dt);
    updateStructures(this, dt);
    if (this.phase === 'night') this.updateNight(dt);
    updateAirdrop(this, dt);
    updateFx(this, dt);

    // крыши
    for (const b of this.world.buildings) {
      if (!b.roof) continue;
      const inside = p.x > b.rect.x && p.x < b.rect.x + b.rect.w && p.y > b.rect.y && p.y < b.rect.y + b.rect.h;
      const target = inside ? 0.18 : 1;
      b.alpha += (target - b.alpha) * Math.min(1, dt * 8);
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
  }

  updateEnemy(e: Enemy, dt: number, idle: boolean) {
    const p = this.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    let ang = Math.atan2(dy, dx);
    e.flash = Math.max(0, e.flash - dt);
    e.attackCd -= dt;
    e.shootCd -= dt;
    if (e.vis > 0) e.vis -= dt;
    e.angle = ang;

    // статусы
    if (!idle) {
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTick -= dt;
        if (Math.random() < dt * 12) this.addParticle({ x: e.x + (Math.random() - 0.5) * e.r, y: e.y + (Math.random() - 0.5) * e.r, vx: 0, vy: -45, life: 0.45, max: 0.45, size: 3, color: Math.random() < 0.5 ? '#ff9a30' : '#ffd060', kind: 'spark', rot: 0 });
        if (e.burnTick <= 0) {
          e.burnTick = 0.3;
          this.damageEnemy(e, 5.5, ang, { quiet: true, noArmor: true });
          if (e.dead) return;
        }
      }
      if (e.slowT > 0) {
        e.slowT -= dt;
        if (e.slowT <= 0) e.freezeStack = 0;
      }
      if (e.frozenT > 0) e.frozenT -= dt;
    }

    let speed = idle ? 0 : e.speed;
    if (e.slowT > 0) speed *= 0.45;
    if (e.frozenT > 0) speed = 0;
    const playerSafe = Math.hypot(p.x - CENTER.x, p.y - CENTER.y) < SAFE_RADIUS - 5;
    let sleeping = false;
    if (!idle && e.wander) {
      if (!e.aggro) {
        if (dist < 340 && !playerSafe) e.aggro = true;
        else sleeping = true;
      } else if (dist > 1200 || playerSafe) {
        e.aggro = false;
        sleeping = true;
      }
    }

    let ai = { ang, speed, move: true, melee: true, meleeDmg: e.dmg, meleeCd: 0.85 };
    if (idle || e.frozenT > 0) {
      ai = { ang, speed: 0, move: false, melee: false, meleeDmg: 0, meleeCd: 1 };
    } else if (sleeping && e.home) {
      const hx = e.home.x - e.x;
      const hy = e.home.y - e.y;
      const hd = Math.hypot(hx, hy);
      e.wt -= dt;
      if (e.wt <= 0) {
        e.wt = 2 + Math.random() * 3;
        e.wa += (Math.random() - 0.5) * 1.6;
      }
      ai = hd > 60 ? { ang: Math.atan2(hy, hx), speed: speed * 0.7, move: true, melee: false, meleeDmg: 0, meleeCd: 1 } : { ang: e.wa, speed: 0, move: false, melee: false, meleeDmg: 0, meleeCd: 1 };
    } else if (sleeping) {
      e.wt -= dt;
      if (e.wt <= 0) {
        e.wt = 2 + Math.random() * 3;
        e.wa += (Math.random() - 0.5) * 2.6;
      }
      ai = { ang: e.wa, speed: speed * 0.22, move: true, melee: false, meleeDmg: 0, meleeCd: 1 };
    } else {
      ai = enemyAI(this, e, dt, dist, ang, speed, playerSafe);
      if (e.dead) return;
    }
    ang = ai.ang;
    speed = ai.speed;
    if (sleeping) e.angle = ang;

    if (e.detourT > 0) {
      e.detourT -= dt;
      ang += e.detourDir * 1.3;
    }

    const ox = e.x;
    const oy = e.y;
    if (ai.move && speed > 0) {
      e.x += Math.cos(ang) * speed * dt;
      e.y += Math.sin(ang) * speed * dt;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const damp = Math.max(0, 1 - 9 * dt);
    e.vx *= damp;
    e.vy *= damp;
    e.phase += dt * (speed / 22 + 1);

    // разделение
    for (const o of this.enemies) {
      if (o === e) continue;
      const ddx = e.x - o.x;
      const ddy = e.y - o.y;
      const min = e.r + o.r - 2;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.5;
        e.x += ddx * push;
        e.y += ddy * push;
      }
    }
    this.resolve(e);
    this.resolve(e);
    if (!idle && !sleeping) enemyStructContact(this, e, dt);

    // лагерь — безопасная зона
    const dc = Math.hypot(e.x - CENTER.x, e.y - CENTER.y);
    if (dc < SAFE_RADIUS) {
      const k = SAFE_RADIUS / (dc || 1);
      e.x = CENTER.x + (e.x - CENTER.x) * k;
      e.y = CENTER.y + (e.y - CENTER.y) * k;
    }
    e.x = clamp(e.x, 24, WORLD - 24);
    e.y = clamp(e.y, 24, WORLD - 24);

    // застревание
    if (!idle && ai.move && speed > 0 && e.act !== 2) {
      const moved = Math.hypot(e.x - ox, e.y - oy);
      if (moved < speed * dt * 0.3) e.stuckT += dt;
      else e.stuckT = Math.max(0, e.stuckT - dt);
      if (e.stuckT > 0.4) {
        e.stuckT = 0;
        e.detourT = 0.8 + Math.random() * 0.6;
        e.detourDir = Math.random() < 0.5 ? 1 : -1;
      }
    }

    // атака вблизи
    if (!idle && ai.melee && dist < e.r + p.r + 5 && e.attackCd <= 0 && !playerSafe) {
      e.attackCd = ai.meleeCd;
      this.hurtPlayer(ai.meleeDmg);
    }
  }

  updateBullets(dt: number) {
    const g = this.world.grid;
    const p = this.player;
    for (const b of this.bullets) {
      b.age += dt;
      // самонаведение
      if (b.homing > 0 && !b.dead) {
        let tgt: Enemy | undefined = b.target ? this.enemies.find((e) => e.id === b.target && !e.dead) : undefined;
        if (!tgt) {
          let best = 650;
          for (const e of this.enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - b.x, e.y - b.y);
            if (d < best) {
              best = d;
              tgt = e;
            }
          }
          b.target = tgt ? tgt.id : 0;
        }
        if (tgt) {
          let da = Math.atan2(tgt.y - b.y, tgt.x - b.x) - Math.atan2(b.vy, b.vx);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          const step = clamp(da, -b.homing * dt, b.homing * dt);
          const cur = Math.atan2(b.vy, b.vx) + step;
          b.vx = Math.cos(cur) * b.speed;
          b.vy = Math.sin(cur) * b.speed;
        }
      }
      if ((b.kind === 'rocket' || b.kind === 'missile') && Math.random() < 0.9) {
        const m = Math.hypot(b.vx, b.vy) || 1;
        this.addParticle({ x: b.x - (b.vx / m) * 8, y: b.y - (b.vy / m) * 8, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.5, max: 0.5, size: 3, color: 'rgba(190,190,185,', kind: 'smoke', rot: 0 });
      }
      if (b.kind === 'singularity' && Math.random() < 0.6) {
        const a = Math.random() * 6.28;
        this.addParticle({ x: b.x + Math.cos(a) * 24, y: b.y + Math.sin(a) * 24, vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60, life: 0.35, max: 0.35, size: 1.8, color: '#b070ff', kind: 'spark', rot: 0 });
      }
      const n = Math.max(1, Math.ceil((b.speed * dt) / 9));
      const sx = (b.vx * dt) / n;
      const sy = (b.vy * dt) / n;
      for (let i = 0; i < n && !b.dead; i++) {
        b.x += sx;
        b.y += sy;
        if (!b.high && g.blockedPoint(b.x, b.y)) {
          b.dead = true;
          if (b.kind === 'bullet') {
            for (let k = 0; k < 4; k++) {
              const a = Math.atan2(-sy, -sx) + (Math.random() - 0.5) * 2;
              const s = 40 + Math.random() * 120;
              this.addParticle({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25, max: 0.25, size: 1.5, color: k % 2 ? '#d9c28a' : '#b0aaa0', kind: 'spark', rot: 0 });
            }
            this.addParticle({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 6, color: 'rgba(150,145,135,', kind: 'dust', rot: 0 });
          }
          break;
        }
        if (b.from === 'p') {
          const hr = b.kind === 'bullet' ? 3 : b.kind === 'flame' ? 4 + b.age * 12 : b.size;
          for (const e of this.enemies) {
            if (e.dead || b.hit.includes(e.id)) continue;
            const dd = Math.hypot(e.x - b.x, e.y - b.y);
            if (dd < e.r + hr) {
              b.hit.push(e.id);
              if (b.dmg > 0) this.damageEnemy(e, b.dmg, Math.atan2(sy, sx), { quiet: b.kind === 'flame' });
              if (!e.dead) {
                if (b.burn) e.burnT = 3.2;
                if (b.slow) {
                  e.slowT = 3;
                  e.freezeStack++;
                  if (e.freezeStack >= 7) {
                    e.frozenT = 2.2;
                    e.freezeStack = 0;
                    for (let k = 0; k < 6; k++) this.addParticle({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.4, max: 0.4, size: 2.4, color: '#c8f4ff', kind: 'spark', rot: 0 });
                  }
                }
              }
              if (b.pierce <= 0) {
                b.dead = true;
                break;
              }
              b.pierce--;
              if (b.kind === 'bullet') b.dmg *= 0.7;
            }
          }
        } else {
          if (Math.hypot(b.x - CENTER.x, b.y - CENTER.y) < SAFE_RADIUS) {
            b.dead = true;
            break;
          }
          if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + (b.kind === 'bullet' ? 3 : b.size * 0.6)) {
            b.dead = true;
            this.hurtPlayer(b.dmg, b.kind === 'flame');
            if (b.kind === 'acid') {
              p.slowT = 2.2;
              this.toast('Кислота замедляет вас!', 'bad');
            }
            if (b.burn) p.burnT = 2.5;
          }
        }
      }
      b.life -= dt;
      if (b.life <= 0) b.dead = true;
    }
    for (const b of this.bullets) if (b.dead && !b.done) finishBullet(this, b);
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  updatePickups(dt: number) {
    const p = this.player;
    for (const k of this.pickups) {
      k.life -= dt;
      const d = Math.hypot(p.x - k.x, p.y - k.y);
      if (d < 70 && d > 1) {
        const pull = (1 - d / 70) * 160 * dt;
        k.x += ((p.x - k.x) / d) * pull;
        k.y += ((p.y - k.y) / d) * pull;
      }
      if (d < 22) {
        if (k.kind === 'cash') {
          this.money += k.amount;
          this.toast(`+${k.amount} ₽`, 'good');
        } else if (k.kind === 'ammo' && k.ammo) {
          const a = AMMO[k.ammo];
          if (this.reserve[k.ammo] >= a.cap) continue;
          this.reserve[k.ammo] = Math.min(a.cap, this.reserve[k.ammo] + k.amount);
          this.toast(`+${k.amount} · ${a.name}`, 'good');
        } else if (k.kind === 'res' && k.res) {
          this.res[k.res] += k.amount;
          this.toast(`+${k.amount} ${RES[k.res].name}`, 'good');
        } else if (k.kind === 'medkit') {
          if (p.hp >= p.maxHp) continue;
          p.hp = Math.min(p.maxHp, p.hp + k.amount);
          this.toast(`+${k.amount} здоровья`, 'good');
        }
        sfx.pickup();
        k.life = -1;
      }
    }
    this.pickups = this.pickups.filter((k) => k.life > 0);
  }

  updateParticles(dt: number) {
    for (const q of this.particles) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.kind === 'casing') {
        q.vx *= Math.max(0, 1 - 5 * dt);
        q.vy *= Math.max(0, 1 - 5 * dt);
        q.rot += dt * 10 * (q.vx > 0 ? 1 : -1);
      } else if (q.kind === 'smoke' || q.kind === 'dust') {
        q.size += dt * 14;
        q.vx *= 0.96;
        q.vy *= 0.96;
      } else {
        q.vx *= Math.max(0, 1 - 4 * dt);
        q.vy *= Math.max(0, 1 - 4 * dt);
      }
      if (q.kind === 'blood' && q.life <= 0.02 && Math.random() < 0.4) this.stain(q.x, q.y, q.size * 0.9, 0.5);
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    if (this.particles.length > 450) this.particles.splice(0, this.particles.length - 450);
  }

  /* ---------------------------------------------------------------- */
  /* Снимок для интерфейса                                             */
  /* ---------------------------------------------------------------- */
  snapshot(): Snapshot {
    const prompt = this.getPrompt();
    const w = WEAPONS[this.weapon];
    const st = this.owned[this.weapon];
    const info = airdropInfo(this);
    const boss = this.bossRef && !this.bossRef.dead ? this.bossRef : null;
    return {
      state: this.state,
      paused: this.paused,
      flareGun: this.hasFlareGun,
      flares: this.flares,
      incoming: info.incoming,
      crate: info.crate,
      boss: boss ? { name: ENEMIES.colossus.name, hp: Math.max(0, Math.ceil(boss.hp)), max: Math.ceil(boss.maxHp) } : null,
      burning: this.player.burnT > 0,
      slowed: this.player.slowT > 0,
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      armor: Math.ceil(this.player.armor),
      money: this.money,
      weapon: this.weapon,
      mag: st ? st.mag : 0,
      magSize: w.mag,
      reserve: { ...this.reserve },
      owned: ALL_ORDER.filter((id) => this.owned[id]),
      reloadProgress: this.reloading ? Math.min(1, this.reloadT / w.reload) : -1,
      wave: this.wave,
      enemiesLeft: this.enemies.length + Math.max(0, this.toSpawn - this.spawned),
      intermission: Math.max(0, Math.ceil(this.intermission)),
      kills: this.kills,
      nearTrader: this.state === 'playing' && this.nearTrader(),
      shopOpen: this.shopOpen,
      banner: this.banner,
      toasts: this.toasts.map((t) => ({ ...t })),
      time: Math.floor(this.survived),
      hurt: this.player.hurt,
      day: this.day,
      waveInDay: this.wave <= 0 ? 0 : ((this.wave - 1) % WAVES_PER_DAY) + 1,
      phase: this.phase,
      loc: this.loc,
      res: { ...this.res },
      inv: { ...this.inv },
      structCount: this.structures.length,
      buildOpen: this.buildOpen,
      buildSel: this.buildSel,
      buildOk: this.ghost.ok,
      buildReason: this.ghost.reason,
      craftOpen: this.craftOpen,
      prompt: prompt ? prompt.text : null,
      promptProgress: prompt ? prompt.progress : -1,
      onTower: !!this.onTower,
      hasBench: this.structures.some((q) => q.type === 'workbench') || this.furn.some((q) => q.type === 'workbench'),
      furnBuilt: this.furn.reduce<Record<string, number>>((a, f) => ((a[f.type] = (a[f.type] ?? 0) + 1), a), {}),
      bandages: this.bandages,
      firstAids: this.firstAids,
      genStock: this.genStock,
      wireMode: this.buildSel === 'wire',
      wireFrom: this.wirePending !== null,
      inside: this.inside ? this.inside.kind : null,
    };
  }

  emit() {
    this.onUpdate(this.snapshot());
  }

  loop = (now: number) => {
    if (!this.running) return;
    const raw = Math.max(0.0005, (now - this.lastT) / 1000);
    const dt = Math.min(0.05, raw);
    this.fpsAcc += (1 / raw - this.fpsAcc) * 0.05;
    this.lastT = now;
    this.update(dt);
    this.render();
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.08;
      this.emit();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /* ---------------------------------------------------------------- */
  /* Отрисовка                                                         */
  /* ---------------------------------------------------------------- */
  render() {
    const ctx = this.ctx;
    const { W, H, dpr } = this;
    const p = this.player;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e100e';
    ctx.fillRect(0, 0, W, H);

    if (this.state !== 'menu' && this.loc === 'basement') {
      drawBasement(this, ctx, this.buildSel && this.buildSel !== 'wire' ? { type: this.buildSel as FurnId, x: this.ghost.x, y: this.ghost.y, rot: this.buildRot, ok: this.ghost.ok } : undefined);
      this.drawOverlay(ctx);
      return;
    }

    // камера
    const look = settings.look * (this.onTower ? 2.3 : 1);
    const lookX = this.state === 'playing' && !this.shopOpen && !this.craftOpen && !this.paused ? (this.mouse.x - W / 2) * look : 0;
    const lookY = this.state === 'playing' && !this.shopOpen && !this.craftOpen && !this.paused ? (this.mouse.y - H / 2) * look : 0;
    if (this.state !== 'menu') {
      const tx = p.x + lookX;
      const ty = p.y + lookY;
      this.cam.x += (tx - this.cam.x) * 0.14;
      this.cam.y += (ty - this.cam.y) * 0.14;
    }
    let cx = this.cam.x;
    let cy = this.cam.y;
    if (this.inside) {
      const RM = roomOf(this.inside.kind);
      cx = W >= RM.w + 160 ? RM.x + RM.w / 2 : clamp(cx, RM.x + W / 2 - 80, RM.x + RM.w - W / 2 + 80);
      cy = H >= RM.h + 160 ? RM.y + RM.h / 2 : clamp(cy, RM.y + H / 2 - 80, RM.y + RM.h - H / 2 + 80);
    } else {
      if (WORLD > W) cx = clamp(cx, W / 2 - 50, WORLD - W / 2 + 50);
      if (WORLD > H) cy = clamp(cy, H / 2 - 50, WORLD - H / 2 + 50);
    }
    const sh = this.shake * settings.shake;
    const camX = Math.round(cx - W / 2 + (Math.random() - 0.5) * sh);
    const camY = Math.round(cy - H / 2 + (Math.random() - 0.5) * sh);
    this.camTop.x = Math.round(cx - W / 2);
    this.camTop.y = Math.round(cy - H / 2);

    ctx.save();
    ctx.translate(-camX, -camY);

    // клетки земли
    const c0 = Math.max(0, Math.floor(camX / CELL));
    const c1 = Math.min(GRID - 1, Math.floor((camX + W) / CELL));
    const r0 = Math.max(0, Math.floor(camY / CELL));
    const r1 = Math.min(GRID - 1, Math.floor((camY + H) / CELL));
    if (this.inside) drawInterior(this, ctx, this.inside);
    else for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) ctx.drawImage(this.world.cells[j][i].canvas, i * CELL, j * CELL);

    const vx0 = camX - 60;
    const vy0 = camY - 60;
    const vx1 = camX + W + 60;
    const vy1 = camY + H + 60;
    const inView = (x: number, y: number) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    // костёр в бочке
    if (!this.inside) {
      this.drawFire(ctx, CENTER.x - 127, CENTER.y + 47);
      this.drawHatch(ctx);
      drawCityBorder(this, ctx, camX, camY);
      drawCamps(this, ctx, inView);
      drawAccessMarkers(this, ctx, inView);
    }

    // предметы
    for (const k of this.pickups) {
      if (!inView(k.x, k.y)) continue;
      ctx.save();
      ctx.translate(k.x, k.y + Math.sin(this.time * 3 + k.x) * 1.2);
      if (k.life < 5) ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.time * 8));
      if (k.kind === 'res' && k.res) drawResPickup(ctx, k.res, this.time + k.x);
      else if (k.kind !== 'res') drawPickup(ctx, k.kind, this.time + k.x);
      ctx.restore();
    }

    // эффекты на земле, аирдроп
    drawFxGround(this, ctx, inView);
    drawAirdropGround(this, ctx, inView);
    drawStructures(this, ctx, inView, 'ground');
    drawCrates(this, ctx, inView);
    if (this.buildSel && this.loc === 'surface' && this.state === 'playing') drawGhost(ctx, this.buildSel as StructId, this.ghost.x, this.ghost.y, this.buildRot, this.ghost.ok, this.time);

    // торговец
    if (!this.inside) this.drawTrader(ctx);

    // гильзы (на земле)
    for (const q of this.particles) {
      if (q.kind !== 'casing' || !inView(q.x, q.y)) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(1, q.life / 0.5);
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      ctx.fillRect(-q.size / 2, -1, q.size, 2);
      ctx.restore();
    }

    // враги
    for (const e of this.enemies) {
      if (!inView(e.x, e.y)) continue;
      this.drawEnemy(ctx, e);
    }
    // игрок
    if (!this.onTower) this.drawPlayer(ctx);

    // пули
    ctx.lineCap = 'round';
    for (const b of this.bullets) {
      if (!inView(b.x, b.y)) continue;
      drawBullet(ctx, b, this.time);
    }

    // частицы
    for (const q of this.particles) {
      if (q.kind === 'casing' || !inView(q.x, q.y)) continue;
      const a = Math.max(0, q.life / q.max);
      if (q.kind === 'smoke' || q.kind === 'dust') {
        ctx.fillStyle = q.color + a * 0.28 + ')';
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = Math.min(1, a * 1.5);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    drawFxTop(this, ctx, inView);

    // кроны деревьев
    for (const t of this.inside ? [] : this.world.trees) {
      if (!inView(t.x, t.y)) continue;
      const near = Math.hypot(p.x - t.x, p.y - t.y) < 55 * t.s;
      ctx.globalAlpha = near ? 0.5 : 0.94;
      const s = 170 * t.s;
      ctx.drawImage(this.world.treeSprites[t.v], t.x - s / 2, t.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    // крыши
    for (const b of this.inside ? [] : this.world.buildings) {
      if (!b.roof) continue;
      if (b.rect.x > vx1 || b.rect.x + b.rect.w < vx0 || b.rect.y > vy1 || b.rect.y + b.rect.h < vy0) continue;
      ctx.globalAlpha = b.alpha;
      ctx.drawImage(b.roof, b.roofX, b.roofY);
    }
    ctx.globalAlpha = 1;

    // тент торговца
    const aw = this.world.awning;
    const nearAw = Math.abs(p.x - CENTER.x) < 100 && p.y > CENTER.y - 76 && p.y < CENTER.y + 40;
    ctx.globalAlpha = nearAw ? 0.4 : 0.55;
    if (!this.inside) ctx.drawImage(aw.canvas, aw.x, aw.y);
    ctx.globalAlpha = 1;

    drawStructures(this, ctx, inView, 'air');
    if (this.onTower) this.drawPlayer(ctx);
    drawAirdropAir(this, ctx, inView);

    // вспышка выстрела
    if (p.flash > 0 && this.state === 'playing') {
      const w = WEAPONS[this.weapon];
      const mxp = p.x + Math.cos(p.angle) * (w.muzzle + 2);
      const myp = p.y + Math.sin(p.angle) * (w.muzzle + 2);
      const g = ctx.createRadialGradient(mxp, myp, 1, mxp, myp, 46);
      g.addColorStop(0, w.silent ? 'rgba(200,220,255,0.18)' : w.mode === 'bullet' || w.mode === 'flame' || w.mode === 'rocket' ? 'rgba(255,225,150,0.5)' : 'rgba(180,230,255,0.5)');
      g.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mxp, myp, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(mxp, myp);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(255,214,120,0.95)';
      ctx.beginPath();
      const L = flashLen(w);
      ctx.moveTo(0, 0);
      ctx.lineTo(L * 0.4, -5);
      ctx.lineTo(L, 0);
      ctx.lineTo(L * 0.4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,225,0.95)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(L * 0.3, -2.5);
      ctx.lineTo(L * 0.6, 0);
      ctx.lineTo(L * 0.3, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    this.drawOverlay(ctx);
  }

  drawHatch(ctx: CanvasRenderingContext2D) {
    const { x, y } = HATCH;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-27, -23, 58, 52);
    ctx.fillStyle = '#4a4d50';
    ctx.fillRect(-30, -28, 60, 56);
    ctx.fillStyle = '#6a6e72';
    ctx.fillRect(-27, -25, 54, 50);
    ctx.strokeStyle = '#2a2c2e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-27, -25, 54, 50);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    for (let i = -20; i <= 20; i += 8) {
      ctx.beginPath();
      ctx.moveTo(-26, i);
      ctx.lineTo(26, i);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a2c2e';
    ctx.fillRect(-20, -26, 5, 6);
    ctx.fillRect(15, -26, 5, 6);
    ctx.strokeStyle = this.phase === 'night' ? '#6fd0e8' : '#b8a15a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 4, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const near = Math.hypot(this.player.x - x, this.player.y - y) < 62;
    ctx.font = 'bold 10px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.phase === 'night' ? 'rgba(150,230,255,0.9)' : 'rgba(200,180,110,0.75)';
    ctx.fillText(this.phase === 'night' ? '▼ ПОДВАЛ' : '🔒 ПОДВАЛ', x, y + 42);
    if (near && this.state === 'playing') {
      ctx.fillStyle = 'rgba(255,230,150,0.9)';
      ctx.fillText('E', x, y - 38 + Math.sin(this.time * 5) * 2);
    }
  }

  drawNight(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const p = this.player;
    const cx = this.camTop.x;
    const cy = this.camTop.y;
    const lights: Light[] = [];
    const add = (x: number, y: number, r: number, k = 1, warm?: string) => {
      const sx = x - cx;
      const sy = y - cy;
      if (sx < -r || sy < -r || sx > W + r || sy > H + r) return;
      lights.push({ x: sx, y: sy, r, k, warm });
    };
    const fl = 0.85 + Math.sin(this.time * 17) * 0.08 + Math.sin(this.time * 29) * 0.07;
    add(CENTER.x - 127, CENTER.y + 47, 300, 0.95, `rgba(255,140,50,${0.22 * fl})`);
    add(CENTER.x, CENTER.y - 10, 210, 0.8, 'rgba(255,210,140,0.1)');
    add(HATCH.x, HATCH.y, 110, 0.7, 'rgba(100,200,230,0.12)');
    campLights(this, add);
    add(p.x, p.y, this.onTower ? 420 : 250, 0.85);
    if (p.flash > 0) add(p.x + Math.cos(p.angle) * 40, p.y + Math.sin(p.angle) * 40, 250, 0.9, 'rgba(255,220,150,0.18)');
    for (const s of this.structures) {
      const d = STRUCTS[s.type];
      if (d.kind === 'turret') add(s.x, s.y, s.flash > 0 ? 190 : 85, 0.7, s.type === 'turret_tesla' ? 'rgba(120,180,255,0.14)' : s.flash > 0 ? 'rgba(255,200,120,0.14)' : undefined);
      else if (d.kind === 'tower') add(s.x, s.y, 260, 0.9, 'rgba(255,240,200,0.08)');
      else if (d.kind === 'bench') add(s.x, s.y, 90, 0.5);
    }
    for (const r of this.rings) add(r.x, r.y, 140 + r.max * 0.4, 0.8, 'rgba(255,170,80,0.12)');
    for (const b of this.bullets) if (b.from === 'p' && (b.kind === 'flame' || b.kind === 'plasma' || b.kind === 'rocket')) add(b.x, b.y, 120, 0.8);
    for (const d of this.crates) if (!d.opened) add(d.x, d.y, 40, 0.5);
    const cone = this.state === 'playing' && !this.paused && !this.onTower ? { x: p.x - cx, y: p.y - cy, ang: p.angle, len: 520, spread: 0.42 } : undefined;
    drawDarkness(ctx, W, H, 0.74, [3, 7, 22], lights, cone);
  }

  drawFire(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const t = this.time;
    const fl = 0.8 + Math.sin(t * 17) * 0.1 + Math.sin(t * 29) * 0.1;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 120);
    g.addColorStop(0, `rgba(255,150,60,${0.28 * fl})`);
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1512';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = t * 6 + i * 1.6;
      const r = 3 + 2.5 * Math.sin(t * 12 + i);
      ctx.fillStyle = i % 2 ? '#d9822b' : '#e8a93a';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2d36a';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawTrader(ctx: CanvasRenderingContext2D) {
    const T = this.world.trader;
    const p = this.player;
    const near = Math.hypot(p.x - T.x, p.y - T.y) < 320;
    const ang = near ? Math.atan2(p.y - T.y, p.x - T.x) : Math.PI / 2 + Math.sin(this.time * 0.5) * 0.25;
    ctx.save();
    ctx.translate(T.x, T.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(ang);
    drawPerson(ctx, {
      r: 15,
      cloth: '#5c4c38',
      clothDark: '#2f261c',
      skin: '#c09878',
      hat: 'ushanka',
      hatColor: '#4a4036',
      phase: 0,
      moving: false,
      arms: 'relaxed',
      beard: true,
    });
    ctx.restore();
    // индикатор над торговцем
    if (this.state === 'playing') {
      const bob = Math.sin(this.time * 3) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(T.x, T.y - 62 + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8c778';
      ctx.font = 'bold 14px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₽', T.x, T.y - 62 + bob + 1);
    }
  }

  drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (this.state === 'dead') {
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(70,12,10,0.7)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(p.angle);
    const recoil = p.flash > 0 ? -2 : 0;
    const id = this.weapon;
    drawPerson(ctx, {
      r: p.r,
      cloth: '#4b5340',
      clothDark: '#2b2f26',
      skin: '#c8a37e',
      hat: 'cap',
      hatColor: '#2c3228',
      phase: p.phase,
      moving: p.moving,
      arms: 'weapon',
      vest: p.armor > 0,
      drawWeapon: () => {
        const wd = WEAPONS[id];
        if (wd.melee) {
          const k = this.swingT > 0 ? 1 - this.swingT / this.swingDur : -1;
          if (k >= 0) {
            if (wd.arc > 0.8) ctx.rotate(this.swingDir * (k - 0.5) * wd.arc * 1.15);
            else ctx.translate(Math.sin(k * Math.PI) * wd.range * 0.5, 0);
          } else ctx.rotate(this.swingDir * -0.3);
        } else ctx.translate(recoil, 0);
        drawWeapon(ctx, id, this.time);
      },
    });
    if (WEAPONS[id].melee && this.swingT > 0) {
      const wd = WEAPONS[id];
      const k = 1 - this.swingT / this.swingDur;
      ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - k)})`;
      ctx.lineWidth = wd.id === 'hammer' ? 6 : 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (wd.arc > 0.8) {
        const a0 = this.swingDir * -0.5 * wd.arc * 1.15;
        const a1 = this.swingDir * (k - 0.5) * wd.arc * 1.15;
        ctx.arc(0, 0, wd.range * 0.88, Math.min(a0, a1), Math.max(a0, a1));
      } else {
        ctx.moveTo(18, 0);
        ctx.lineTo(wd.range * (0.4 + 0.7 * Math.sin(k * Math.PI)), 0);
      }
      ctx.stroke();
    }
    ctx.restore();
    if (p.burnT > 0) {
      ctx.fillStyle = `rgba(255,140,40,${0.3 + 0.2 * Math.sin(this.time * 25)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.slowT > 0) {
      ctx.strokeStyle = 'rgba(160,220,60,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.hurt > 0) {
      ctx.fillStyle = `rgba(160,20,16,${p.hurt})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const p = this.player;
    ctx.save();
    ctx.translate(e.x, e.y);
    let alpha = 1;
    if (e.type === 'stalker') {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      alpha = Math.max(0.1, Math.min(1, (260 - d) / 150));
      if (e.flash > 0 || e.burnT > 0) alpha = Math.max(alpha, 0.85);
      alpha = Math.max(alpha, 0.1 + 0.05 * Math.sin(this.time * 5 + e.id));
    }
    ctx.fillStyle = `rgba(0,0,0,${0.35 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(3, 4, e.r * 1.1, e.r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(e.angle);
    drawEnemySprite(ctx, e.type, {
      r: e.r,
      phase: e.phase,
      time: this.time + e.id,
      flash: e.flash,
      alpha,
      burning: e.burnT > 0,
      frozen: e.frozenT > 0,
      act: e.act,
      vis: e.vis,
    });
    if (e.rage > 0) {
      ctx.strokeStyle = 'rgba(255,90,60,0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 3 + Math.sin(this.time * 14) * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    if (e.hp < e.maxHp && e.type !== 'colossus' && alpha > 0.5) {
      const w = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w, 4);
      ctx.fillStyle = e.frozenT > 0 ? '#6ac8e8' : '#9a2f27';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 12, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  drawOverlay(ctx: CanvasRenderingContext2D) {
    this.drawOverlayInner(ctx);
    if (this.fadeDur > 0) {
      const k = Math.sin((this.fadeT / this.fadeDur) * Math.PI);
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, k * 1.25)})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }

  drawOverlayInner(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const p = this.player;
    if (this.inside) drawInteriorDark(this, ctx, this.inside);
    else if (this.phase === 'night' && this.loc === 'surface' && this.state !== 'menu') this.drawNight(ctx);
    // общий тон
    ctx.fillStyle = 'rgba(28,36,32,0.2)';
    ctx.fillRect(0, 0, W, H);
    // виньетка
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(4,6,5,${0.72 * settings.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (this.state === 'menu') return;

    // урон
    const low = p.hp < 30 && this.state === 'playing' ? 0.18 + 0.1 * Math.sin(this.time * 6) : 0;
    const hurt = Math.max(p.hurt * 0.7, low);
    if (hurt > 0 || this.state === 'dead') {
      const hg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      const a = this.state === 'dead' ? 0.55 : hurt;
      hg.addColorStop(0, 'rgba(120,0,0,0)');
      hg.addColorStop(1, `rgba(120,10,8,${a})`);
      ctx.fillStyle = hg;
      ctx.fillRect(0, 0, W, H);
    }

    // миникарта
    if (settings.minimap && this.loc === 'surface' && !this.inside) this.drawMinimap(ctx);
    this.drawRest(ctx);
  }

  drawMinimap(ctx: CanvasRenderingContext2D) {
    const { W } = this;
    const p = this.player;
    const mw = 150;
    const mxp = W - mw - 16;
    const myp = 16;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mxp - 4, myp - 4, mw + 8, mw + 8);
    ctx.drawImage(this.world.minimap, mxp, myp);
    ctx.globalAlpha = 1;
    const sc = mw / WORLD;
    // лагерь
    ctx.strokeStyle = '#d8c778';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mxp + CENTER.x * sc, myp + CENTER.y * sc, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8c778';
    ctx.fillRect(mxp + CENTER.x * sc - 1.5, myp + CENTER.y * sc - 1.5, 3, 3);
    // граница города
    ctx.save();
    ctx.beginPath();
    ctx.rect(mxp, myp, mw, mw);
    ctx.clip();
    ctx.strokeStyle = 'rgba(224,176,32,0.85)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(mxp + CENTER.x * sc, myp + CENTER.y * sc, this.cityR * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // лагеря бандитов
    if (this.phase === 'night') {
      ctx.fillStyle = '#ff7a2a';
      for (const c of this.world.camps) ctx.fillRect(mxp + c.x * sc - 2, myp + c.y * sc - 2, 4, 4);
    }
    // враги
    ctx.fillStyle = '#c0392b';
    for (const e of this.enemies) {
      if (Math.hypot(e.x - p.x, e.y - p.y) > 750) continue;
      ctx.fillRect(mxp + e.x * sc - 1.5, myp + e.y * sc - 1.5, 3, 3);
    }
    // предметы
    ctx.fillStyle = '#9fbf6a';
    for (const k of this.pickups) {
      if (k.life !== Infinity) continue;
      ctx.fillRect(mxp + k.x * sc - 1, myp + k.y * sc - 1, 2, 2);
    }
    drawDropsMinimap(this, ctx, mxp, myp, sc);
    ctx.fillStyle = '#ffb347';
    for (const c of this.crates) if (!c.opened) ctx.fillRect(mxp + c.x * sc - 1.5, myp + c.y * sc - 1.5, 3, 3);
    ctx.fillStyle = '#6fd0e8';
    ctx.fillRect(mxp + HATCH.x * sc - 1.5, myp + HATCH.y * sc - 1.5, 3, 3);
    // игрок
    ctx.translate(mxp + p.x * sc, myp + p.y * sc);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#f0ece0';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(200,190,160,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mxp - 3.5, myp - 3.5, mw + 7, mw + 7);
  }

  drawRest(ctx: CanvasRenderingContext2D) {
    const { W, H } = this;
    const p = this.player;
    if (this.loc === 'surface' && !this.inside) drawDropPointers(this, ctx);

    // белая вспышка (ядерный взрыв)
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,252,235,${Math.min(1, this.flashT * 1.1)})`;
      ctx.fillRect(0, 0, W, H);
    }
    // огонь по краям экрана, когда горите
    if (p.burnT > 0 && this.state === 'playing') {
      const bg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      bg.addColorStop(0, 'rgba(255,120,20,0)');
      bg.addColorStop(1, `rgba(255,110,20,${0.3 + 0.1 * Math.sin(this.time * 20)})`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }

    if (settings.fps) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(10, H - 30, 74, 20);
      ctx.fillStyle = '#9fe070';
      ctx.font = 'bold 12px ui-monospace, Menlo, Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`FPS ${Math.round(this.fpsAcc)}`, 16, H - 20);
    }

    // прицел
    if (this.state === 'playing' && !this.shopOpen && !this.craftOpen && !this.paused && !(this.loc === 'basement' && !this.buildSel)) {
      const w = WEAPONS[this.weapon];
      const gap = 5 + w.spread * 120 * (p.moving ? 1.35 : 1);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      this.crosshair(ctx, gap);
      const cc = CROSSHAIR_COLORS[settings.crosshairColor];
      ctx.strokeStyle = `rgba(${cc},0.92)`;
      ctx.lineWidth = 1.4;
      this.crosshair(ctx, gap);
      if (this.reloading) {
        const w2 = WEAPONS[this.weapon];
        ctx.strokeStyle = `rgba(${cc},0.92)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.mouse.x, this.mouse.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, this.reloadT / w2.reload));
        ctx.stroke();
      }
    }
  }

  crosshair(ctx: CanvasRenderingContext2D, gap: number) {
    const x = this.mouse.x;
    const y = this.mouse.y;
    ctx.beginPath();
    if (settings.crosshair === 'dot') {
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.moveTo(x + gap + 4, y);
      ctx.arc(x, y, gap + 4, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (settings.crosshair === 'circle') {
      ctx.arc(x, y, gap + 6, 0, Math.PI * 2);
      ctx.moveTo(x + 1.5, y);
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.moveTo(x - gap - 7, y);
    ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + 7, y);
    ctx.moveTo(x, y - gap - 7);
    ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + gap + 7);
    ctx.stroke();
  }
}
