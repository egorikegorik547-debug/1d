import type { Ctx } from './art';
import { WEAPONS, type WeaponId } from './weapons';
import { hasModel, drawModelInHand } from './weaponModels';

/** Оружие, смотрит вдоль +X от центра игрока */
export function drawWeapon(ctx: Ctx, id: WeaponId, time = 0) {
  const metal = '#2a2c2f';
  const hi = '#575b60';
  const dark = '#1a1b1d';
  const wood = '#6b4a2a';
  const woodHi = '#8a6338';
  const woodDark = '#4a3320';
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const glow = (x: number, y: number, r: number, c: string) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  switch (id) {
    // ---------- самодельное ----------
    case 'zippistol':
      rect(10, -3.4, 4, 6.8, '#5a4a34');
      rect(14, -3.2, 16, 2.6, '#6a6e72');
      rect(14, 0.6, 16, 2.6, '#6a6e72');
      rect(14, -0.6, 16, 1.2, dark);
      rect(18, -3.6, 2, 7.2, '#c8c0a0');
      rect(26, -3.6, 2, 7.2, '#c8c0a0');
      break;
    case 'homerevolver':
      rect(10, -2.2, 6, 4.4, '#5a4a34');
      rect(16, -2.4, 9, 4.8, '#555a5e');
      ctx.fillStyle = '#44484c';
      ctx.beginPath();
      ctx.arc(20, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a7e82';
      ctx.beginPath();
      ctx.arc(20, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      rect(25, -1.6, 13, 3.2, '#6a6e72');
      rect(25, -1.6, 13, 0.9, '#9a9ea2');
      rect(36, -1.2, 2.5, 2.4, dark);
      rect(23, 1.6, 6, 1.3, '#c8c0a0');
      break;
    case 'pipeshotgun':
      rect(8, -2.6, 10, 5.2, '#6b4a2a');
      rect(8, -2.6, 10, 1.2, woodHi);
      rect(18, -2, 28, 4, '#7a7e82');
      rect(18, -2, 28, 1, '#a8acb0');
      rect(34, -3, 3, 6, '#3a3c3e');
      rect(45, -1.4, 2.6, 2.8, dark);
      rect(20, 2, 8, 1.5, '#c8c0a0');
      break;
    case 'homesmg':
      rect(8, -3, 8, 6, '#6b4a2a');
      rect(16, -3.2, 20, 6.4, '#4a4e52');
      rect(16, -3.2, 20, 1.2, '#7a7e82');
      rect(36, -1.6, 10, 3.2, '#6a6e72');
      rect(45, -1.2, 2.5, 2.4, dark);
      rect(22, 3, 5, 9, '#2a2c2e');
      rect(20, -4.6, 6, 1.4, '#8a6a3a');
      rect(30, 2.5, 3, 2.4, '#c8c0a0');
      break;
    case 'homerifle':
      rect(4, -2.6, 14, 5.2, '#7a5430');
      rect(4, -2.6, 14, 1.3, woodHi);
      rect(18, -2.2, 14, 4.4, '#4a4e52');
      rect(32, -1.6, 28, 3.2, '#6a6e72');
      rect(32, -1.6, 28, 0.9, '#9a9ea2');
      rect(58, -1.2, 2.5, 2.4, dark);
      rect(22, -4.2, 14, 1.8, '#3a3a3a');
      rect(28, 2.2, 5, 4.6, '#2a2c2e');
      rect(40, 1.6, 12, 1.4, '#b0a090');
      break;
    // ---------- холодное оружие ----------
    case 'knife':
      rect(10, -2, 9, 4, '#5a3c22');
      rect(10, -2, 9, 1, '#7a5430');
      rect(19, -3, 2, 6, '#8a8e92');
      ctx.fillStyle = '#d6dade';
      ctx.beginPath();
      ctx.moveTo(21, -2.2);
      ctx.lineTo(36, -2.2);
      ctx.lineTo(41, 0.4);
      ctx.lineTo(21, 2);
      ctx.closePath();
      ctx.fill();
      rect(21, 1.2, 15, 0.8, '#9aa0a6');
      break;
    case 'cknife':
      rect(9, -2.2, 11, 4.4, '#23262a');
      for (let i = 0; i < 4; i++) rect(10.5 + i * 2.6, -2.2, 0.9, 4.4, '#3a3e44');
      rect(20, -3.6, 2.4, 7.2, '#55595e');
      ctx.fillStyle = '#c4cad0';
      ctx.beginPath();
      ctx.moveTo(22.4, -2.4);
      ctx.lineTo(42, -2.4);
      ctx.lineTo(48, 0.2);
      ctx.lineTo(22.4, 2.4);
      ctx.closePath();
      ctx.fill();
      rect(24, -0.4, 17, 0.8, '#6a7076');
      break;
    case 'machete':
      rect(8, -2.2, 12, 4.4, '#3a2a1c');
      rect(8, -2.2, 12, 1, '#5a4430');
      rect(20, -3.2, 2, 6.4, '#6a6e72');
      ctx.fillStyle = '#b9c0c6';
      ctx.beginPath();
      ctx.moveTo(22, -3.4);
      ctx.lineTo(54, -3.4);
      ctx.lineTo(62, 1.6);
      ctx.lineTo(54, 3.6);
      ctx.lineTo(22, 3.2);
      ctx.closePath();
      ctx.fill();
      rect(22, -3.4, 33, 1.1, '#e4e8ea');
      rect(26, 0.2, 28, 0.7, '#8a9096');
      break;
    case 'bayonet':
      rect(8, -2.4, 9, 4.8, '#2a2c2f');
      rect(17, -4, 3, 8, '#44484c');
      ctx.strokeStyle = '#44484c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(14, -3, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cfd5da';
      ctx.beginPath();
      ctx.moveTo(20, -2);
      ctx.lineTo(56, -1.2);
      ctx.lineTo(68, 0.4);
      ctx.lineTo(56, 1.8);
      ctx.lineTo(20, 2.4);
      ctx.closePath();
      ctx.fill();
      rect(22, -0.3, 38, 0.8, '#7a8086');
      break;
    case 'spear':
      rect(-14, -1.5, 70, 3, '#7a5a30');
      rect(-14, -1.5, 70, 0.9, '#a07a44');
      rect(24, -2.2, 3, 4.4, '#5a4430');
      rect(40, -2.2, 3, 4.4, '#5a4430');
      ctx.fillStyle = '#c8cdd2';
      ctx.beginPath();
      ctx.moveTo(56, -4.6);
      ctx.lineTo(80, 0);
      ctx.lineTo(56, 4.6);
      ctx.lineTo(60, 0);
      ctx.closePath();
      ctx.fill();
      rect(60, -0.4, 16, 0.8, '#8a9096');
      break;
    case 'axe':
      rect(6, -1.8, 52, 3.6, '#7a5430');
      rect(6, -1.8, 52, 1, '#a07a44');
      ctx.fillStyle = '#6a6e72';
      ctx.fillRect(48, -3, 7, 6);
      ctx.fillStyle = '#b4bac0';
      ctx.beginPath();
      ctx.moveTo(52, -3);
      ctx.lineTo(56, -10);
      ctx.lineTo(64, -11);
      ctx.lineTo(63, 0);
      ctx.lineTo(52, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0e4e6';
      ctx.fillRect(62, -11, 1.8, 11);
      break;
    case 'hammer':
      rect(4, -2, 48, 4, '#6a4a28');
      rect(4, -2, 48, 1.1, '#8a6338');
      rect(4, -2.6, 6, 5.2, '#2a2420');
      ctx.fillStyle = '#7a8086';
      ctx.fillRect(48, -7.5, 16, 15);
      ctx.fillStyle = '#a4aaaf';
      ctx.fillRect(48, -7.5, 16, 3);
      ctx.fillStyle = '#44484c';
      ctx.fillRect(62, -7.5, 2, 15);
      ctx.fillRect(48, -7.5, 2, 15);
      break;
    case 'pistol':
      rect(13, -2.6, 14, 5.2, metal);
      rect(13, -2.6, 14, 1.2, hi);
      rect(24, -1.2, 3, 2.4, dark);
      break;
    case 'aps':
      rect(12, -2.8, 18, 5.6, metal);
      rect(12, -2.8, 18, 1.2, hi);
      rect(30, -1.2, 4, 2.4, dark);
      rect(8, -1.6, 5, 3.2, woodDark);
      rect(18, -4, 4, 1.4, dark);
      break;
    case 'revolver':
      rect(12, -2.4, 12, 4.8, '#3a3c40');
      rect(12, -2.4, 12, 1.2, '#8a8f96');
      rect(24, -1.6, 12, 3.2, '#4a4d52');
      rect(24, -1.6, 12, 0.9, '#a0a6ad');
      ctx.fillStyle = '#2d2f33';
      ctx.beginPath();
      ctx.arc(19, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a7078';
      ctx.beginPath();
      ctx.arc(19, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      rect(35, -1.2, 2.5, 2.4, dark);
      rect(10, -1.6, 4, 3.2, woodDark);
      break;
    case 'smg':
      rect(10, -3.2, 20, 6.4, metal);
      rect(10, -3.2, 20, 1.3, hi);
      rect(30, -1.2, 6, 2.4, dark);
      ctx.strokeStyle = '#3a3c3f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(3, 0);
      ctx.stroke();
      rect(18, -4.4, 8, 1.6, woodDark);
      break;
    case 'silsmg':
      rect(9, -3, 19, 6, '#26292d');
      rect(9, -3, 19, 1.2, hi);
      rect(28, -2.2, 18, 4.4, '#1b1d20');
      rect(28, -2.2, 18, 1, '#44484d');
      rect(46, -2.4, 2, 4.8, dark);
      ctx.strokeStyle = '#3a3c3f';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(2, 0);
      ctx.stroke();
      rect(16, -4.4, 6, 1.4, dark);
      break;
    case 'sawedoff':
      rect(6, -3, 9, 6, wood);
      rect(6, -3, 9, 1.2, woodHi);
      rect(15, -3, 14, 2.6, '#303235');
      rect(15, 0.4, 14, 2.6, '#303235');
      rect(15, -3, 14, 0.8, hi);
      rect(28, -3.2, 2.5, 6.4, dark);
      break;
    case 'shotgun':
      rect(2, -3.2, 11, 6.4, wood);
      rect(2, -3.2, 11, 1.3, woodHi);
      rect(13, -2.6, 12, 5.2, metal);
      rect(24, -2, 22, 4, '#303235');
      rect(24, -2, 22, 1, hi);
      rect(26, -3.4, 10, 6.8, wood);
      rect(26, -3.4, 10, 1.3, woodHi);
      rect(44, -2.4, 3, 4.8, dark);
      break;
    case 'carbine':
      rect(0, -3, 14, 6, wood);
      rect(0, -3, 14, 1.3, woodHi);
      rect(14, -2.6, 14, 5.2, metal);
      rect(14, -2.6, 14, 1.1, hi);
      rect(28, -2.4, 16, 4.8, wood);
      rect(28, -2.4, 16, 1.1, woodHi);
      rect(44, -1.1, 7, 2.2, '#1f2022');
      rect(50, -2.2, 2, 4.4, dark);
      rect(20, -4.2, 7, 1.4, dark);
      break;
    case 'rifle':
      rect(0, -3.2, 14, 6.4, wood);
      rect(0, -3.2, 14, 1.3, woodHi);
      rect(14, -3, 15, 6, metal);
      rect(14, -3, 15, 1.2, hi);
      rect(29, -2.8, 12, 5.6, wood);
      rect(29, -2.8, 12, 1.2, woodHi);
      rect(41, -1.2, 10, 2.4, '#1f2022');
      rect(49, -2.6, 2.2, 5.2, dark);
      rect(18, -4.4, 6, 1.4, dark);
      break;
    case 'autoshotgun':
      rect(0, -3.4, 13, 6.8, '#2f3236');
      rect(0, -3.4, 13, 1.3, hi);
      rect(13, -3.4, 16, 6.8, metal);
      rect(13, -3.4, 16, 1.3, hi);
      rect(29, -2.4, 18, 4.8, '#303235');
      rect(29, -2.4, 18, 1, hi);
      rect(32, -4.6, 11, 9.2, '#34383c');
      rect(32, -4.6, 11, 1.3, hi);
      rect(46, -2.8, 3, 5.6, dark);
      rect(18, -5.4, 6, 2, '#3c4044');
      break;
    case 'lmg':
      rect(-1, -3.4, 13, 6.8, wood);
      rect(-1, -3.4, 13, 1.3, woodHi);
      rect(12, -3.2, 18, 6.4, metal);
      rect(12, -3.2, 18, 1.2, hi);
      rect(30, -2.6, 14, 5.2, wood);
      rect(44, -1.2, 14, 2.4, '#1f2022');
      rect(57, -2.8, 2.4, 5.6, dark);
      rect(18, 3, 11, 5.4, '#3c3f43');
      rect(18, 3, 11, 1.2, hi);
      rect(46, -4.4, 1.4, 8.8, '#3a3d40');
      break;
    case 'sniper':
      rect(-2, -3.4, 18, 6.8, wood);
      rect(-2, -3.4, 18, 1.4, woodHi);
      rect(16, -2.8, 18, 5.6, metal);
      rect(16, -2.8, 18, 1.2, hi);
      rect(34, -1.6, 25, 3.2, '#222426');
      rect(57, -2.4, 3, 4.8, '#18191a');
      rect(20, -6, 17, 3.8, '#1b1d1e');
      rect(20, -6, 17, 1, hi);
      rect(19, -6.4, 3, 4.6, '#101112');
      rect(35, -6.4, 3, 4.6, '#101112');
      rect(36.5, -5.4, 1.2, 2.6, '#4a6068');
      break;
    case 'amr':
      rect(-3, -4, 16, 8, '#3a3f35');
      rect(-3, -4, 16, 1.5, '#5a6150');
      rect(13, -3.2, 20, 6.4, '#2e332c');
      rect(13, -3.2, 20, 1.3, '#5a6150');
      rect(33, -2, 28, 4, '#222426');
      rect(33, -2, 28, 0.9, hi);
      rect(58, -3.4, 7, 6.8, dark);
      rect(60, -3.4, 1.4, 6.8, '#444');
      rect(63, -3.4, 1.4, 6.8, '#444');
      rect(18, -7.2, 20, 4.4, '#141516');
      rect(18, -7.2, 20, 1, hi);
      rect(17, -7.6, 3, 5.2, '#0c0d0e');
      rect(36, -7.6, 3, 5.2, '#0c0d0e');
      rect(37.2, -6.4, 1.2, 2.8, '#6a4a44');
      rect(38, 2.6, 2, 6, '#2a2c2f');
      rect(42, 2.6, 2, 6, '#2a2c2f');
      break;

    /* ------------------------------ особое ------------------------------ */
    case 'railgun':
      rect(0, -3.6, 14, 7.2, '#2a3a44');
      rect(0, -3.6, 14, 1.4, '#5a7a8a');
      rect(14, -4.2, 26, 3, '#334a58');
      rect(14, 1.2, 26, 3, '#334a58');
      rect(14, -4.2, 26, 0.9, '#7aa0b4');
      rect(14, -1.2, 28, 2.4, '#0f1c22');
      rect(40, -4.6, 6, 9.2, '#1f2e36');
      ctx.fillStyle = `rgba(110,250,255,${0.55 + 0.35 * Math.sin(time * 8)})`;
      for (let i = 0; i < 4; i++) ctx.fillRect(18 + i * 6, -0.8, 3, 1.6);
      glow(30, 0, 14, 'rgba(110,250,255,0.35)');
      break;
    case 'plasma':
      rect(2, -3.6, 14, 7.2, '#40305a');
      rect(2, -3.6, 14, 1.4, '#8a6ab0');
      rect(16, -4, 18, 8, '#2a2040');
      rect(16, -4, 18, 1.3, '#7a5aa0');
      rect(34, -2.4, 12, 4.8, '#241a36');
      ctx.fillStyle = '#c06bff';
      ctx.beginPath();
      ctx.arc(24, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      rect(44, -3.6, 3, 7.2, '#8a5ac8');
      glow(24, 0, 14, `rgba(192,107,255,${0.35 + 0.2 * Math.sin(time * 9)})`);
      glow(47, 0, 10, 'rgba(192,107,255,0.4)');
      break;
    case 'tesla':
      rect(0, -3.4, 13, 6.8, '#4a3a22');
      rect(13, -3.6, 14, 7.2, '#2e3a46');
      rect(13, -3.6, 14, 1.3, '#6a8aa0');
      rect(27, -1.6, 14, 3.2, '#1c2630');
      ctx.strokeStyle = '#b08850';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(30 + i * 3.5, 0, 1.4, 4.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#9fe0ff';
      ctx.beginPath();
      ctx.arc(45, 0, 3 + Math.sin(time * 20) * 0.8, 0, Math.PI * 2);
      ctx.fill();
      glow(45, 0, 16, 'rgba(120,200,255,0.5)');
      break;
    case 'flamer':
      rect(0, -3, 12, 6, '#3d2f22');
      rect(12, -3.2, 14, 6.4, '#4b4f52');
      rect(12, -3.2, 14, 1.2, '#7b8084');
      rect(26, -1.8, 18, 3.6, '#2a2c2f');
      rect(42, -2.8, 3, 5.6, '#5a3a2a');
      rect(-8, -6, 14, 5, '#a8392a');
      rect(-8, 1, 14, 5, '#a8392a');
      rect(-8, -6, 14, 1.2, '#d86a4a');
      rect(-8, 1, 14, 1.2, '#d86a4a');
      ctx.fillStyle = `rgba(255,170,60,${0.6 + 0.3 * Math.sin(time * 14)})`;
      ctx.beginPath();
      ctx.arc(46, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'rpg':
      rect(-6, -3, 22, 6, '#4a4f3a');
      rect(-6, -3, 22, 1.3, '#6a7050');
      rect(16, -4.6, 22, 9.2, '#3a3f2e');
      rect(16, -4.6, 22, 1.4, '#5a6044');
      rect(38, -3.4, 8, 6.8, '#2a2d22');
      rect(45, -4.2, 3, 8.4, '#1a1c14');
      rect(22, -7.5, 8, 3.4, '#1a1b1c');
      rect(24, 4.4, 4, 5, '#222');
      rect(-9, -4.2, 4, 8.4, '#2a2c2f');
      break;
    case 'cryo':
      rect(2, -3.4, 14, 6.8, '#2a4a60');
      rect(2, -3.4, 14, 1.3, '#6ab0d0');
      rect(16, -4.2, 16, 8.4, '#3a6a86');
      rect(16, -4.2, 16, 1.4, '#9ad8f0');
      rect(32, -2.4, 14, 4.8, '#1e3a4c');
      ctx.fillStyle = '#bff2ff';
      ctx.beginPath();
      ctx.moveTo(46, -3.4);
      ctx.lineTo(51, 0);
      ctx.lineTo(46, 3.4);
      ctx.closePath();
      ctx.fill();
      rect(20, -1.4, 8, 2.8, `rgba(170,240,255,${0.6 + 0.3 * Math.sin(time * 6)})`);
      glow(48, 0, 12, 'rgba(150,230,255,0.4)');
      break;
    case 'minigun':
      rect(-2, -3.6, 14, 7.2, '#35383c');
      rect(12, -4.6, 12, 9.2, '#44484c');
      rect(12, -4.6, 12, 1.4, hi);
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const a = time * 18 + (i * Math.PI) / 3;
        const yy = Math.sin(a) * 3.4;
        ctx.fillStyle = i % 2 ? '#2b2d30' : '#3e4145';
        ctx.fillRect(24, yy - 0.9, 24, 1.8);
      }
      ctx.restore();
      rect(46, -4.2, 3, 8.4, '#1a1b1d');
      rect(24, -4.4, 2, 8.8, '#222');
      rect(6, 3.6, 12, 6, '#3a4034');
      break;
    case 'blackhole':
      rect(0, -3.6, 14, 7.2, '#26203a');
      rect(14, -4.6, 18, 9.2, '#34284c');
      rect(14, -4.6, 18, 1.4, '#6a50a0');
      rect(32, -3, 8, 6, '#1a1428');
      ctx.fillStyle = '#05030a';
      ctx.beginPath();
      ctx.arc(46, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(190,120,255,${0.7 + 0.3 * Math.sin(time * 10)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(46, 0, 6.6, 0, Math.PI * 2);
      ctx.stroke();
      glow(46, 0, 15, 'rgba(160,80,255,0.45)');
      break;
    case 'swarm':
      rect(0, -3.4, 12, 6.8, '#4a4f3a');
      rect(12, -5.5, 26, 11, '#3b402f');
      rect(12, -5.5, 26, 1.4, '#62694a');
      ctx.fillStyle = '#16180f';
      for (let i = 0; i < 6; i++) {
        const cx = 40 - (i % 3) * 0;
        void cx;
        ctx.beginPath();
        ctx.arc(37, -3.6 + (i % 3) * 3.6, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      rect(36, -5.5, 4, 11, '#22251a');
      rect(16, 5.5, 6, 4, '#2a2c2f');
      rect(18, -8, 7, 2.6, '#1a1b1c');
      ctx.fillStyle = '#e06a3a';
      for (let i = 0; i < 3; i++) ctx.fillRect(40, -3.6 + i * 3.6 - 0.8, 2, 1.6);
      break;
    case 'nuke':
      rect(-4, -3.6, 18, 7.2, '#5a5e3a');
      rect(-4, -3.6, 18, 1.4, '#8a9058');
      rect(14, -5.4, 20, 10.8, '#4a4e2e');
      rect(14, -5.4, 20, 1.4, '#7a8050');
      // боеголовка
      ctx.fillStyle = '#d8d070';
      ctx.beginPath();
      ctx.ellipse(40, 0, 8, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c020';
      ctx.fillRect(36, -5.4, 3, 10.8);
      ctx.fillStyle = '#1a1a10';
      ctx.fillRect(36, -1.4, 3, 2.8);
      rect(20, -8.4, 8, 3, '#1a1b1c');
      glow(40, 0, 14, `rgba(255,240,120,${0.25 + 0.15 * Math.sin(time * 8)})`);
      break;
    default:
      if (hasModel(id)) drawModelInHand(ctx, id, WEAPONS[id].muzzle);
  }
}
