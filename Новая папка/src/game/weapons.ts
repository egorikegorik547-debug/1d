export type AmmoType = '9mm' | '9x39' | '12ga' | '545' | '762' | '45' | 'energy' | 'rocket' | 'fuel' | 'nuke';

export type WeaponMode = 'melee' | 'bullet' | 'flame' | 'rocket' | 'rail' | 'tesla' | 'cryo' | 'plasma' | 'blackhole' | 'swarm' | 'nuke';

export type WeaponId =
  // обычное оружие
  | 'pistol'
  | 'aps'
  | 'revolver'
  | 'smg'
  | 'silsmg'
  | 'sawedoff'
  | 'shotgun'
  | 'carbine'
  | 'rifle'
  | 'autoshotgun'
  | 'lmg'
  | 'sniper'
  | 'amr'
  | 'glock'
  | 'deagle'
  | 'uzi'
  | 'mp5'
  | 'p90'
  | 'doublebarrel'
  | 'spas'
  | 'mosin'
  | 'akm'
  | 'm4'
  | 'vss'
  | 'pkm'
  // самодельное оружие (продаёт торговец)
  | 'zippistol'
  | 'homerevolver'
  | 'homesmg'
  | 'pipeshotgun'
  | 'homerifle'
  // холодное оружие (верстак)
  | 'knife'
  | 'cknife'
  | 'machete'
  | 'bayonet'
  | 'spear'
  | 'axe'
  | 'hammer'
  // особое оружие из аирдропа
  | 'railgun'
  | 'plasma'
  | 'tesla'
  | 'flamer'
  | 'rpg'
  | 'cryo'
  | 'minigun'
  | 'blackhole'
  | 'swarm'
  | 'nuke';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  short: string;
  desc: string;
  ammo: AmmoType;
  damage: number;
  pellets: number;
  spread: number;
  cooldown: number;
  auto: boolean;
  mag: number;
  reload: number;
  speed: number;
  range: number;
  price: number;
  pierce: number;
  shake: number;
  muzzle: number;
  mode: WeaponMode;
  special: boolean;
  silent: boolean;
  splash: number;
  dropAmmo: number;
  color: string;
  perk: string;
  /** самодельное — продаёт торговец */
  homemade: boolean;
  /** дуга удара (рад.) для холодного оружия */
  arc: number;
  /** отбрасывание при ударе */
  knock: number;
  /** ключ рисунка/класс холодного оружия */
  melee: boolean;
}

type Base = Pick<WeaponDef, 'id' | 'name' | 'short' | 'desc' | 'ammo' | 'damage' | 'cooldown' | 'mag' | 'reload' | 'speed' | 'range' | 'price'> & Partial<WeaponDef>;

const mk = (b: Base): WeaponDef => ({
  pellets: 1,
  spread: 0.05,
  auto: false,
  pierce: 0,
  shake: 2,
  muzzle: 30,
  mode: 'bullet',
  special: false,
  silent: false,
  splash: 0,
  dropAmmo: 0,
  color: '#ffecb4',
  perk: '',
  homemade: false,
  arc: 0,
  knock: 0,
  melee: b.mode === 'melee',
  ...b,
});

