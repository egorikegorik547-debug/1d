import type { Ctx } from './art';
import { drawPerson } from './draw';
import { drawWeapon } from './weaponArt';
import type { Enemy, Game } from './engine';
import { mkBullet } from './combat';
import { sfx } from './audio';

export type EnemyType =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'marauder'
  | 'bandit'
  | 'rat'
  | 'crawler'
  | 'spitter'
  | 'bloater'
  | 'armored'
  | 'screamer'
  | 'toxic'
  | 'stalker'
  | 'leaper'
  | 'mother'
  | 'burner'
  | 'colossus';

export interface EnemyDef {
  name: string;
  desc: string;
  ability: string;
  r: number;
  hp: number;
  speed: number;
  dmg: number;
  reward: [number, number];
  cloth: string;
  clothDark: string;
  skin: string;
  hat: 'cap' | 'hood' | 'ushanka' | 'none' | 'hair';
  hatColor: string;
  minWave: number;
  weight: number;
  pack?: number;
  kbMul: number;
  armored?: boolean;
  boss?: boolean;
  /** живой человек — не приходит с волнами */
  human?: boolean;
}

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  walker: {
    name: 'Ходок', desc: 'Обычный заражённый. Медленный, но их всегда много.', ability: 'Нет',
    r: 14, hp: 70, speed: 62, dmg: 10, reward: [8, 18], cloth: '#4a4a3c', clothDark: '#2d2c25', skin: '#8c9478', hat: 'hair', hatColor: '#2b2620',
    minWave: 1, weight: 10, kbMul: 1,
  },
  runner: {
    name: 'Бегун', desc: 'Лёгкий и быстрый. Налетает, пока вы перезаряжаетесь.', ability: 'Высокая скорость',
    r: 12, hp: 42, speed: 128, dmg: 8, reward: [12, 24], cloth: '#3b4650', clothDark: '#242a30', skin: '#9aa292', hat: 'none', hatColor: '#000',
    minWave: 1, weight: 3, kbMul: 1,
  },
  crawler: {
    name: 'Ползун', desc: 'Искалеченный зомби, ползёт по земле. Появляется стаями.', ability: 'Стая из 3 штук',
    r: 10, hp: 32, speed: 118, dmg: 6, reward: [4, 9], cloth: '#4c4538', clothDark: '#2b271e', skin: '#8a9272', hat: 'hair', hatColor: '#201c18',
    minWave: 2, weight: 3, pack: 3, kbMul: 1.3,
  },
  marauder: {
    name: 'Мародёр', desc: 'Живой человек с пистолетом. Держит дистанцию и стреляет.', ability: 'Стреляет из пистолета',
    r: 14, hp: 95, speed: 88, dmg: 9, reward: [28, 48], cloth: '#4e4538', clothDark: '#2c2820', skin: '#b0906f', hat: 'hood', hatColor: '#3a3329',
    minWave: 2, weight: 3, kbMul: 1, human: true,
  },
  bandit: {
    name: 'Бандит', desc: 'Живёт в разрушенных домах у костра. Стреляет метко, засаду устраивает в подвалах.', ability: 'Стреляет, держит дистанцию',
    r: 14, hp: 130, speed: 92, dmg: 12, reward: [45, 80], cloth: '#4a3a34', clothDark: '#2a201c', skin: '#b4906e', hat: 'cap', hatColor: '#6a2a22',
    minWave: 99, weight: 0, kbMul: 0.9, human: true,
  },
  rat: {
    name: 'Крыса', desc: 'Огромная подвальная крыса. Мелкая, юркая и кусачая.', ability: 'Быстрая, нападает стаей',
    r: 8, hp: 20, speed: 150, dmg: 5, reward: [2, 6], cloth: '#5a524a', clothDark: '#3a342e', skin: '#6a605a', hat: 'none', hatColor: '#000',
    minWave: 99, weight: 0, kbMul: 1.6,
  },
  brute: {
    name: 'Громила', desc: 'Огромная гора мяса. Очень живучий, бьёт наотмашь.', ability: 'Огромное здоровье',
    r: 22, hp: 340, speed: 50, dmg: 28, reward: [55, 95], cloth: '#5a3d32', clothDark: '#35241d', skin: '#7a8068', hat: 'none', hatColor: '#000',
    minWave: 3, weight: 2.5, kbMul: 0.33,
  },
  spitter: {
    name: 'Плевун', desc: 'Мутант с кислотным зобом. Харкает ядом с расстояния.', ability: 'Кислота замедляет вас',
    r: 13, hp: 75, speed: 74, dmg: 12, reward: [24, 40], cloth: '#46503a', clothDark: '#2a3023', skin: '#a2b86a', hat: 'none', hatColor: '#000',
    minWave: 3, weight: 2.5, kbMul: 1,
  },
  bloater: {
    name: 'Вздутый', desc: 'Раздутый газами. Взрывается при смерти или при контакте.', ability: 'Взрыв: урон вам и другим зомби',
    r: 20, hp: 170, speed: 46, dmg: 0, reward: [30, 50], cloth: '#6a7040', clothDark: '#3a3e22', skin: '#a8b070', hat: 'none', hatColor: '#000',
    minWave: 3, weight: 2.5, kbMul: 0.6,
  },
  armored: {
    name: 'Штурмовик', desc: 'Бывший солдат в бронежилете и шлеме. Слабые пули почти не берут.', ability: 'Броня: гасит слабые попадания',
    r: 16, hp: 230, speed: 72, dmg: 18, reward: [45, 70], cloth: '#4a5240', clothDark: '#262c22', skin: '#8a9072', hat: 'none', hatColor: '#000',
    minWave: 4, weight: 2.5, armored: true, kbMul: 0.5,
  },
  screamer: {
    name: 'Крикун', desc: 'Пронзительный вопль приводит зомби вокруг в ярость.', ability: 'Вопль: +45% скорости союзникам',
    r: 13, hp: 62, speed: 78, dmg: 8, reward: [28, 44], cloth: '#50404a', clothDark: '#2c2228', skin: '#b4a6a6', hat: 'hair', hatColor: '#d0c8c0',
    minWave: 4, weight: 2, kbMul: 1,
  },
  toxic: {
    name: 'Токсичный', desc: 'Сталкер в разорванном костюме химзащиты. Оставляет облако яда.', ability: 'Ядовитое облако после смерти',
    r: 15, hp: 115, speed: 58, dmg: 11, reward: [34, 52], cloth: '#7a7a2a', clothDark: '#4a4a16', skin: '#9cb060', hat: 'hood', hatColor: '#6a6a22',
    minWave: 5, weight: 2, kbMul: 0.8, human: true,
  },
  leaper: {
    name: 'Прыгун', desc: 'Присаживается и совершает мощный рывок прямо на вас.', ability: 'Прыжок с замахом',
    r: 13, hp: 85, speed: 84, dmg: 22, reward: [38, 58], cloth: '#5a3a3a', clothDark: '#341f1f', skin: '#a08a78', hat: 'none', hatColor: '#000',
    minWave: 5, weight: 2.5, kbMul: 1,
  },
  stalker: {
    name: 'Призрак', desc: 'Мутировавшая кожа искажает свет. Почти невидим издали.', ability: 'Невидимость, рывки вблизи',
    r: 13, hp: 95, speed: 100, dmg: 18, reward: [40, 62], cloth: '#2a3238', clothDark: '#161b1f', skin: '#7a8a96', hat: 'hood', hatColor: '#1c2328',
    minWave: 6, weight: 2, kbMul: 1,
  },
  burner: {
    name: 'Поджигатель', desc: 'Безумец с самодельным огнемётом. Сжигает всё на ближней дистанции.', ability: 'Струя огня, поджигает вас',
    r: 15, hp: 140, speed: 72, dmg: 8, reward: [50, 75], cloth: '#6a3a22', clothDark: '#3a2012', skin: '#b08a6a', hat: 'cap', hatColor: '#3a2a20',
    minWave: 7, weight: 2, kbMul: 0.7, human: true,
  },
  mother: {
    name: 'Матка', desc: 'Раздутая тварь, постоянно рожающая ползунов. Убейте её первой.', ability: 'Рожает ползунов',
    r: 25, hp: 420, speed: 40, dmg: 20, reward: [80, 120], cloth: '#6a4a52', clothDark: '#3c2a30', skin: '#b8908a', hat: 'none', hatColor: '#000',
    minWave: 8, weight: 1.5, kbMul: 0.25,
  },
  colossus: {
    name: 'КОЛОСС', desc: 'Босс. Появляется каждые 5 волн. Таранит, топчет землю и зовёт подмогу.', ability: 'Таран, удар об землю, призыв',
    r: 40, hp: 3200, speed: 44, dmg: 48, reward: [700, 950], cloth: '#4a2a2a', clothDark: '#241212', skin: '#8a6a60', hat: 'none', hatColor: '#000',
    minWave: 99, weight: 0, boss: true, kbMul: 0.06,
  },
};

