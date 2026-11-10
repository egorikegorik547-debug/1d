import type { Ctx } from './art';

export interface PersonOpts {
  r: number;
  cloth: string;
  clothDark: string;
  skin: string;
  hat: 'cap' | 'hood' | 'ushanka' | 'none' | 'hair';
  hatColor: string;
  phase: number;
  moving: boolean;
  arms: 'out' | 'relaxed' | 'weapon';
  armPhase?: number;
  vest?: boolean;
  wounds?: boolean;
  mask?: boolean;
  beard?: boolean;
  drawWeapon?: () => void;
}

/** Человек вида сверху, смотрит вдоль +X */
export function drawPerson(ctx: Ctx, o: PersonOpts) {
  const r = o.r;
  // ноги
  const swing = o.moving ? Math.sin(o.phase) * r * 0.55 : 0;
  ctx.fillStyle = o.clothDark;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(swing * s, s * r * 0.38, r * 0.55, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // руки (под телом, если вытянуты)
  const drawArms = () => {
    ctx.lineCap = 'round';
    ctx.lineWidth = r * 0.36;
    ctx.strokeStyle = o.cloth;
    let hands: [number, number][];
    if (o.arms === 'out') {
      const w = Math.sin((o.armPhase ?? 0)) * r * 0.12;
      hands = [
        [r * 1.45 + w, -r * 0.42],
        [r * 1.45 - w, r * 0.42],
      ];
    } else if (o.arms === 'weapon') {
      hands = [
        [r * 1.55, r * 0.05],
        [r * 0.95, r * 0.42],
      ];
    } else {
      hands = [
        [r * 0.2, -r * 0.95],
        [r * 0.2, r * 0.95],
      ];
    }
    const shoulders: [number, number][] = [
      [r * 0.05, -r * 0.62],
      [r * 0.05, r * 0.62],
    ];
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(shoulders[i][0], shoulders[i][1]);
      ctx.lineTo(hands[i][0], hands[i][1]);
      ctx.stroke();
      ctx.fillStyle = o.skin;
      ctx.beginPath();
      ctx.arc(hands[i][0], hands[i][1], r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  if (o.arms === 'out') drawArms();

  // торс
  ctx.fillStyle = o.cloth;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.62, r * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.15, r * 0.3, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.vest) {
    ctx.fillStyle = '#3a4246';
    ctx.strokeStyle = '#1b2022';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-r * 0.42, -r * 0.8, r * 0.84, r * 1.6, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4b555a';
    ctx.fillRect(-r * 0.3, -r * 0.5, r * 0.6, r * 0.36);
    ctx.fillRect(-r * 0.3, r * 0.14, r * 0.6, r * 0.36);
    ctx.strokeStyle = '#272d30';
    ctx.lineWidth = 1;
    ctx.strokeRect(-r * 0.3, -r * 0.5, r * 0.6, r * 0.36);
    ctx.strokeRect(-r * 0.3, r * 0.14, r * 0.6, r * 0.36);
  }
  if (o.wounds) {
    ctx.fillStyle = 'rgba(90,15,12,0.75)';
    ctx.beginPath();
    ctx.arc(r * 0.1, -r * 0.35, r * 0.18, 0, Math.PI * 2);
    ctx.arc(-r * 0.15, r * 0.4, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  if (o.arms !== 'out') {
    if (o.arms === 'weapon' && o.drawWeapon) {
      // оружие между руками
      ctx.save();
      o.drawWeapon();
      ctx.restore();
    }
    drawArms();
  }

  // голова
  ctx.fillStyle = o.skin;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(r * 0.12, 0, r * 0.56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (o.beard) {
    ctx.fillStyle = '#6a6358';
    ctx.beginPath();
    ctx.arc(r * 0.3, 0, r * 0.46, -1.1, 1.1);
    ctx.lineTo(r * 0.2, 0);
    ctx.fill();
  }
  switch (o.hat) {
    case 'cap':
      ctx.fillStyle = o.hatColor;
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.56, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(r * 0.05, 0, r * 0.56, Math.PI * 1.5, Math.PI * 0.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(r * 0.5, -r * 0.42, r * 0.28, r * 0.84);
      break;
    case 'hood':
      ctx.fillStyle = o.hatColor;
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(r * 0.45, 0, r * 0.22, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ushanka':
      ctx.fillStyle = o.hatColor;
      ctx.beginPath();
      ctx.arc(r * 0.05, 0, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(r * 0.0, -r * 0.1, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hair':
      ctx.fillStyle = o.hatColor;
      ctx.beginPath();
      ctx.arc(r * 0.0, 0, r * 0.56, Math.PI * 0.55, Math.PI * 1.45);
      ctx.fill();
      break;
    default:
      break;
  }
  if (o.mask) {
    ctx.fillStyle = '#2c3033';
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6a7074';
    ctx.beginPath();
    ctx.arc(r * 0.72, 0, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

export { drawWeapon } from './weaponArt';

export function drawPickup(ctx: Ctx, kind: 'cash' | 'ammo' | 'medkit', t: number) {
  const pulse = 0.18 + 0.1 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(230,225,190,${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-7, -4, 16, 11);
  if (kind === 'cash') {
    for (let i = 0; i < 2; i++) {
      ctx.save();
      ctx.rotate(i === 0 ? -0.2 : 0.15);
      ctx.fillStyle = '#6e8a58';
      ctx.fillRect(-8, -5, 16, 10);
      ctx.strokeStyle = '#3c5030';
      ctx.lineWidth = 1;
      ctx.strokeRect(-8, -5, 16, 10);
      ctx.restore();
    }
    ctx.fillStyle = '#cfc6a0';
    ctx.fillRect(-2, -5, 4, 10);
  } else if (kind === 'ammo') {
    ctx.fillStyle = '#5f6234';
    ctx.fillRect(-8, -5, 16, 10);
    ctx.strokeStyle = '#2f3119';
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -5, 16, 10);
    ctx.fillStyle = '#c0a45a';
    for (let i = 0; i < 4; i++) ctx.fillRect(-6 + i * 3.5, -3, 2, 6);
  } else {
    ctx.fillStyle = '#d2cdc0';
    ctx.fillRect(-8, -6, 16, 12);
    ctx.strokeStyle = '#6a665c';
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -6, 16, 12);
    ctx.fillStyle = '#a82e2e';
    ctx.fillRect(-1.8, -4.5, 3.6, 9);
    ctx.fillRect(-4.5, -1.8, 9, 3.6);
  }
}