const LIST: WeaponDef[] = [
  /* ------------------------------ обычное ------------------------------ */
  mk({
    id: 'pistol', name: 'Пистолет ПМ', short: 'ПМ', desc: 'Надёжный старый пистолет. Всегда при вас.',
    ammo: '9mm', damage: 26, spread: 0.045, cooldown: 0.3, mag: 12, reload: 1.2, speed: 950, range: 620, price: 0, shake: 1.5, muzzle: 26,
  }),
  mk({
    id: 'aps', name: 'Пистолет АПС «Стечкин»', short: 'АПС', desc: 'Автоматический пистолет. Дёшево и очень сердито.',
    ammo: '9mm', damage: 15, spread: 0.1, cooldown: 0.09, auto: true, mag: 20, reload: 1.5, speed: 950, range: 480, price: 280, shake: 1.4, muzzle: 28,
  }),
  mk({
    id: 'revolver', name: 'Револьвер «Питон»', short: 'Питон', desc: 'Тяжёлый магнум. Каждая пуля пробивает врага насквозь.',
    ammo: '45', damage: 74, spread: 0.03, cooldown: 0.5, mag: 6, reload: 2.3, speed: 1050, range: 660, price: 380, pierce: 1, shake: 3.8, muzzle: 30,
  }),
  mk({
    id: 'smg', name: 'Пистолет-пулемёт', short: 'ПП', desc: 'Высокая скорострельность, слабая точность на дальней дистанции.',
    ammo: '9mm', damage: 17, spread: 0.11, cooldown: 0.085, auto: true, mag: 30, reload: 1.7, speed: 980, range: 520, price: 450, shake: 1.6, muzzle: 32,
  }),
  mk({
    id: 'silsmg', name: 'Бесшумный ПП «Тень»', short: 'Тень', desc: 'Почти без звука и вспышки. Точный и стабильный.',
    ammo: '9mm', damage: 21, spread: 0.055, cooldown: 0.09, auto: true, mag: 30, reload: 1.8, speed: 1000, range: 560, price: 750, silent: true, shake: 0.6, muzzle: 34, color: '#cfe0ff',
  }),
  mk({
    id: 'shotgun', name: 'Дробовик', short: 'Дробовик', desc: 'Сметает всё на ближней дистанции. Заряд — 8 картечин.',
    ammo: '12ga', damage: 15, pellets: 8, spread: 0.2, cooldown: 0.85, mag: 6, reload: 2.1, speed: 880, range: 360, price: 650, shake: 5, muzzle: 44,
  }),
  mk({
    id: 'carbine', name: 'Карабин СКС', short: 'СКС', desc: 'Полуавтоматический карабин. Точный и мощный.',
    ammo: '762', damage: 58, spread: 0.035, cooldown: 0.24, mag: 10, reload: 2.2, speed: 1500, range: 950, price: 850, pierce: 1, shake: 3.5, muzzle: 42,
  }),
  mk({
    id: 'rifle', name: 'Автомат АК-74', short: 'АК-74', desc: 'Универсальное боевое оружие: мощно и скорострельно.',
    ammo: '545', damage: 31, spread: 0.06, cooldown: 0.105, auto: true, mag: 30, reload: 2.0, speed: 1150, range: 760, price: 950, pierce: 1, shake: 2.4, muzzle: 50,
  }),
  mk({
    id: 'autoshotgun', name: 'Боевой дробовик «Молот»', short: 'Молот', desc: 'Автоматический дробовик на 10 патронов. Огненный шторм.',
    ammo: '12ga', damage: 13, pellets: 7, spread: 0.22, cooldown: 0.3, auto: true, mag: 10, reload: 2.8, speed: 900, range: 340, price: 1400, shake: 4, muzzle: 46,
  }),
  mk({
    id: 'lmg', name: 'Пулемёт РПК', short: 'РПК', desc: 'Ленточный ручной пулемёт. 75 патронов в магазине.',
    ammo: '545', damage: 29, spread: 0.085, cooldown: 0.085, auto: true, mag: 75, reload: 3.8, speed: 1150, range: 740, price: 1900, pierce: 1, shake: 2.6, muzzle: 54,
  }),
  mk({
    id: 'sniper', name: 'Снайперская винтовка', short: 'СВД', desc: 'Один выстрел — одна цель. Пробивает нескольких врагов.',
    ammo: '762', damage: 135, spread: 0.006, cooldown: 1.05, mag: 5, reload: 2.6, speed: 2000, range: 1500, price: 1500, pierce: 3, shake: 6, muzzle: 58,
  }),
  mk({
    id: 'amr', name: 'Крупнокалибер «Носорог»', short: 'Носорог', desc: 'Противотанковая винтовка. Прошивает целые толпы и броню.',
    ammo: '762', damage: 290, spread: 0.004, cooldown: 1.6, mag: 5, reload: 3.2, speed: 2400, range: 1700, price: 2800, pierce: 6, shake: 10, muzzle: 64,
  }),

  mk({
    id: 'glock', name: 'Пистолет «Глок-17»', short: 'Глок', desc: 'Лёгкий полуавтоматический пистолет с большим магазином.',
    ammo: '9mm', damage: 22, spread: 0.04, cooldown: 0.17, mag: 17, reload: 1.3, speed: 980, range: 560, price: 180, shake: 1.3, muzzle: 26,
  }),
  mk({
    id: 'deagle', name: 'Пустынный орёл', short: 'Орёл', desc: 'Огромный самозарядный магнум. Бьёт насквозь и очень громко.',
    ammo: '45', damage: 92, spread: 0.035, cooldown: 0.4, mag: 7, reload: 2, speed: 1100, range: 700, price: 620, pierce: 1, shake: 4.2, muzzle: 32,
  }),
  mk({
    id: 'uzi', name: 'Узи', short: 'Узи', desc: 'Компактный и дешёвый пистолет-пулемёт. Пули летят веером.',
    ammo: '9mm', damage: 16, spread: 0.13, cooldown: 0.07, auto: true, mag: 32, reload: 1.6, speed: 960, range: 440, price: 380, shake: 1.5, muzzle: 30,
  }),
  mk({
    id: 'mp5', name: 'ПП MP5', short: 'MP5', desc: 'Точный и надёжный пистолет-пулемёт с лёгкой отдачей.',
    ammo: '9mm', damage: 20, spread: 0.06, cooldown: 0.08, auto: true, mag: 30, reload: 1.8, speed: 1020, range: 600, price: 680, shake: 1.5, muzzle: 38,
  }),
  mk({
    id: 'p90', name: 'ПП P90', short: 'P90', desc: 'Футуристичный ПП с магазином на 50 патронов над стволом.',
    ammo: '9mm', damage: 19, spread: 0.065, cooldown: 0.065, auto: true, mag: 50, reload: 2.3, speed: 1050, range: 620, price: 980, pierce: 1, shake: 1.5, muzzle: 36,
  }),
  mk({
    id: 'doublebarrel', name: 'Двустволка ИЖ-43', short: 'ИЖ-43', desc: 'Классическая охотничья двустволка. Два выстрела — и всё.',
    ammo: '12ga', damage: 18, pellets: 9, spread: 0.2, cooldown: 0.35, mag: 2, reload: 1.8, speed: 900, range: 340, price: 420, shake: 6, muzzle: 46,
  }),
  mk({
    id: 'spas', name: 'Дробовик SPAS-12', short: 'SPAS', desc: 'Полуавтоматический боевой дробовик. 8 патронов, быстрый темп.',
    ammo: '12ga', damage: 14, pellets: 8, spread: 0.18, cooldown: 0.42, mag: 8, reload: 2.5, speed: 900, range: 380, price: 1050, shake: 4.5, muzzle: 46,
  }),
  mk({
    id: 'mosin', name: 'Винтовка Мосина', short: 'Мосин', desc: 'Легендарная трёхлинейка. Дёшево, мощно, неторопливо.',
    ammo: '762', damage: 110, spread: 0.01, cooldown: 1.0, mag: 5, reload: 2.8, speed: 1800, range: 1250, price: 700, pierce: 2, shake: 5, muzzle: 56,
  }),
  mk({
    id: 'akm', name: 'Автомат АКМ', short: 'АКМ', desc: 'Тяжёлый патрон 7.62 — меньше скорострельности, больше урона.',
    ammo: '762', damage: 44, spread: 0.07, cooldown: 0.115, auto: true, mag: 30, reload: 2.2, speed: 1150, range: 780, price: 1250, pierce: 1, shake: 3, muzzle: 50,
  }),
  mk({
    id: 'm4', name: 'Штурмовая винтовка M4A1', short: 'M4A1', desc: 'Модульная винтовка с коллиматором. Низкий разброс и отдача.',
    ammo: '545', damage: 28, spread: 0.04, cooldown: 0.085, auto: true, mag: 30, reload: 1.9, speed: 1250, range: 820, price: 1550, pierce: 1, shake: 1.8, muzzle: 50,
  }),
  mk({
    id: 'vss', name: 'Винторез ВСС', short: 'ВСС', desc: 'Бесшумная снайперская винтовка под дозвуковой патрон 9×39. Идеальна для зачистки.',
    ammo: '9x39', damage: 66, spread: 0.012, cooldown: 0.16, auto: true, mag: 20, reload: 2.4, speed: 1350, range: 980, price: 2100, pierce: 2, silent: true, shake: 0.9, muzzle: 50, color: '#cfe0ff',
  }),
  mk({
    id: 'pkm', name: 'Пулемёт ПКМ', short: 'ПКМ', desc: 'Ленточный пулемёт под мощный патрон. 100 в коробе.',
    ammo: '762', damage: 46, spread: 0.08, cooldown: 0.09, auto: true, mag: 100, reload: 4.4, speed: 1200, range: 820, price: 3200, pierce: 2, shake: 3.4, muzzle: 56,
  }),

  /* ------------------------- самодельное (торговец) ------------------------- */
  mk({
    id: 'zippistol', name: 'Самопал «Кустарь»', short: 'Кустарь', homemade: true, desc: 'Двуствольный самопал из трубок и скотча. Стреляет дважды, потом долго заряжается.',
    ammo: '9mm', damage: 28, spread: 0.09, cooldown: 0.4, mag: 2, reload: 1.9, speed: 900, range: 420, price: 140, shake: 2.4, muzzle: 22,
  }),
  mk({
    id: 'homerevolver', name: 'Самодельный револьвер «Слесарь»', short: 'Слесарь', homemade: true, desc: 'Барабан выточен из обрезка трубы. Тяжёлая пуля, пятизарядный барабан.',
    ammo: '45', damage: 64, spread: 0.05, cooldown: 0.5, mag: 5, reload: 2.5, speed: 980, range: 560, price: 310, shake: 3.4, muzzle: 28,
  }),
  mk({
    id: 'pipeshotgun', name: 'Труба-дробовик', short: 'Труба', homemade: true, desc: 'Один ствол из водопроводной трубы и боёк на резинке. Грубо, зато убойно вблизи.',
    ammo: '12ga', damage: 13, pellets: 6, spread: 0.28, cooldown: 0.7, mag: 1, reload: 1.5, speed: 840, range: 270, price: 230, shake: 5.2, muzzle: 30,
  }),
  mk({
    id: 'homesmg', name: 'Самодельный ПП «Партизан»', short: 'Партизан', homemade: true, auto: true, desc: 'Кустарный пистолет-пулемёт с открытым затвором. Бьёт веером, но поливает густо.',
    ammo: '9mm', damage: 14, spread: 0.15, cooldown: 0.105, mag: 25, reload: 2.3, speed: 920, range: 420, price: 360, shake: 1.8, muzzle: 28,
  }),
  mk({
    id: 'homerifle', name: 'Самопальная винтовка «Кустарка»', short: 'Кустарка', homemade: true, desc: 'Магазин на три патрона, затвор от старого запора. Бьёт далеко и сильно.',
    ammo: '762', damage: 82, spread: 0.02, cooldown: 0.85, mag: 3, reload: 2.5, speed: 1500, range: 1000, price: 560, pierce: 1, shake: 4.4, muzzle: 40,
  }),
  mk({
    id: 'sawedoff', name: 'Обрез', short: 'Обрез', homemade: true, desc: 'Два ствола, десять картечин. Убойно вблизи, медленно заряжается.',
    ammo: '12ga', damage: 14, pellets: 10, spread: 0.3, cooldown: 0.45, mag: 2, reload: 1.9, speed: 860, range: 280, price: 420, shake: 6.5, muzzle: 30,
  }),

  /* ----------------------- холодное оружие (верстак) ----------------------- */
  mk({
    id: 'knife', name: 'Кухонный нож', short: 'Нож', mode: 'melee', desc: 'Короткий и быстрый. Лучше, чем ничего.',
    ammo: '9mm', damage: 24, cooldown: 0.32, mag: 1, reload: 0, speed: 0, range: 50, price: 0, arc: 1.0, knock: 70, pierce: 0, color: '#d6dade',
  }),
  mk({
    id: 'cknife', name: 'Боевой нож', short: 'Б. нож', mode: 'melee', desc: 'Заточенный армейский клинок. Быстрый и точный.',
    ammo: '9mm', damage: 36, cooldown: 0.26, mag: 1, reload: 0, speed: 0, range: 55, price: 0, arc: 1.0, knock: 80, pierce: 0, color: '#c4cad0',
  }),
  mk({
    id: 'machete', name: 'Тесак', short: 'Тесак', mode: 'melee', desc: 'Широкий тяжёлый клинок. Рубит сразу нескольких врагов перед вами.',
    ammo: '9mm', damage: 52, cooldown: 0.42, mag: 1, reload: 0, speed: 0, range: 68, price: 0, arc: 1.8, knock: 120, pierce: 2, color: '#b9c0c6',
    perk: 'Широкий замах — до 3 целей',
  }),
  mk({
    id: 'bayonet', name: 'Штык-нож', short: 'Штык', mode: 'melee', desc: 'Колющий удар вперёд. Пробивает броню лучше любого лезвия.',
    ammo: '9mm', damage: 44, cooldown: 0.34, mag: 1, reload: 0, speed: 0, range: 74, price: 0, arc: 0.45, knock: 90, pierce: 1, color: '#cfd5da',
    perk: 'Колющий удар — до 2 целей в линию',
  }),
  mk({
    id: 'spear', name: 'Копьё', short: 'Копьё', mode: 'melee', desc: 'Длинное древко с заточенным наконечником. Бейте с безопасной дистанции.',
    ammo: '9mm', damage: 62, cooldown: 0.62, mag: 1, reload: 0, speed: 0, range: 118, price: 0, arc: 0.4, knock: 150, pierce: 3, color: '#c8b080',
    perk: 'Большая дальность, пробивает до 4 врагов',
  }),
  mk({
    id: 'axe', name: 'Топор', short: 'Топор', mode: 'melee', desc: 'Тяжёлый удар сверху. Рубит врагов и доски.',
    ammo: '9mm', damage: 88, cooldown: 0.72, mag: 1, reload: 0, speed: 0, range: 70, price: 0, arc: 1.5, knock: 170, pierce: 1, color: '#b8a080',
    perk: 'Мощный рубящий удар',
  }),
  mk({
    id: 'hammer', name: 'Молот-кувалда', short: 'Кувалда', mode: 'melee', desc: 'Медленно, но сокрушительно. Отбрасывает даже громил.',
    ammo: '9mm', damage: 135, cooldown: 1.0, mag: 1, reload: 0, speed: 0, range: 76, price: 0, arc: 1.9, knock: 380, pierce: 3, color: '#9aa0a6', shake: 6,
    perk: 'Сокрушительный удар по площади, сильно отбрасывает',
  }),

  /* ------------------------------ особое ------------------------------- */
  mk({
    id: 'railgun', name: 'Рельсотрон «Гром»', short: 'Гром', special: true, mode: 'rail',
    desc: 'Заряд превращается в луч, который прошивает всё на пути.',
    perk: 'Луч пробивает ВСЕХ врагов и игнорирует броню',
    ammo: 'energy', damage: 420, cooldown: 1.3, mag: 4, reload: 2.6, speed: 0, range: 1800, price: 0, pierce: 99, shake: 9, muzzle: 50, dropAmmo: 12, color: '#7ff6ff', spread: 0,
  }),
  mk({
    id: 'plasma', name: 'Плазмаган «Нова»', short: 'Нова', special: true, mode: 'plasma', auto: true,
    desc: 'Сгустки плазмы взрываются при попадании.',
    perk: 'Скорострельные плазменные снаряды с взрывом',
    ammo: 'energy', damage: 42, cooldown: 0.12, mag: 40, reload: 2.2, speed: 820, range: 720, price: 0, shake: 2.2, muzzle: 40, splash: 62, dropAmmo: 80, color: '#c06bff', spread: 0.05,
  }),
  mk({
    id: 'tesla', name: 'Тесла-пушка «Шторм»', short: 'Шторм', special: true, mode: 'tesla', auto: true,
    desc: 'Молния перескакивает с одного врага на другого.',
    perk: 'Цепная молния — бьёт до 6 целей подряд',
    ammo: 'energy', damage: 36, cooldown: 0.13, mag: 60, reload: 2.5, speed: 0, range: 400, price: 0, shake: 1.2, muzzle: 40, dropAmmo: 120, color: '#8fd0ff', spread: 0,
  }),
  mk({
    id: 'flamer', name: 'Огнемёт «Дракон»', short: 'Дракон', special: true, mode: 'flame', auto: true,
    desc: 'Струя огня поджигает всё живое.',
    perk: 'Поджигает врагов, огонь пробивает толпу',
    ammo: 'fuel', damage: 9, cooldown: 0.05, mag: 150, reload: 2.8, speed: 400, range: 240, price: 0, shake: 0.8, muzzle: 38, spread: 0.12, pierce: 99, dropAmmo: 150, color: '#ff9a3a',
  }),
  mk({
    id: 'rpg', name: 'Гранатомёт «Кабан»', short: 'Кабан', special: true, mode: 'rocket',
    desc: 'Реактивный снаряд с огромной площадью поражения.',
    perk: 'Мощный взрыв. Осторожно — осколки могут задеть вас',
    ammo: 'rocket', damage: 240, cooldown: 0.9, mag: 1, reload: 2.2, speed: 650, range: 1100, price: 0, shake: 8, muzzle: 46, splash: 135, dropAmmo: 6, color: '#ffb060', spread: 0.01,
  }),
  mk({
    id: 'cryo', name: 'Криопушка «Мороз»', short: 'Мороз', special: true, mode: 'cryo', auto: true,
    desc: 'Ледяные заряды замедляют, а затем замораживают врагов.',
    perk: 'Замедляет и замораживает цели полностью',
    ammo: 'energy', damage: 15, cooldown: 0.07, mag: 70, reload: 2.4, speed: 780, range: 540, price: 0, shake: 1, muzzle: 40, pierce: 1, spread: 0.07, dropAmmo: 100, color: '#9fe8ff',
  }),
  mk({
    id: 'minigun', name: 'Миниган «Ураган»', short: 'Ураган', special: true, auto: true,
    desc: 'Шестиствольный шквал свинца. 200 патронов.',
    perk: 'Невероятная скорострельность — 25 выстрелов в секунду',
    ammo: '545', damage: 23, spread: 0.1, cooldown: 0.04, mag: 200, reload: 4.2, speed: 1250, range: 720, price: 0, pierce: 1, shake: 2, muzzle: 56, dropAmmo: 200, color: '#ffd89a',
  }),
  mk({
    id: 'blackhole', name: 'Сингулярность «Бездна»', short: 'Бездна', special: true, mode: 'blackhole',
    desc: 'Выстреливает чёрную дыру, которая затягивает врагов.',
    perk: 'Втягивает всех рядом, перемалывает и взрывается',
    ammo: 'energy', damage: 6, cooldown: 1.4, mag: 3, reload: 3.2, speed: 460, range: 650, price: 0, shake: 6, muzzle: 44, dropAmmo: 6, color: '#a050ff', spread: 0,
  }),
  mk({
    id: 'swarm', name: 'Ракетный рой «Шершень»', short: 'Шершень', special: true, mode: 'swarm',
    desc: 'Залп самонаводящихся мини-ракет.',
    perk: '6 самонаводящихся ракет за выстрел',
    ammo: 'rocket', damage: 62, pellets: 6, cooldown: 1.1, mag: 2, reload: 3, speed: 540, range: 950, price: 0, shake: 5, muzzle: 40, splash: 52, dropAmmo: 8, color: '#ffa550', spread: 0.4,
  }),
  mk({
    id: 'nuke', name: 'Мини-ядерка «Судный день»', short: 'Судный', special: true, mode: 'nuke',
    desc: 'Тактический заряд. Стирает с карты всё в огромном радиусе.',
    perk: 'Ядерный взрыв. Не стреляйте себе под ноги!',
    ammo: 'nuke', damage: 1400, cooldown: 2, mag: 1, reload: 3.5, speed: 400, range: 1100, price: 0, shake: 14, muzzle: 50, splash: 360, dropAmmo: 2, color: '#fff2c0', spread: 0,
  }),
];