export const ENEMY_ORDER: EnemyType[] = [
  'walker', 'runner', 'crawler', 'rat', 'marauder', 'bandit', 'brute', 'spitter', 'bloater', 'armored', 'screamer', 'toxic', 'leaper', 'stalker', 'burner', 'mother', 'colossus',
];

/* ------------------------------------------------------------------ */
/* Отрисовка                                                           */
/* ------------------------------------------------------------------ */
export interface SpriteOpts {
  r: number;
  phase: number;
  time: number;
  flash?: number;
  alpha?: number;
  burning?: boolean;
  frozen?: boolean;
  act?: number;
  vis?: number;
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function glow(ctx: Ctx, x: number, y: number, r: number, c0: string) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c0);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Рисует зомби. ctx уже смещён в центр и повёрнут по направлению взгляда (+X) */
export function drawEnemySprite(ctx: Ctx, type: EnemyType, o: SpriteOpts) {
  const def = ENEMIES[type];
  const r = o.r;
  const t = o.time;
  const isM = type === 'marauder' || type === 'bandit';
  const act = o.act ?? 0;
  const vis = o.vis ?? 0;
  ctx.save();
  if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha = o.alpha;

  // подложка
  if (type === 'toxic') glow(ctx, 0, 0, r * 2.3, `rgba(150,220,60,${0.28 + 0.08 * Math.sin(t * 4)})`);
  if (type === 'colossus') glow(ctx, 0, 0, r * 2.2, `rgba(255,50,30,${act === 1 || act === 4 ? 0.5 : 0.18 + 0.06 * Math.sin(t * 3)})`);
  if (type === 'screamer' && vis > 0) glow(ctx, 0, 0, r * 2.4, 'rgba(255,255,255,0.35)');
  if (type === 'leaper' && act === 1) glow(ctx, 0, 0, r * 2.2, 'rgba(255,90,40,0.5)');

  if (type === 'crawler') ctx.scale(1, 0.85);
  if (type === 'rat') {
    const w = Math.sin(o.phase * 1.6) * 0.3;
    ctx.strokeStyle = '#a07878';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    ctx.quadraticCurveTo(-r * 1.6, r * w * 2, -r * 2.1, r * w * 3);
    ctx.stroke();
    ctx.fillStyle = def.clothDark;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(r * 0.3 + w * s * r * 0.6, s * r * 0.7, r * 0.3, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = def.cloth;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.skin;
    ctx.beginPath();
    ctx.ellipse(r * 0.95, 0, r * 0.52, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c09090';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(r * 0.78, s * r * 0.42, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff3a2a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(r * 1.25, s * r * 0.17, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d0b0a8';
    ctx.beginPath();
    ctx.arc(r * 1.48, 0, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    if (o.flash && o.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.1, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  drawPerson(ctx, {
    r,
    cloth: def.cloth,
    clothDark: def.clothDark,
    skin: def.skin,
    hat: def.hat,
    hatColor: def.hatColor,
    phase: o.phase,
    moving: true,
    arms: isM ? 'weapon' : 'out',
    armPhase: o.phase * 0.6,
    wounds: !isM && type !== 'bloater',
    mask: isM,
    drawWeapon: isM ? () => drawWeapon(ctx, type === 'bandit' ? 'sawedoff' : 'pistol') : undefined,
  });

  // дополнительные детали
  switch (type) {
    case 'spitter': {
      const swell = vis > 0 ? 1.5 : 1 + Math.sin(t * 5) * 0.12;
      circle(ctx, r * 0.78, 0, r * 0.3 * swell, '#b6e04a', '#4a6a14');
      circle(ctx, r * 0.72, -r * 0.08, r * 0.1, 'rgba(255,255,220,0.7)');
      if (vis > 0) glow(ctx, r * 1.2, 0, r * 1.2, 'rgba(160,230,60,0.6)');
      break;
    }
    case 'bloater': {
      const pulse = 1 + Math.sin(t * 5) * 0.07;
      circle(ctx, -r * 0.08, 0, r * 0.98 * pulse, '#99a64a', '#4a5420');
      ctx.fillStyle = 'rgba(70,90,20,0.55)';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.05 + 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(230,240,150,0.35)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      circle(ctx, r * 0.82, 0, r * 0.36, def.skin, 'rgba(0,0,0,0.5)');
      // тлеющий сигнал перед взрывом
      glow(ctx, 0, 0, r * 1.6, `rgba(200,230,60,${0.12 + 0.1 * Math.sin(t * 9)})`);
      break;
    }
    case 'armored': {
      circle(ctx, r * 0.12, 0, r * 0.62, '#656d62', '#1c211b');
      ctx.fillStyle = '#14181a';
      ctx.fillRect(r * 0.45, -r * 0.36, r * 0.22, r * 0.72);
      ctx.fillStyle = '#7a8378';
      ctx.fillRect(-r * 0.1, -r * 0.1, r * 0.4, r * 0.2);
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#5a6256';
        ctx.strokeStyle = '#1c211b';
        ctx.beginPath();
        ctx.roundRect(-r * 0.3, s * r * 0.78 - r * 0.2, r * 0.6, r * 0.4, 3);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'screamer': {
      ctx.fillStyle = vis > 0 ? '#2a0808' : '#1a0c0c';
      ctx.beginPath();
      ctx.ellipse(r * 0.55, 0, r * 0.15 + (vis > 0 ? r * 0.18 : 0), r * 0.26 + (vis > 0 ? r * 0.12 : 0), 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'toxic': {
      ctx.fillStyle = 'rgba(170,230,60,0.55)';
      for (let i = 0; i < 4; i++) {
        const a = t * 1.3 + i * 1.6;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.7, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      circle(ctx, r * 0.5, 0, r * 0.2, '#2a2e20');
      ctx.fillStyle = '#9fe040';
      ctx.fillRect(r * 0.42, -r * 0.4, 2, r * 0.8);
      break;
    }
    case 'stalker': {
      ctx.fillStyle = '#ff3020';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(r * 0.5, s * r * 0.2, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, r * 0.5, 0, r * 0.7, 'rgba(255,50,30,0.3)');
      break;
    }
    case 'leaper': {
      ctx.strokeStyle = '#d8c8b0';
      ctx.lineWidth = 1.6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(r * 1.45, s * r * 0.42);
        ctx.lineTo(r * 1.9, s * r * 0.55);
        ctx.moveTo(r * 1.45, s * r * 0.42);
        ctx.lineTo(r * 1.95, s * r * 0.3);
        ctx.stroke();
      }
      ctx.fillStyle = act === 1 ? '#ff7030' : '#ffd040';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(r * 0.5, s * r * 0.2, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'mother': {
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + 0.5;
        const pu = 1 + Math.sin(t * 4 + i * 1.7) * 0.12 + (vis > 0 ? 0.25 : 0);
        circle(ctx, Math.cos(a) * r * 0.55 - r * 0.15, Math.sin(a) * r * 0.62, r * 0.28 * pu, 'rgba(210,150,160,0.95)', 'rgba(80,30,40,0.7)');
        circle(ctx, Math.cos(a) * r * 0.55 - r * 0.2, Math.sin(a) * r * 0.62 - 2, r * 0.09, 'rgba(255,230,230,0.5)');
      }
      break;
    }
    case 'burner': {
      ctx.fillStyle = '#8a2a1a';
      ctx.strokeStyle = '#2a0c06';
      ctx.beginPath();
      ctx.roundRect(-r * 0.95, -r * 0.45, r * 0.7, r * 0.9, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c8b050';
      ctx.fillRect(-r * 0.7, -r * 0.15, r * 0.2, r * 0.3);
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, 0);
      ctx.lineTo(r * 1.3, 0);
      ctx.stroke();
      circle(ctx, r * 1.4, 0, r * 0.14, act === 2 ? '#ffb040' : '#e07020');
      if (act === 2) glow(ctx, r * 1.5, 0, r * 1.6, 'rgba(255,150,40,0.6)');
      break;
    }
    case 'colossus': {
      ctx.fillStyle = '#3a1c1c';
      ctx.strokeStyle = '#150808';
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.4, i * r * 0.26 - r * 0.1);
        ctx.lineTo(-r * 1.0, i * r * 0.3);
        ctx.lineTo(-r * 0.4, i * r * 0.26 + r * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#5a5048';
        ctx.strokeStyle = '#1a1410';
        ctx.beginPath();
        ctx.roundRect(-r * 0.2, s * r * 0.78 - r * 0.22, r * 0.55, r * 0.44, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#ff4020';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(r * 0.45, s * r * 0.2, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      glow(ctx, r * 0.45, 0, r * 0.9, 'rgba(255,60,30,0.45)');
      break;
    }
    default:
      break;
  }

  if (o.burning) {
    glow(ctx, 0, 0, r * 1.6, `rgba(255,140,40,${0.45 + 0.2 * Math.sin(t * 25)})`);
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + i * 2.1;
      circle(ctx, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.2, 'rgba(255,170,50,0.7)');
    }
  }
  if (o.frozen) {
    ctx.fillStyle = 'rgba(170,235,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.12, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(i * 1.6) * r * 0.3, Math.sin(i * 1.6) * r * 0.3);
      ctx.lineTo(Math.cos(i * 1.6) * r * 0.95, Math.sin(i * 1.6) * r * 0.95);
      ctx.stroke();
    }
  }
  if (o.flash && o.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.62, r * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.12, 0, r * 0.56, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Поведение                                                           */
/* ------------------------------------------------------------------ */
export interface AIOut {
  ang: number;
  speed: number;
  move: boolean;
  melee: boolean;
  meleeDmg: number;
  meleeCd: number;
}

export function enemyAI(g: Game, e: Enemy, dt: number, dist: number, ang0: number, speed0: number, playerSafe: boolean): AIOut {
  const p = g.player;
  const grid = g.world.grid;
  const out: AIOut = { ang: ang0, speed: speed0, move: true, melee: true, meleeDmg: e.dmg, meleeCd: 0.85 };
  if (e.rage > 0) out.speed *= 1.45;
  const toP = Math.atan2(p.y - e.y, p.x - e.x);
  const rnd = Math.random;

  switch (e.type) {
    case 'brute': {
      out.meleeCd = 1.2;
      break;
    }
    case 'marauder':
    case 'bandit': {
      out.meleeDmg = 6;
      out.meleeCd = 1;
      const los = dist < 460 && grid.hasLOS(e.x, e.y, p.x, p.y);
      if (los) {
        if (dist < 190) out.ang += Math.PI;
        else if (dist < 320) {
          out.ang += (Math.PI / 2) * e.strafe;
          out.speed *= 0.6;
        }
        if (e.shootCd <= 0 && !playerSafe) {
          e.shootCd = 1.1 + rnd() * 0.7;
          const a = e.angle + (rnd() - 0.5) * 0.14;
          g.bullets.push(
            mkBullet({
              x: e.x + Math.cos(e.angle) * 18, y: e.y + Math.sin(e.angle) * 18, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
              dmg: e.dmg, life: 1.1, speed: 520, from: 'e',
            }),
          );
          sfx.enemyShot();
        }
        if (rnd() < dt * 0.4) e.strafe *= -1;
      }
      break;
    }
    case 'spitter': {
      const los = dist < 520 && grid.hasLOS(e.x, e.y, p.x, p.y);
      if (los) {
        if (dist < 190) {
          out.ang += Math.PI;
          out.speed *= 0.9;
        } else if (dist < 340) {
          out.ang += (Math.PI / 2) * e.strafe;
          out.speed *= 0.5;
        }
        if (e.shootCd <= 0 && !playerSafe) {
          e.shootCd = 2 + rnd() * 0.9;
          e.vis = 0.35;
          const lead = dist / 340;
          const tx = p.x + (p.moving ? Math.cos(p.angle) * 0 : 0) * lead;
          const a = Math.atan2(p.y - e.y, tx - e.x) + (rnd() - 0.5) * 0.12;
          g.bullets.push(
            mkBullet({
              x: e.x + Math.cos(a) * 16, y: e.y + Math.sin(a) * 16, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340,
              dmg: e.dmg, life: 1.7, speed: 340, from: 'e', kind: 'acid', size: 6,
            }),
          );
          sfx.spit();
        }
        if (rnd() < dt * 0.4) e.strafe *= -1;
      }
      break;
    }
    case 'bloater': {
      out.melee = false;
      if (!playerSafe && dist < e.r + p.r + 8 && !e.dead) g.killEnemy(e, toP);
      break;
    }
    case 'screamer': {
      if (e.abilityCd <= 0 && dist < 580 && !playerSafe) {
        e.abilityCd = 7 + rnd() * 2;
        e.vis = 0.9;
        sfx.scream();
        g.rings.push({ x: e.x, y: e.y, max: 440, t: 0, dur: 0.8, color: 'scream' });
        for (const o of g.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 440) o.rage = 4.5;
        e.rage = 0;
      }
      break;
    }
    case 'stalker': {
      if (dist < 260) out.speed *= 1.5;
      break;
    }
    case 'leaper': {
      if (e.act === 0) {
        if (e.abilityCd <= 0 && dist > 140 && dist < 340 && !playerSafe && grid.hasLOS(e.x, e.y, p.x, p.y)) {
          e.act = 1;
          e.actT = 0.45;
          e.abilityCd = 3.2 + rnd() * 1.5;
        }
      } else if (e.act === 1) {
        out.move = false;
        e.actT -= dt;
        if (e.actT <= 0) {
          e.act = 2;
          e.actT = 0.38;
          e.ax = Math.cos(toP);
          e.ay = Math.sin(toP);
          sfx.leap();
        }
      } else if (e.act === 2) {
        out.ang = Math.atan2(e.ay, e.ax);
        out.speed = 620;
        out.meleeDmg = e.dmg * 1.2;
        e.actT -= dt;
        if (e.actT <= 0) e.act = 0;
      }
      break;
    }
    case 'burner': {
      const los = dist < 240 && grid.hasLOS(e.x, e.y, p.x, p.y) && !playerSafe;
      if (e.act === 0) {
        if (los && e.abilityCd <= 0) {
          e.act = 2;
          e.actT = 1.1;
          e.abilityCd = 3.2 + rnd();
        }
        if (dist < 150) out.move = false;
      } else if (e.act === 2) {
        out.speed *= 0.3;
        e.actT -= dt;
        e.aux -= dt;
        if (e.aux <= 0 && dist < 300) {
          e.aux = 0.07;
          const a = toP + (rnd() - 0.5) * 0.28;
          g.bullets.push(
            mkBullet({
              x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
              dmg: e.dmg * 0.6, life: 0.5, speed: 380, from: 'e', kind: 'flame', size: 7, burn: true,
            }),
          );
        }
        if (e.actT <= 0) e.act = 0;
      }
      break;
    }
    case 'mother': {
      if (e.aux <= 0 && dist < 800 && !playerSafe) {
        const crawlers = g.enemies.filter((o) => o.type === 'crawler').length;
        e.aux = 6.5;
        e.vis = 0.5;
        if (crawlers < 16) g.spawnOne('crawler', e.x + Math.cos(e.angle + 3.14) * 30, e.y + Math.sin(e.angle + 3.14) * 30, true);
      }
      break;
    }
    case 'colossus': {
      out.meleeCd = 1.4;
      if (e.aux <= 0 && dist < 900 && !playerSafe) {
        e.aux = 13;
        sfx.roar();
        g.toast('КОЛОСС зовёт подкрепление!', 'bad');
        for (let i = 0; i < 3; i++) {
          const a = rnd() * 6.283;
          g.spawnOne(i === 2 ? 'runner' : 'walker', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, true);
        }
      }
      if (e.act === 0) {
        if (e.abilityCd <= 0 && dist < 720 && !playerSafe) {
          if (rnd() < 0.55 || dist > 270) {
            e.act = 1;
            e.actT = 0.9;
            sfx.roar();
          } else {
            e.act = 4;
            e.actT = 0.8;
          }
        }
      } else if (e.act === 1) {
        out.move = false;
        e.actT -= dt;
        if (e.actT <= 0) {
          e.act = 2;
          e.actT = 1.1;
          e.ax = Math.cos(toP);
          e.ay = Math.sin(toP);
        }
      } else if (e.act === 2) {
        out.ang = Math.atan2(e.ay, e.ax);
        out.speed = 370;
        out.meleeDmg = e.dmg * 1.3;
        e.actT -= dt;
        g.shake = Math.max(g.shake, dist < 600 ? 3 : 0);
        if (e.actT <= 0) {
          e.act = 3;
          e.actT = 1.3;
        }
      } else if (e.act === 3) {
        out.move = false;
        e.actT -= dt;
        if (e.actT <= 0) {
          e.act = 0;
          e.abilityCd = 4.5 + rnd() * 2;
        }
      } else if (e.act === 4) {
        out.move = false;
        e.actT -= dt;
        if (e.actT <= 0) {
          sfx.stomp();
          g.rings.push({ x: e.x, y: e.y, max: 260, t: 0, dur: 0.6, color: 'stomp' });
          g.shake = Math.max(g.shake, 14);
          if (dist < 260 && !playerSafe) {
            g.hurtPlayer(30 * g.diff.dmg);
            p.slowT = 2;
          }
          e.act = 0;
          e.abilityCd = 4.5 + rnd() * 2;
        }
      }
      break;
    }
    case 'toxic': {
      if (rnd() < dt * 4) g.addParticle({ x: e.x, y: e.y, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, life: 1, max: 1, size: 4, color: 'rgba(140,200,60,', kind: 'smoke', rot: 0 });
      break;
    }
    default:
      break;
  }
  return out;
}