export const WEAPONS = Object.fromEntries(LIST.map((w) => [w.id, w])) as Record<WeaponId, WeaponDef>;

export const WEAPON_ORDER: WeaponId[] = LIST.filter((w) => !w.special && !w.melee)
  .sort((a, b) => a.price - b.price)
  .map((w) => w.id);
export const MELEE_ORDER: WeaponId[] = LIST.filter((w) => w.melee).map((w) => w.id);
/** Торговец продаёт только самодельное оружие */
export const SHOP_ORDER: WeaponId[] = LIST.filter((w) => w.homemade).sort((a, b) => a.price - b.price).map((w) => w.id);
export const SPECIAL_ORDER: WeaponId[] = LIST.filter((w) => w.special).map((w) => w.id);
export const ALL_ORDER: WeaponId[] = [...WEAPON_ORDER, ...MELEE_ORDER, ...SPECIAL_ORDER];

export interface AmmoDef {
  id: AmmoType;
  name: string;
  pack: number;
  price: number;
  cap: number;
}

export const AMMO: Record<AmmoType, AmmoDef> = {
  '9mm': { id: '9mm', name: 'Патроны 9×18 мм', pack: 30, price: 35, cap: 240 },
  '12ga': { id: '12ga', name: 'Картечь 12 калибра', pack: 12, price: 50, cap: 60 },
  '545': { id: '545', name: 'Патроны 5.45×39 мм', pack: 30, price: 60, cap: 300 },
  '762': { id: '762', name: 'Патроны 7.62×54 мм', pack: 10, price: 70, cap: 60 },
  '9x39': { id: '9x39', name: 'Патроны 9×39 мм', pack: 20, price: 85, cap: 120 },
  '45': { id: '45', name: 'Патроны .45 Magnum', pack: 12, price: 55, cap: 96 },
  energy: { id: 'energy', name: 'Энергоячейки', pack: 20, price: 120, cap: 200 },
  rocket: { id: 'rocket', name: 'Реактивные снаряды', pack: 2, price: 220, cap: 12 },
  fuel: { id: 'fuel', name: 'Топливо для огнемёта', pack: 50, price: 90, cap: 300 },
  nuke: { id: 'nuke', name: 'Ядерный заряд', pack: 1, price: 0, cap: 3 },
};

export const AMMO_ORDER: AmmoType[] = ['9mm', '9x39', '45', '12ga', '545', '762', 'energy', 'rocket', 'fuel', 'nuke'];

export const emptyReserve = (): Record<AmmoType, number> => ({ '9mm': 0, '9x39': 0, '12ga': 0, '545': 0, '762': 0, '45': 0, energy: 0, rocket: 0, fuel: 0, nuke: 0 });

export const ARMOR_PRICE = 280;
export const ARMOR_MAX = 100;
export const MEDKIT_PRICE = 90;
export const MEDKIT_HEAL = 50;

export const FLAREGUN_PRICE = 1800;
export const FLARE_PRICE = 1500;
export const FLARE_CAP = 3;

/** Длина вспышки дула для оружия */
export function flashLen(w: WeaponDef): number {
  if (w.silent) return 6;
  if (w.pellets > 1 && w.mode === 'bullet') return 22;
  if (w.damage > 100 && w.mode === 'bullet') return 28;
  return 15;
}
