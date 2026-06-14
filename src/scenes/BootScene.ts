import Phaser from 'phaser';
import { t } from '../i18n';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#06040c');

    // Generate all procedural game textures
    this.generateTextures();

    // Spawn background atmospheric embers
    this.startEmberRain(width, height);

    const scale = width / 800;

    // Title text: Hollow Knight style fade-in scaled dynamically
    const title = this.add.text(width / 2, height / 2 - 50 * scale, 'D R A K H A R T', {
      fontSize: `${Math.round(42 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#a31515',
      shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: Math.round(12 * scale), fill: true }
    }).setOrigin(0.5).setAlpha(0);

    // Subtitle
    const subtitle = this.add.text(width / 2, height / 2 + 10 * scale, t('story.destinyEcho').toUpperCase(), {
      fontSize: `${Math.round(11 * scale)}px`,
      fontFamily: 'monospace',
      color: '#554a3c'
    }).setOrigin(0.5).setAlpha(0);

    // Press Enter prompt
    const prompt = this.add.text(width / 2, height / 2 + 80 * scale, `[ ${t('ui.pressStart')} ]`, {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'monospace',
      color: '#aa8855'
    }).setOrigin(0.5).setAlpha(0);

    // Tweens to fade in elements sequentially
    this.tweens.add({
      targets: title,
      alpha: 0.9,
      duration: 1600,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: subtitle,
      alpha: 0.6,
      duration: 1600,
      delay: 600,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: prompt,
      alpha: 0.75,
      duration: 1200,
      delay: 1400,
      ease: 'Power2',
      onComplete: () => {
        // Once visible, make the prompt pulse gently
        this.tweens.add({
          targets: prompt,
          alpha: 0.2,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    });

    // Keyboard trigger to start GameScene
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    let transitioning = false;

    enterKey.once('down', () => {
      if (transitioning) return;
      transitioning = true;

      // Hollow Knight style transition juice
      this.cameras.main.shake(300, 0.005);
      this.cameras.main.flash(350, 160, 20, 20); // crimson flash

      // Fade out title screen elements
      this.tweens.add({
        targets: [title, subtitle, prompt],
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          this.scene.start('GameScene');
        }
      });
    });
  }

  private startEmberRain(width: number, height: number): void {
    // Continuously spawn background embers floating upwards
    this.time.addEvent({
      delay: 140,
      callback: () => {
        const x = Phaser.Math.Between(0, width);
        const y = height + 10;
        const size = Phaser.Math.Between(2, 4);
        const color = Phaser.Math.Between(0, 1) ? 0xcc3300 : 0xffaa00;

        const ember = this.add.rectangle(x, y, size, size, color, 0.4);
        ember.setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: ember,
          x: x + Phaser.Math.Between(-100, 100),
          y: -10,
          alpha: 0,
          scale: 0.1,
          duration: Phaser.Math.Between(4500, 8000),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy()
        });
      },
      loop: true
    });
  }

  // ── helpers ──
  private tex(g: Phaser.GameObjects.Graphics, key: string, w: number, h: number): void {
    g.generateTexture(key, w, h); g.clear();
  }
  private circ(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, col: number): void {
    g.fillStyle(col); g.fillCircle(x, y, r);
  }
  private rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, col: number): void {
    g.fillStyle(col); g.fillRoundedRect(x, y, w, h, r);
  }
  private tri(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, col: number): void {
    g.fillStyle(col); g.fillTriangle(x1, y1, x2, y2, x3, y3);
  }

  // ═══ Palette ═══
  private P = {
    // Dragon-scale armor plates (Draconus reptilian tribute)
    wSc1: 0x0e2a10, wSc2: 0x1a4420, wSc3: 0x267032, wSc4: 0x349844,
    // Scale highlight / belly lighter scales
    wScH: 0x44aa55, wScB: 0x1e3a1a,
    // Dark steel under-structure (joints, frame, boots)
    wSt1: 0x0d0f14, wSt2: 0x1a1d26, wSt3: 0x282d3a, wSt4: 0x3a4050,
    // Blood-red accents & visor glow
    wBr1: 0x6b0a0a, wBr2: 0x8b1a1a, wBr3: 0xcc2222, wVisor: 0xff3322, wVisor2: 0xff6644,
    // Dark gold trim (subtle heraldic)
    wGo: 0x6b5a20, wGo2: 0x8a7530,
    // Horns (bone fading to dark)
    wH1: 0xc8b89a, wH2: 0x9e8b70, wH3: 0x4a3a2a,
    // Cape (tattered dark green-black)
    wCa1: 0x060a05, wCa2: 0x0e180c, wCa3: 0x182a14,
    // Dark leather / chainmail at joints
    wLe1: 0x1a1510, wLe2: 0x282018,
    // Sword blade (dark steel with blood runes)
    wBl1: 0x3a4050, wBl2: 0x505868, wBl3: 0x686e7a,

    // Escaflowne Dragon-Mech/Humanoid-Mecha colors (White / Gold / Crimson)
    mPl1: 0xd2d7e0, mPl2: 0xfafaff, mPl3: 0x9fa5b5, // White/silver/grey armor plates
    mRd1: 0x7c0a0a, mRd2: 0xc21818, mRd3: 0xff4d4d, // Deep crimson accent panels & cape
    mGo:  0xe5b810, mGo2: 0xa37e06,                 // Gold filigree / clockwork joints
    mJo:  0x282c35, mJo2: 0x48505e,                 // Graphite/grey mechanical joints/frame
    mCo1: 0xcc0033, mCo2: 0xff3366, mCo3: 0xffffff, // Pulsing Energist core (ruby red/magenta)
    mEy:  0x00ff88,                                 // Emerald green visor/eyes

    // Original dragon/boss colors retained/refined
    dB: 0x111122, dM: 0x181830, dA: 0x2a2a45, dSt: 0x445566, dGo: 0xcc9944,
    dCo: 0xff4400, dCo2: 0xff8800, dCo3: 0xffcc00, dCo4: 0xffffff, dEy: 0xff6600,
    dWi: 0x1a1a35, dTe: 0x778899, dJo: 0x554433, dJo2: 0x776655,
  };

  private generateTextures(): void {
    this.genWarriorFrames();
    this.genMechaFrames();
    this.genDragonFrames();
    this.drawSentinel();
    this.drawBoss();
    this.drawTiles();
    this.drawDragonCore();
    this.drawBarricade();
    this.drawFireBullet();
    this.drawSwordSlash();
    this.drawSwordSlashHeavy();
    this.drawDestinyCard();
    this.drawShadow();
    this.drawBackgrounds();
    this.drawParticles();
  }

  // ═══════════════════════════════════════
  //  WARRIOR FRAMES — 48×72 (Draconus Dark Knight)
  // ═══════════════════════════════════════

  private genWarriorFrames(): void {
    this.drawWarrior('h-idle-0', 0, 0, 0, 0, 'none');
    this.drawWarrior('h-idle-1', 0, -1, 1, 0, 'none');
    this.drawWarrior('h-idle-2', 0, -2, 2, 0, 'none');
    this.drawWarrior('h-idle-3', 0, -1, 1, 0, 'none');

    this.drawWarrior('h-walk-0', 4, 0, -2, 0, 'none');
    this.drawWarrior('h-walk-1', 1, -1, -1, 0, 'none');
    this.drawWarrior('h-walk-2', -4, 0, 2, 0, 'none');
    this.drawWarrior('h-walk-3', -1, -1, 1, 0, 'none');

    this.drawWarrior('h-jump', 0, -2, 0, 0, 'jump');
    this.drawWarrior('h-fall', 0, 2, 3, 0, 'fall');

    this.drawWarrior('h-attack-0', 1, 0, 0, 1, 'none');
    this.drawWarrior('h-attack-1', 3, 1, 0, 2, 'none');
    this.drawWarrior('h-attack-2', 0, 0, 0, 3, 'none');

    this.drawWarrior('player-human', 0, 0, 0, 0, 'none');
  }

  private drawWarrior(
    key: string,
    legShift: number,
    bodyBob: number,
    capeShift: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const isAttacking = attackFrame > 0;
    const b = bodyBob;
    const isWalk = key.indexOf('walk') !== -1;

    // Subtle hunched walk tilt (slight forward lean, not extreme)
    const walkTiltX = isWalk ? 4.0 : 1.0;
    const walkTiltY = isWalk ? 2.0 : 0.5;

    // Shift offset: dx = 24, dy = 24
    const dx = 24;
    const dy = 24;

    // ── 1. Background Leg (Z-shaped, dark shadow steel — moves OPPOSITE to foreground) ──
    const blHipX = 14 + dx + (isWalk ? -1.5 : 0);
    const blHipY = 35 + dy + b;
    const blKneeX = 18 + dx + legShift * 0.6;
    const blKneeY = 47 + dy + b - Math.abs(legShift) * 0.4;
    const blAnkleX = 13 + dx + legShift * 0.4;
    const blAnkleY = 57 + dy + b - Math.abs(legShift) * 0.3;
    const blFootX = 17 + dx + legShift * 0.9;
    const blFootY = 66 + dy + b - Math.abs(legShift) * 0.2;

    g.lineStyle(5, P.wSt1);
    g.beginPath(); g.moveTo(blHipX, blHipY); g.lineTo(blKneeX, blKneeY); g.strokePath();
    g.lineStyle(4, P.wSt1);
    g.beginPath(); g.moveTo(blKneeX, blKneeY); g.lineTo(blAnkleX, blAnkleY); g.strokePath();
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(blAnkleX, blAnkleY); g.lineTo(blFootX, blFootY); g.strokePath();
    this.tri(g, blFootX, blFootY, blFootX + 3, blFootY + 1, blFootX - 1, blFootY + 1, P.wSt2);

    // ── 2. Cape (narrow, dark, behind body — does NOT obscure legs) ──
    const capeDrift = capeShift * 0.8;
    const capeY = jumpState === 'fall' ? -3 : jumpState === 'jump' ? 2 : 0;
    g.fillStyle(P.wCa1);
    g.beginPath();
    g.moveTo(12 + dx, 18 + dy + b + walkTiltY);
    g.lineTo(8 + dx - capeDrift, 55 + dy + b + capeY);
    g.lineTo(5 + dx - capeDrift, 62 + dy + b + capeY);
    g.lineTo(15 + dx, 55 + dy + b + capeY);
    g.closePath(); g.fillPath();
    g.fillStyle(P.wCa2);
    g.beginPath();
    g.moveTo(13 + dx, 20 + dy + b + walkTiltY);
    g.lineTo(10 + dx - capeDrift * 0.6, 53 + dy + b + capeY);
    g.lineTo(7 + dx - capeDrift, 59 + dy + b + capeY);
    g.lineTo(15 + dx, 52 + dy + b + capeY);
    g.closePath(); g.fillPath();
    // Ragged bottom edges
    this.tri(g, 5 + dx - capeDrift, 60 + dy + b + capeY, 8 + dx - capeDrift, 65 + dy + b + capeY, 3 + dx - capeDrift, 64 + dy + b + capeY, P.wCa3);

    // ── 2.1 Small armored tail stub ──
    const tailSway = capeShift * 1.5;
    const tailBaseX = 12 + dx + (isWalk ? -1 : 0);
    const tailBaseY = 36 + dy + b;
    this.circ(g, tailBaseX, tailBaseY, 2.5, P.wSt2);
    this.circ(g, tailBaseX - 3 - tailSway * 0.3, tailBaseY + 3, 2.0, P.wSt3);
    this.circ(g, tailBaseX - 6 - tailSway * 0.5, tailBaseY + 6, 1.5, P.wSc1);
    this.tri(g, tailBaseX - 6 - tailSway * 0.5, tailBaseY + 4, tailBaseX - 9 - tailSway * 0.5, tailBaseY + 6, tailBaseX - 7 - tailSway * 0.5, tailBaseY + 4, P.wSc2);

    // ── 3. Torso ──
    const torsoX = 14 + dx + (isWalk ? 0.5 : 0);
    const torsoY = 16 + dy + b;
    const torsoW = 16;
    const torsoH = 18;

    // Dark frame
    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 5);
    g.lineTo(torsoX + torsoW - 1, torsoY + 13);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH + 1);
    g.closePath(); g.fillPath();

    // Steel breastplate
    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 5);
    g.lineTo(torsoX + torsoW - 2, torsoY + 13);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH);
    g.closePath(); g.fillPath();

    // Highlight panel
    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 5, torsoY + 3);
    g.lineTo(torsoX + torsoW - 3, torsoY + 6);
    g.lineTo(torsoX + torsoW - 4, torsoY + 12);
    g.lineTo(torsoX + torsoW - 6, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 2);
    g.closePath(); g.fillPath();

    // Dragon scale row across chest
    this.circ(g, torsoX + 5, torsoY + 7, 2.5, P.wSc1);
    this.circ(g, torsoX + 9, torsoY + 8, 2.5, P.wSc1);
    this.circ(g, torsoX + 7, torsoY + 10, 2.0, P.wSc2);
    // Scale highlight dots
    this.circ(g, torsoX + 5, torsoY + 7, 1.2, P.wSc3);
    this.circ(g, torsoX + 9, torsoY + 8, 1.2, P.wSc3);

    // Rivets
    g.fillStyle(0x0c0d12);
    g.fillRect(torsoX + 4, torsoY + 5, 1.5, 1.5);
    g.fillRect(torsoX + 12, torsoY + 6, 1.5, 1.5);
    g.fillRect(torsoX + 6, torsoY + 13, 1.5, 1.5);

    // Spine spikes
    this.tri(g, torsoX - 1, torsoY + 3, torsoX - 5, torsoY + 5, torsoX - 1, torsoY + 8, P.wSc1);
    this.tri(g, torsoX - 1, torsoY + 8, torsoX - 6, torsoY + 10, torsoX - 1, torsoY + 13, P.wSc2);
    this.tri(g, torsoX - 1, torsoY + 13, torsoX - 5, torsoY + 15, torsoX - 1, torsoY + 18, P.wSc1);

    // Front edge contour highlight
    g.fillStyle(P.wSt4, 0.5);
    g.fillRect(torsoX + torsoW - 3, torsoY + 5, 2, 10);

    // Gold top collar trim
    this.rect(g, torsoX, torsoY + 1, torsoW - 2, 2, 0.5, P.wGo);
    // Dragon-scale belt trim
    this.rect(g, torsoX + 2, torsoY + torsoH - 2, torsoW - 6, 2, 1, P.wSc1);
    this.rect(g, torsoX + 3, torsoY + torsoH - 1, torsoW - 8, 1, 0.5, P.wSc3);
    // Belt buckle
    this.rect(g, torsoX, torsoY + torsoH, torsoW - 2, 2, 0.5, P.wSt1);
    this.rect(g, torsoX + 6, torsoY + torsoH, 4, 2, 0.5, P.wGo);

    // ── 4. Foreground Leg ──
    const flHipX = 20 + dx + (isWalk ? 1.5 : 0);
    const flHipY = 35 + dy + b;
    const flKneeX = 27 + dx - legShift * 0.8;
    const flKneeY = 47 + dy + b - Math.abs(legShift) * 0.5;
    const flAnkleX = 20 + dx - legShift * 0.5;
    const flAnkleY = 58 + dy + b - Math.abs(legShift) * 0.3;
    const flFootX = 27 + dx - legShift * 1.2;
    const flFootY = 68 + dy + b - Math.abs(legShift) * 0.2;

    // Thigh plate
    g.lineStyle(6, P.wSt2);
    g.beginPath(); g.moveTo(flHipX, flHipY); g.lineTo(flKneeX, flKneeY); g.strokePath();
    g.lineStyle(2, P.wSt3);
    g.beginPath(); g.moveTo(flHipX + 1, flHipY + 1); g.lineTo(flKneeX + 1, flKneeY - 1); g.strokePath();
    // Green dragon-scale kneepad
    this.circ(g, flKneeX, flKneeY, 3.0, P.wSc1);
    this.circ(g, flKneeX, flKneeY, 2.0, P.wSc2);
    // Greave
    g.lineStyle(5, P.wSt3);
    g.beginPath(); g.moveTo(flKneeX, flKneeY); g.lineTo(flAnkleX, flAnkleY); g.strokePath();
    g.lineStyle(1.5, P.wSc2);
    g.beginPath(); g.moveTo(flKneeX - 1, flKneeY + 2); g.lineTo(flAnkleX - 1, flAnkleY - 2); g.strokePath();
    // Sabaton
    g.lineStyle(4, P.wSt4);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY); g.lineTo(flFootX, flFootY); g.strokePath();
    this.tri(g, flFootX, flFootY, flFootX + 4, flFootY + 1, flFootX - 1, flFootY + 1, P.wGo);

    // ── 5. Pauldron ──
    const pauldronX = 15 + dx + walkTiltX;
    const pauldronY = 14 + dy + b + walkTiltY;
    this.rect(g, pauldronX, pauldronY, 12, 8, 2, P.wSt2);
    this.rect(g, pauldronX + 1, pauldronY + 1, 10, 6, 1, P.wSt3);
    this.rect(g, pauldronX + 3, pauldronY + 3, 6, 3, 0.5, P.wSc1);
    this.rect(g, pauldronX + 4, pauldronY + 4, 4, 1, 0.3, P.wSc3);
    this.tri(g, pauldronX + 2, pauldronY, pauldronX + 6, pauldronY - 5, pauldronX + 10, pauldronY, P.wGo);

    // ── 6. Neck ──
    const neckX = 17 + dx + walkTiltX;
    const neckY = 12 + dy + b + walkTiltY;
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(torsoX + 8, torsoY + 2); g.lineTo(neckX + 3, neckY + 3); g.strokePath();
    this.circ(g, neckX + 2, neckY + 3, 1.5, P.wSc1);

    // ── 7. Helmet ──
    const headX = 14 + dx + walkTiltX;
    const headY = 2 + dy + b + walkTiltY;
    
    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(headX - 1, headY + 12);
    g.lineTo(headX - 1, headY + 1);
    g.lineTo(headX + 9, headY - 1);
    g.lineTo(headX + 16, headY + 3);
    g.lineTo(headX + 16, headY + 7);
    g.lineTo(headX + 10, headY + 9);
    g.lineTo(headX + 11, headY + 11);
    g.lineTo(headX - 1, headY + 12);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(headX, headY + 11);
    g.lineTo(headX, headY + 2);
    g.lineTo(headX + 8, headY);
    g.lineTo(headX + 15, headY + 4);
    g.lineTo(headX + 15, headY + 7);
    g.lineTo(headX + 9, headY + 8);
    g.lineTo(headX + 10, headY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(headX + 2, headY + 9);
    g.lineTo(headX + 2, headY + 3);
    g.lineTo(headX + 7, headY + 1);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 10, headY + 7);
    g.closePath(); g.fillPath();

    g.fillStyle(0x0a0502); g.fillRect(headX + 5, headY + 3.5, 7, 2.5);
    g.fillStyle(P.wVisor); g.fillRect(headX + 6, headY + 4, 5, 1.5);
    g.fillStyle(P.wVisor2, 0.3); g.fillRect(headX + 5, headY + 3, 8, 3.5);

    g.lineStyle(1.5, P.wSt4);
    g.beginPath(); g.moveTo(headX + 10, headY + 10); g.lineTo(headX + 9, headY + 13); g.strokePath();
    g.beginPath(); g.moveTo(headX + 12, headY + 9); g.lineTo(headX + 12, headY + 12); g.strokePath();

    // swept back horn
    g.fillStyle(P.wH1);
    g.beginPath();
    g.moveTo(headX + 2, headY + 1);
    g.lineTo(headX - 6, headY - 4);
    g.lineTo(headX - 8, headY - 2);
    g.lineTo(headX + 1, headY + 4);
    g.closePath(); g.fillPath();
    g.fillStyle(P.wH2);
    g.beginPath();
    g.moveTo(headX + 1, headY + 2);
    g.lineTo(headX - 4, headY - 2);
    g.lineTo(headX - 5, headY - 1);
    g.lineTo(headX + 1, headY + 3);
    g.closePath(); g.fillPath();

    // ── 9. Sword Arm ──
    let armX = 20 + dx + walkTiltX;
    let armY = 22 + dy + b + walkTiltY;
    let swPhase = 0;

    if (isAttacking) {
      if (attackFrame === 1) { armX = 14 + dx + walkTiltX; armY = 18 + dy + b + walkTiltY; swPhase = 1; }
      else if (attackFrame === 2) { armX = 30 + dx + walkTiltX; armY = 22 + dy + b + walkTiltY; swPhase = 2; }
      else if (attackFrame === 3) { armX = 28 + dx + walkTiltX; armY = 28 + dy + b + walkTiltY; swPhase = 3; }
    }

    this.rect(g, armX, armY, 7, 10, 2, P.wSt2);
    this.rect(g, armX + 1, armY + 1, 5, 8, 1, P.wSt3);
    this.rect(g, armX + 1, armY + 3, 5, 3, 0.5, P.wSc1);
    this.rect(g, armX + 2, armY + 4, 3, 1, 0.3, P.wSc3);
    this.rect(g, armX + 2, armY + 7, 3, 2, 0.5, P.wGo);

    // ── 10. Greatsword ──
    if (swPhase === 1) {
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX - 2, armY - 4, 4, 5, 1);
      g.fillStyle(P.wGo); g.fillRect(armX - 5, armY - 1, 10, 2.5);
      g.fillStyle(P.wBl1); g.fillRect(armX - 1, armY - 20, 4, 16);
      g.fillStyle(P.wBl2); g.fillRect(armX, armY - 18, 2, 14);
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 0.5, armY - 16, 1, 10);
    } else if (swPhase === 2) {
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 5, armY, 5, 4, 1);
      g.fillStyle(P.wGo); g.fillRect(armX + 4, armY - 3, 3, 12);
      g.fillStyle(P.wBl1); g.fillRect(armX + 7, armY, 24, 4);
      g.fillStyle(P.wBl2); g.fillRect(armX + 9, armY + 1, 20, 2);
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 10, armY + 1.5, 16, 1);
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 31, armY); g.lineTo(armX + 35, armY + 2); g.lineTo(armX + 31, armY + 4); g.closePath(); g.fillPath();
    } else if (swPhase === 3) {
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 3, armY + 6, 4, 5, 1);
      g.fillStyle(P.wGo); g.fillRect(armX, armY + 5, 10, 2.5);
      g.fillStyle(P.wBl1); g.fillRect(armX + 4, armY + 9, 4, 18);
      g.fillStyle(P.wBl2); g.fillRect(armX + 5, armY + 11, 2, 14);
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 5.5, armY + 12, 1, 10);
    } else {
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 2, armY - 2, 4, 5, 1);
      g.fillStyle(P.wGo); g.fillRect(armX - 1, armY - 4, 10, 2.5);
      g.fillStyle(P.wBl1); g.fillRect(armX + 3, armY - 22, 4, 18);
      g.fillStyle(P.wBl2); g.fillRect(armX + 4, armY - 20, 2, 16);
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 4.5, armY - 18, 1, 12);
    }

    this.tex(g, key, 96, 96);
  }

  // ═══════════════════════════════════════
  //  MECHA FRAMES — 64×80 (Guymelef Gothic Knight)
  // ═══════════════════════════════════════

  private genMechaFrames(): void {
    this.drawMecha('m-idle-0', 0, 0, 0, 'none');
    this.drawMecha('m-idle-1', 0, -1, 0, 'none');
    this.drawMecha('m-idle-2', 0, -2, 0, 'none');

    this.drawMecha('m-walk-0', 4, 0, 0, 'none');
    this.drawMecha('m-walk-1', 0, -1, 0, 'none');
    this.drawMecha('m-walk-2', -4, 0, 0, 'none');
    this.drawMecha('m-walk-3', 0, -1, 0, 'none');

    this.drawMecha('m-jump', 0, -3, 0, 'jump');
    this.drawMecha('m-fall', 0, 3, 0, 'fall');

    this.drawMecha('m-attack-0', 1, 0, 1, 'none');
    this.drawMecha('m-attack-1', 4, 2, 2, 'none');
    this.drawMecha('m-attack-2', 2, 1, 3, 'none');

    this.drawMecha('player-mecha', 0, 0, 0, 'none');
  }

  private drawMecha(
    key: string,
    legShift: number,
    bodyBob: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const isAttacking = attackFrame > 0;
    const b = bodyBob;
    const isWalk = key.indexOf('walk') !== -1;

    // Subtle forward lean when walking
    const tiltX = isWalk ? 3.0 : 0.5;
    const tiltY = isWalk ? 1.5 : 0.0;

    // Shift offset: dx = 32, dy = 48 (canvas is 128x128)
    const dx = 32;
    const dy = 48;

    // ── 1. Background Leg (slender graphite, shadowed Z-shape) ──
    const blHipX = 22 + dx + (isWalk ? -1 : 0);
    const blHipY = 46 + dy + b;
    const blKneeX = 26 + dx + legShift * 0.5;
    const blKneeY = 57 + dy + b - Math.abs(legShift) * 0.3;
    const blAnkleX = 20 + dx + legShift * 0.3;
    const blAnkleY = 67 + dy + b - Math.abs(legShift) * 0.2;
    const blFootX = 25 + dx + legShift * 0.7;
    const blFootY = 75 + dy + b - Math.abs(legShift) * 0.15;

    g.lineStyle(5, P.mJo);
    g.beginPath(); g.moveTo(blHipX, blHipY); g.lineTo(blKneeX, blKneeY); g.strokePath();
    g.lineStyle(4, P.mJo2);
    g.beginPath(); g.moveTo(blKneeX, blKneeY); g.lineTo(blAnkleX, blAnkleY); g.strokePath();
    g.lineStyle(4, P.mJo2);
    g.beginPath(); g.moveTo(blAnkleX, blAnkleY); g.lineTo(blFootX, blFootY); g.strokePath();
    this.tri(g, blFootX, blFootY, blFootX + 3, blFootY + 1.5, blFootX - 1, blFootY + 1.5, P.mGo2);

    // ── 2. Flowing Crimson Cape (narrow, tattered, behind body) ──
    const capeBob = b + (jumpState === 'fall' ? -3 : jumpState === 'jump' ? 2 : 0);
    const capeDrift = isWalk ? legShift * 0.4 : 0;
    g.fillStyle(P.mRd1);
    g.beginPath();
    g.moveTo(18 + dx, 22 + dy + capeBob + tiltY);
    g.lineTo(10 + dx - capeDrift, 58 + dy + capeBob);
    g.lineTo(5 + dx - capeDrift, 70 + dy + capeBob);
    g.lineTo(22 + dx, 55 + dy + capeBob);
    g.closePath(); g.fillPath();
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(20 + dx, 24 + dy + capeBob + tiltY);
    g.lineTo(13 + dx - capeDrift * 0.6, 56 + dy + capeBob);
    g.lineTo(8 + dx - capeDrift, 65 + dy + capeBob);
    g.lineTo(22 + dx, 52 + dy + capeBob);
    g.closePath(); g.fillPath();
    this.tri(g, 5 + dx - capeDrift, 68 + dy + capeBob, 8 + dx - capeDrift, 74 + dy + capeBob, 3 + dx - capeDrift, 73 + dy + capeBob, P.mRd1);

    // ── 3. Torso — V-shaped white breastplate (Escaflowne design) ──
    const torsoX = 20 + dx + (isWalk ? 0.5 : 0);
    const torsoY = 18 + dy + b;
    const torsoW = 18;
    const torsoH = 24;

    // Gold back wings/vents (Escaflowne signature back clockwork)
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY + 2);
    g.lineTo(torsoX - 9, torsoY - 2);
    g.lineTo(torsoX - 12, torsoY + 4);
    g.lineTo(torsoX - 2, torsoY + 10);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mGo2);
    g.beginPath();
    g.moveTo(torsoX - 2, torsoY + 10);
    g.lineTo(torsoX - 10, torsoY + 7);
    g.lineTo(torsoX - 12, torsoY + 12);
    g.lineTo(torsoX - 2, torsoY + 16);
    g.closePath(); g.fillPath();

    // Dark structural backing
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 6);
    g.lineTo(torsoX + torsoW - 1, torsoY + 16);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH + 1);
    g.closePath(); g.fillPath();

    // Main white breastplate
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 6);
    g.lineTo(torsoX + torsoW - 2, torsoY + 16);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH);
    g.closePath(); g.fillPath();

    // Pure white highlight chest plate
    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 6, torsoY + 3);
    g.lineTo(torsoX + torsoW - 2, torsoY + 7);
    g.lineTo(torsoX + torsoW - 3, torsoY + 15);
    g.lineTo(torsoX + torsoW - 5, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 2);
    g.closePath(); g.fillPath();

    // Crimson neck/chest chevron
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 7, torsoY + 3);
    g.lineTo(torsoX + torsoW - 5, torsoY + 7);
    g.lineTo(torsoX + 3, torsoY + 7);
    g.closePath(); g.fillPath();

    // Large red Energist gem in the center (signature Escaflowne detail)
    const coreX = torsoX + 8;
    const coreY = torsoY + 11;
    this.circ(g, coreX, coreY, 4.5, P.mGo); // gold outer bezel
    this.circ(g, coreX, coreY, 3.2, P.mCo1); // ruby core
    this.circ(g, coreX, coreY, 2.0, P.mCo2); // bright center
    this.circ(g, coreX + 1, coreY - 1, 0.8, P.mCo3); // shine dot

    // Spine spikes (white/gold back fins)
    this.tri(g, torsoX - 1, torsoY + 4, torsoX - 5, torsoY + 6, torsoX - 1, torsoY + 9, P.mPl3);
    this.tri(g, torsoX - 1, torsoY + 9, torsoX - 6, torsoY + 11, torsoX - 1, torsoY + 14, P.mPl3);
    this.tri(g, torsoX - 1, torsoY + 14, torsoX - 5, torsoY + 16, torsoX - 1, torsoY + 19, P.mPl3);

    // Gold belt trim
    this.rect(g, torsoX, torsoY + torsoH - 2, torsoW - 2, 2, 0.5, P.mGo);
    // Slim waist block
    this.rect(g, torsoX + 3, torsoY + torsoH, torsoW - 8, 4, 0.5, P.mJo);

    // ── 4. Foreground Leg (Z-shaped white armor with gold knees) ──
    const flHipX = 26 + dx + (isWalk ? 1.5 : 0);
    const flHipY = 46 + dy + b;
    const flKneeX = 33 + dx - legShift * 0.7;
    const flKneeY = 57 + dy + b - Math.abs(legShift) * 0.4;
    const flAnkleX = 25 + dx - legShift * 0.4;
    const flAnkleY = 67 + dy + b - Math.abs(legShift) * 0.25;
    const flFootX = 32 + dx - legShift * 1.0;
    const flFootY = 75 + dy + b - Math.abs(legShift) * 0.15;

    // Thigh plate: thick white stroke with a darker grey outline
    g.lineStyle(7, P.mPl3);
    g.beginPath(); g.moveTo(flHipX, flHipY); g.lineTo(flKneeX, flKneeY); g.strokePath();
    g.lineStyle(4, P.mPl2);
    g.beginPath(); g.moveTo(flHipX, flHipY + 1); g.lineTo(flKneeX, flKneeY - 1); g.strokePath();

    // Gold knee joint cap
    this.circ(g, flKneeX, flKneeY, 3.5, P.mGo);
    this.circ(g, flKneeX, flKneeY, 2.0, P.mGo2);
    
    // Crimson knee spike
    this.tri(g, flKneeX + 1.5, flKneeY - 2, flKneeX + 6, flKneeY, flKneeX + 1.5, flKneeY + 2.5, P.mRd2);

    // Shin plate (Greave): white with red striping
    g.lineStyle(6, P.mPl3);
    g.beginPath(); g.moveTo(flKneeX, flKneeY); g.lineTo(flAnkleX, flAnkleY); g.strokePath();
    g.lineStyle(3, P.mPl2);
    g.beginPath(); g.moveTo(flKneeX, flKneeY + 1); g.lineTo(flAnkleX, flAnkleY - 1); g.strokePath();
    
    // Crimson stripe on greave
    g.lineStyle(1.5, P.mRd2);
    g.beginPath(); g.moveTo(flKneeX - 1, flKneeY + 2); g.lineTo(flAnkleX - 1, flAnkleY - 2); g.strokePath();

    // Ankle joint (Gold)
    this.circ(g, flAnkleX, flAnkleY, 2.5, P.mGo);

    // Sabaton (Foot): white armor
    g.lineStyle(4, P.mPl3);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY); g.lineTo(flFootX, flFootY); g.strokePath();
    g.lineStyle(2, P.mPl2);
    g.beginPath(); g.moveTo(flAnkleX, flAnkleY + 0.5); g.lineTo(flFootX, flFootY); g.strokePath();
    
    // Gold claws
    this.tri(g, flFootX, flFootY, flFootX + 4, flFootY + 2, flFootX - 1, flFootY + 2, P.mGo);
    this.tri(g, flFootX - 2, flFootY - 1, flFootX - 4, flFootY + 2, flFootX - 1, flFootY + 2, P.mGo2);

    // ── 5. Gothic Pauldron (large white shoulder shield) ──
    const pauldronX = 20 + dx + tiltX;
    const pauldronY = 15 + dy + b + tiltY;

    // Large white shield-pauldron
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(pauldronX, pauldronY + 9);
    g.lineTo(pauldronX, pauldronY);
    g.lineTo(pauldronX + 13, pauldronY - 1);
    g.lineTo(pauldronX + 15, pauldronY + 3);
    g.lineTo(pauldronX + 11, pauldronY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(pauldronX + 1, pauldronY + 8);
    g.lineTo(pauldronX + 1, pauldronY + 1);
    g.lineTo(pauldronX + 12, pauldronY);
    g.lineTo(pauldronX + 14, pauldronY + 3);
    g.lineTo(pauldronX + 10, pauldronY + 9);
    g.closePath(); g.fillPath();

    // Crimson inlay design
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(pauldronX + 3, pauldronY + 3);
    g.lineTo(pauldronX + 10, pauldronY + 1);
    g.lineTo(pauldronX + 9, pauldronY + 6);
    g.lineTo(pauldronX + 3, pauldronY + 6);
    g.closePath(); g.fillPath();

    // Gold spikes
    this.tri(g, pauldronX + 11, pauldronY - 1, pauldronX + 16, pauldronY - 4, pauldronX + 13, pauldronY + 2, P.mGo);
    this.tri(g, pauldronX, pauldronY, pauldronX - 3, pauldronY - 2, pauldronX + 3, pauldronY, P.mGo);

    // ── 6. Neck ──
    const neckX = 23 + dx + tiltX;
    const neckY = 14 + dy + b + tiltY;
    g.lineStyle(3, P.mJo);
    g.beginPath(); g.moveTo(torsoX + 7, torsoY + 2); g.lineTo(neckX + 3, neckY + 3); g.strokePath();
    this.circ(g, neckX + 2, neckY + 3, 1.2, P.mGo);

    // ── 7. Guymelef Helmet (White yelmo, swept-back gold crest, green visor) ──
    const headX = 20 + dx + tiltX;
    const headY = 4 + dy + b + tiltY;

    // Outer helmet shape
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(headX - 1, headY + 12);
    g.lineTo(headX - 1, headY + 1);
    g.lineTo(headX + 9, headY - 1);
    g.lineTo(headX + 16, headY + 3);
    g.lineTo(headX + 16, headY + 7);
    g.lineTo(headX + 10, headY + 9);
    g.lineTo(headX + 11, headY + 11);
    g.lineTo(headX - 1, headY + 12);
    g.closePath(); g.fillPath();

    // Helmet main plate (white)
    g.fillStyle(P.mPl3);
    g.beginPath();
    g.moveTo(headX, headY + 11);
    g.lineTo(headX, headY + 2);
    g.lineTo(headX + 8, headY);
    g.lineTo(headX + 15, headY + 4);
    g.lineTo(headX + 15, headY + 7);
    g.lineTo(headX + 9, headY + 8);
    g.lineTo(headX + 10, headY + 10);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(headX + 1, headY + 10);
    g.lineTo(headX + 1, headY + 3);
    g.lineTo(headX + 7, headY + 1);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 10, headY + 7);
    g.closePath(); g.fillPath();

    // Crimson cheek plate
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(headX + 8, headY + 7);
    g.lineTo(headX + 13, headY + 5);
    g.lineTo(headX + 14, headY + 7);
    g.lineTo(headX + 9, headY + 9);
    g.closePath(); g.fillPath();

    // Visor: green horizontal slit
    g.fillStyle(P.mJo); g.fillRect(headX + 5, headY + 3.5, 7, 2.5);
    g.fillStyle(P.mEy); g.fillRect(headX + 6, headY + 4, 5, 1.5);
    g.fillStyle(P.mEy, 0.25); g.fillRect(headX + 4, headY + 3, 9, 3.5);

    // Swept-back crest horn (White/Gold, fits cleanly within Y >= 0)
    g.fillStyle(P.mPl2);
    g.beginPath();
    g.moveTo(headX + 3, headY + 1);
    g.lineTo(headX - 12, headY - 8); // much longer swept-back horn!
    g.lineTo(headX - 14, headY - 5);
    g.lineTo(headX + 1, headY + 3);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(headX + 1, headY + 2);
    g.lineTo(headX - 8, headY - 4);
    g.lineTo(headX - 9, headY - 2);
    g.lineTo(headX + 1, headY + 2.5);
    g.closePath(); g.fillPath();

    // ── 8. Sword Arm (white gauntlet) ──
    let armX = 30 + dx + tiltX;
    let armY = 25 + dy + b + tiltY;
    let swPhase = 0;

    if (isAttacking) {
      if (attackFrame === 1) { armX = 18 + dx + tiltX; armY = 16 + dy + b + tiltY; swPhase = 1; }
      else if (attackFrame === 2) { armX = 40 + dx + tiltX; armY = 28 + dy + b + tiltY; swPhase = 2; }
      else if (attackFrame === 3) { armX = 36 + dx + tiltX; armY = 32 + dy + b + tiltY; swPhase = 3; }
    }

    // Forearm (white stroke)
    g.lineStyle(5, P.mPl3);
    g.beginPath(); g.moveTo(armX, armY); g.lineTo(armX + 8, armY + 8); g.strokePath();
    g.lineStyle(3, P.mPl2);
    g.beginPath(); g.moveTo(armX, armY); g.lineTo(armX + 7, armY + 7); g.strokePath();

    // Elbow joint (Gold)
    this.circ(g, armX, armY, 2.5, P.mGo);
    this.circ(g, armX, armY, 1.2, P.mGo2);

    // Hand (Gold)
    this.circ(g, armX + 8, armY + 8, 2.0, P.mGo);

    // ── 9. Claymore ──
    if (swPhase === 1) {
      // Overhead windup
      g.fillStyle(P.mJo); g.fillRect(armX + 3, armY - 10, 4, 10); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 5, armY - 12, 20, 3); // Guard
      // Blade
      g.fillStyle(P.mPl1);
      g.beginPath();
      g.moveTo(armX + 1, armY - 12); g.lineTo(armX + 8, armY - 12);
      g.lineTo(armX + 8, armY - 68); g.lineTo(armX + 5, armY - 74);
      g.lineTo(armX + 2, armY - 68);
      g.closePath(); g.fillPath();
      g.fillStyle(P.mPl2); g.fillRect(armX + 4, armY - 66, 2, 54);
      this.circ(g, armX + 5, armY - 12, 2.5, P.mCo2);
    } else if (swPhase === 2) {
      // Heavy forward slash
      g.fillStyle(P.mJo); g.fillRect(armX + 8, armY + 6, 12, 4); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX + 6, armY, 3, 20); // Guard
      // Blade
      g.fillStyle(P.mPl1);
      g.beginPath();
      g.moveTo(armX + 11, armY + 1); g.lineTo(armX + 11, armY + 9);
      g.lineTo(armX + 70, armY + 9); g.lineTo(armX + 76, armY + 5);
      g.lineTo(armX + 70, armY + 1);
      g.closePath(); g.fillPath();
      g.fillStyle(P.mPl2); g.fillRect(armX + 12, armY + 3, 56, 3);
      this.circ(g, armX + 9, armY + 5, 2.5, P.mCo2);
    } else if (swPhase === 3) {
      // Recovery blade down
      g.fillStyle(P.mJo); g.fillRect(armX + 2, armY + 8, 4, 8); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 5, armY + 6, 18, 3); // Guard
      g.fillStyle(P.mPl1); g.fillRect(armX + 2, armY + 9, 6, 44);
      g.fillStyle(P.mPl2); g.fillRect(armX + 4, armY + 11, 2, 40);
    } else {
      // Idle: claymore resting on shoulder, blade pointing up-back
      g.fillStyle(P.mJo); g.fillRect(armX - 2, armY - 6, 4, 8); // Hilt
      g.fillStyle(P.mGo); g.fillRect(armX - 8, armY - 8, 18, 3); // Wide guard!
      // White Blade (longer: 56px long)
      g.fillStyle(P.mPl3);
      g.beginPath();
      g.moveTo(armX - 4, armY - 8); g.lineTo(armX + 4, armY - 8);
      g.lineTo(armX + 4, armY - 60); g.lineTo(armX, armY - 66);
      g.lineTo(armX - 4, armY - 60);
      g.closePath(); g.fillPath();
      
      g.fillStyle(P.mPl2);
      g.beginPath();
      g.moveTo(armX - 2.5, armY - 8); g.lineTo(armX + 2.5, armY - 8);
      g.lineTo(armX + 2.5, armY - 58); g.lineTo(armX, armY - 63);
      g.lineTo(armX - 2.5, armY - 58);
      g.closePath(); g.fillPath();

      // Central glowing ruby channel
      g.fillStyle(P.mJo); g.fillRect(armX - 0.5, armY - 50, 1, 40);
      g.fillStyle(P.mRd3); g.fillRect(armX - 0.5, armY - 35, 1, 15); // glowing ruby core line
      this.circ(g, armX, armY - 8, 2.5, P.mCo2);
    }

    this.tex(g, key, 128, 128);
  }

  // ═══════════════════════════════════════
  //  DRAGON FRAMES — 96×72, HEAD ON RIGHT
  // ═══════════════════════════════════════

  private genDragonFrames(): void {
    // 4 wing flapping frames, using flapPhase (0 to 2*PI) to animate chest core pulse
    this.drawDragonFrame('d-fly-0', -6, 0);
    this.drawDragonFrame('d-fly-1', -1, Math.PI / 4);
    this.drawDragonFrame('d-fly-2', 4, Math.PI / 2);
    this.drawDragonFrame('d-fly-3', -1, 3 * Math.PI / 4);

    // Default
    this.drawDragonFrame('player-dragon', 0, 0);
  }

  private drawDragonFrame(key: string, wingY: number, flapPhase: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const P = this.P;

    // Dragon size is 96x72. Head on the right side (default facing).

    // ── 1. Serpentine Tail & Spikes (Whip-like, left side) ──
    const tailBob = Math.sin(flapPhase) * 2.5;
    g.fillStyle(P.mJo); // Segment 1 (Base)
    g.beginPath(); g.moveTo(24, 38); g.lineTo(24, 44); g.lineTo(18, 42 + tailBob * 0.3); g.lineTo(18, 38); g.closePath(); g.fillPath();
    this.circ(g, 18, 40 + tailBob * 0.3, 3, P.mGo); // joint
    // Spine spike on tail segment 1
    this.tri(g, 21, 38 + tailBob * 0.15, 18, 29 + tailBob * 0.15, 23, 37 + tailBob * 0.15, P.mRd2);

    g.fillStyle(P.mPl3); // Segment 2 (Mid)
    g.beginPath(); g.moveTo(18, 40 + tailBob * 0.3); g.lineTo(12, 42 + tailBob * 0.6); g.lineTo(12, 39 + tailBob * 0.6); g.lineTo(18, 37 + tailBob * 0.3); g.closePath(); g.fillPath();
    this.circ(g, 12, 41 + tailBob * 0.6, 2.5, P.mGo); // joint
    // Spine spike on tail segment 2
    this.tri(g, 15, 38 + tailBob * 0.45, 12, 31 + tailBob * 0.45, 17, 37 + tailBob * 0.45, P.mGo);

    g.fillStyle(P.mPl1); // Segment 3 (Tip)
    g.beginPath(); g.moveTo(12, 41 + tailBob * 0.6); g.lineTo(6, 43 + tailBob); g.lineTo(6, 40 + tailBob); g.lineTo(12, 38 + tailBob * 0.6); g.closePath(); g.fillPath();
    this.circ(g, 6, 42 + tailBob, 2.0, P.mGo);
    // Spine spike on tail segment 3
    this.tri(g, 9, 39 + tailBob * 0.8, 6, 33 + tailBob * 0.8, 11, 38 + tailBob * 0.8, P.mRd2);

    // Whip blade tip: Large mechanical crescent scythe blade
    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(6, 42 + tailBob);
    g.lineTo(-6, 46 + tailBob + Math.sin(flapPhase * 1.5) * 2);
    g.lineTo(-12, 35 + tailBob); // blade point
    g.lineTo(-2, 38 + tailBob);
    g.closePath(); g.fillPath();
    this.tri(g, -2, 38 + tailBob, -12, 35 + tailBob, -4, 33 + tailBob, P.mGo);

    // ── 2. Back Leg & Hanging Claw (Skeletal mecha talon) ──
    // Thigh
    g.fillStyle(P.mPl3);
    g.beginPath(); g.moveTo(32, 44); g.lineTo(26, 52); g.lineTo(22, 52); g.lineTo(28, 44); g.closePath(); g.fillPath();
    // Knee joint
    this.circ(g, 24, 52, 2.5, P.mGo);
    // Shin
    g.fillStyle(P.mJo);
    g.beginPath(); g.moveTo(24, 52); g.lineTo(20, 60); g.lineTo(16, 58); g.lineTo(22, 52); g.closePath(); g.fillPath();
    // Claw talons
    this.tri(g, 20, 60, 24, 66, 22, 59, P.mGo);
    this.tri(g, 17, 59, 14, 65, 19, 58, P.mPl3);
    this.tri(g, 16, 58, 18, 63, 17, 58, P.mGo2);

    // ── 3. Torso & Dorsal Spine Spikes ──
    g.fillStyle(P.mJo); // inner frame
    g.beginPath();
    g.moveTo(24, 38); g.lineTo(26, 32); g.lineTo(44, 30); g.lineTo(58, 32); g.lineTo(62, 36); g.lineTo(60, 44); g.lineTo(44, 46); g.lineTo(24, 44);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl1); // outer white plates
    g.beginPath();
    g.moveTo(26, 34); g.lineTo(44, 32); g.lineTo(56, 34); g.lineTo(58, 42); g.lineTo(44, 44); g.lineTo(26, 42);
    g.closePath(); g.fillPath();

    // Dorsal spine spikes pointing up-back
    this.tri(g, 30, 32, 25, 23, 34, 31, P.mGo);
    this.tri(g, 40, 30, 35, 21, 44, 30, P.mRd2);
    this.tri(g, 50, 31, 45, 22, 54, 31, P.mGo);

    // Crimson accent panels inside body
    g.fillStyle(P.mRd2);
    g.beginPath();
    g.moveTo(32, 35); g.lineTo(48, 34); g.lineTo(52, 40); g.lineTo(34, 41);
    g.closePath(); g.fillPath();

    // Red/Pink Energist Chest Core (pulsing glow)
    const pulseFactor = Math.abs(Math.sin(flapPhase * 2));
    const pulseCol = pulseFactor > 0.6 ? P.mCo2 : P.mCo1;
    g.fillStyle(P.mJo, 0.6); g.fillCircle(44, 38, 9);
    this.circ(g, 44, 38, 6.5, pulseCol);
    this.circ(g, 44, 38, 4.0, 0xff77aa);
    this.circ(g, 44, 38, 1.5, 0xffffff);

    // ── 4. Front Leg & Hanging Claw (Skeletal mecha talon) ──
    // Thigh
    g.fillStyle(P.mPl1);
    g.beginPath(); g.moveTo(46, 44); g.lineTo(54, 52); g.lineTo(50, 52); g.lineTo(42, 44); g.closePath(); g.fillPath();
    // Knee joint
    this.circ(g, 52, 52, 2.5, P.mGo);
    // Shin
    g.fillStyle(P.mJo);
    g.beginPath(); g.moveTo(51, 52); g.lineTo(47, 60); g.lineTo(43, 58); g.lineTo(49, 52); g.closePath(); g.fillPath();
    // Claw talons
    this.tri(g, 47, 60, 52, 66, 49, 59, P.mGo);
    this.tri(g, 44, 59, 41, 65, 46, 58, P.mPl1);
    this.tri(g, 43, 58, 46, 63, 45, 58, P.mGo2);

    // ── 5. Arched Serpentine Neck & Neck Spikes ──
    g.fillStyle(P.mJo); // structure
    g.beginPath(); g.moveTo(56, 38); g.lineTo(66, 24); g.lineTo(76, 27); g.lineTo(74, 34); g.lineTo(60, 44); g.closePath(); g.fillPath();
    g.fillStyle(P.mPl1); // plates
    g.beginPath(); g.moveTo(58, 37); g.lineTo(65, 26); g.lineTo(74, 28); g.lineTo(73, 33); g.lineTo(60, 41); g.closePath(); g.fillPath();
    g.fillStyle(P.mRd2); // crimson neck stripe
    g.beginPath(); g.moveTo(60, 35); g.lineTo(67, 27); g.lineTo(68, 29); g.lineTo(61, 36); g.closePath(); g.fillPath();
    // Gold hydraulic tube
    g.lineStyle(1.5, P.mGo); g.beginPath(); g.moveTo(58, 39); g.lineTo(65, 30); g.lineTo(74, 31); g.strokePath();
    // Neck Spikes (dorsal)
    this.tri(g, 62, 27, 64, 18, 67, 25, P.mGo);
    this.tri(g, 68, 25, 71, 16, 74, 23, P.mGo);

    // ── 6. Dragon Head (Open jaws, fangs, swept horns, cyan visor) ──
    // Top skull snout
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(76, 28); g.lineTo(74, 18); g.lineTo(84, 18); g.lineTo(94, 25); g.lineTo(84, 29); g.lineTo(76, 32);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mPl1); // white outer plating
    g.beginPath();
    g.moveTo(77, 27); g.lineTo(75, 19); g.lineTo(83, 19); g.lineTo(92, 25); g.lineTo(83, 28); g.lineTo(77, 31);
    g.closePath(); g.fillPath();

    // Crimson nose plate
    this.tri(g, 84, 19, 90, 24, 83, 27, P.mRd2);

    // Sharp glowing green/cyan visor slitting back
    g.fillStyle(P.mJo); g.fillRect(78, 21, 7, 2);
    g.fillStyle(P.mEy); g.fillRect(79, 21.5, 5, 1.0);

    // Fangs on upper snout
    this.tri(g, 86, 28, 88, 33, 90, 27, P.mGo);
    this.tri(g, 91, 25, 92, 29, 93, 25, P.mGo);

    // Lower open jaw
    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(78, 33); g.lineTo(84, 31); g.lineTo(90, 31); g.lineTo(84, 36); g.lineTo(78, 35);
    g.closePath(); g.fillPath();
    
    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(79, 34); g.lineTo(84, 32); g.lineTo(88, 32); g.lineTo(84, 35);
    g.closePath(); g.fillPath();
    // Fangs on lower jaw
    this.tri(g, 85, 32, 86, 29, 87, 32, P.mGo);

    // Massive Swept-back Golden Crest Horns
    // Horn 1 (Large upper - curves back-left)
    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(74, 18); g.lineTo(54, 8); g.lineTo(52, 11); g.lineTo(72, 22);
    g.closePath(); g.fillPath();
    // Horn 2 (Small lower - curves back-left)
    g.fillStyle(P.mGo2);
    g.beginPath();
    g.moveTo(75, 21); g.lineTo(58, 14); g.lineTo(57, 16); g.lineTo(74, 24);
    g.closePath(); g.fillPath();

    // ── 7. Biomechanical Wings ──
    g.fillStyle(P.mRd1, 0.5); // outer soft energy red shadow
    g.beginPath();
    g.moveTo(42, 30 + wingY); g.lineTo(2, 6 + wingY); g.lineTo(-6, 16 + wingY); g.lineTo(32, 40 + wingY);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mRd2, 0.85); // glowing red membrane
    g.beginPath();
    g.moveTo(42, 30 + wingY); g.lineTo(4, 8 + wingY); g.lineTo(-2, 16 + wingY); g.lineTo(34, 38 + wingY);
    g.closePath(); g.fillPath();

    // White mecha wing struts (structural bone-metal)
    g.lineStyle(2.5, P.mPl1);
    g.beginPath(); g.moveTo(42, 31 + wingY); g.lineTo(6, 10 + wingY); g.strokePath();
    g.beginPath(); g.moveTo(42, 35 + wingY); g.lineTo(16, 20 + wingY); g.strokePath();
    g.lineStyle(1.5, P.mGo); // gold mechanical accents on wings
    g.beginPath(); g.moveTo(40, 38 + wingY); g.lineTo(24, 26 + wingY); g.strokePath();

    // Gold bolt accents on torso plates
    this.circ(g, 30, 36, 1.2, P.mGo);
    this.circ(g, 54, 36, 1.2, P.mGo);

    this.tex(g, key, 96, 72);
  }

  // ═══ SENTINEL 32×32 ═══
  private drawSentinel(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x220044);
    g.beginPath(); g.moveTo(16, 0); g.lineTo(28, 10); g.lineTo(30, 20);
    g.lineTo(26, 30); g.lineTo(16, 32); g.lineTo(6, 30);
    g.lineTo(2, 20); g.lineTo(4, 10); g.closePath(); g.fillPath();
    g.fillStyle(0x441166);
    g.beginPath(); g.moveTo(16, 8); g.lineTo(22, 16); g.lineTo(16, 24); g.lineTo(10, 16);
    g.closePath(); g.fillPath();
    g.fillStyle(0x110022); g.fillCircle(16, 16, 4);
    g.fillStyle(0xcc44ff); g.fillCircle(16, 16, 2.5);
    g.fillStyle(0xff88ff); g.fillCircle(16, 16, 1.2);
    g.fillStyle(0xffffff); g.fillCircle(16, 15, 0.5);
    this.tex(g, 'enemy-sentry', 32, 32);
  }

  // ═══ BOSS 128×128 ═══
  private drawBoss(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // tail (left)
    this.rect(g, 0, 70, 30, 10, 3, 0x110a14);
    this.tri(g, 4, 54, 0, 46, 8, 64, 0x442244);
    this.tri(g, 8, 52, 2, 44, 10, 62, 0x442244);
    // back leg
    this.rect(g, 40, 78, 14, 28, 3, 0x1a0a20);
    this.rect(g, 42, 82, 10, 22, 2, 0x2a1133);
    g.fillStyle(0x663355); g.fillCircle(46, 104, 5);
    // body
    this.rect(g, 28, 52, 66, 42, 5, 0x110a14);
    this.rect(g, 32, 56, 58, 34, 4, 0x1a0f22);
    this.rect(g, 36, 60, 50, 5, 2, 0x2a1533);
    this.rect(g, 38, 68, 46, 5, 2, 0x331840);
    // core
    g.fillStyle(0x000000); g.fillCircle(60, 74, 12);
    g.fillStyle(0xff1166, 0.2); g.fillCircle(60, 74, 10);
    g.fillStyle(0xff2266); g.fillCircle(60, 74, 7);
    g.fillStyle(0xff4488); g.fillCircle(60, 74, 4);
    g.fillStyle(0xffaacc); g.fillCircle(60, 74, 2);
    g.fillStyle(0xffffff); g.fillCircle(60, 73, 0.8);
    // front leg
    this.rect(g, 74, 78, 14, 28, 3, 0x1a0f22);
    this.rect(g, 76, 82, 10, 22, 2, 0x221133);
    g.fillStyle(0x663355); g.fillCircle(80, 104, 5);
    // neck
    this.rect(g, 78, 38, 24, 22, 4, 0x110a14);
    this.rect(g, 80, 42, 20, 16, 3, 0x1a0f22);
    // head (right side)
    this.rect(g, 92, 14, 36, 32, 6, 0x110a14);
    this.rect(g, 96, 18, 28, 26, 4, 0x1a0f22);
    this.rect(g, 114, 24, 14, 12, 3, 0x2a1533);
    this.rect(g, 115, 26, 12, 8, 2, 0x1a0f22);
    // crown
    for (let i = 0; i < 8; i++) {
      const sx = 98 + i * 4;
      g.fillStyle(0x331133); g.fillTriangle(sx, 0, sx + 2, 12, sx + 5, 2);
    }
    // eyes
    g.fillStyle(0x000000); g.fillCircle(102, 22, 4);
    g.fillStyle(0xff2288); g.fillCircle(102, 22, 3);
    g.fillStyle(0xffffff); g.fillCircle(103, 22, 0.8);
    g.fillStyle(0x000000); g.fillCircle(114, 22, 4);
    g.fillStyle(0xff2288); g.fillCircle(114, 22, 3);
    g.fillStyle(0xffffff); g.fillCircle(115, 22, 0.8);
    // arms
    this.rect(g, 14, 66, 12, 32, 3, 0x1a0a20);
    this.rect(g, 16, 70, 8, 26, 2, 0x2a1133);
    g.fillStyle(0x551144); g.fillTriangle(10, 96, 16, 98, 13, 108);
    g.fillStyle(0x551144); g.fillTriangle(20, 96, 26, 98, 23, 108);
    this.tex(g, 'boss', 128, 128);
  }

  // ═══ TILES ═══
  private drawTiles(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x151210); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x1c1715); g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x0e0c0a); g.fillRect(0, 28, 32, 4);
    g.fillStyle(0x0a0907, 0.5); g.fillRect(8, 6, 4, 3);
    g.fillStyle(0x182420, 0.6); g.fillCircle(16, 4, 2);
    this.tex(g, 'tile-ground', 32, 32);

    g.fillStyle(0x1c1812); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x2a241a); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x110e08); g.fillRect(0, 14, 32, 2);
    this.tex(g, 'tile-platform', 32, 16);
  }

  // ═══ DRAGON CORE 16×16 ═══
  private drawDragonCore(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 3, 0, 10, 14, 2, 0x3a4a5a);
    this.rect(g, 4, 1, 8, 12, 2, 0x4a5a6a);
    this.rect(g, 5, 2, 6, 10, 1, 0x0a0505);
    this.circ(g, 8, 6, 2.5, 0xff4400);
    this.circ(g, 8, 6, 1.5, 0xff8800);
    this.circ(g, 8, 6, 0.6, 0xffcc00);
    this.tri(g, 6, 0, 10, 0, 8, -2, 0x5a6a7a);
    this.tex(g, 'dragon-core', 16, 16);
  }

  // ═══ BARRICADE 32×64 ═══
  private drawBarricade(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    // Main stone block
    this.rect(g, 0, 0, 32, 64, 4, 0x222226);
    this.rect(g, 2, 2, 28, 60, 2, 0x33333a);
    // Gold brackets
    this.rect(g, 0, 10, 32, 6, 1, 0x6b5a20);
    this.rect(g, 0, 48, 32, 6, 1, 0x6b5a20);
    // Rivets
    g.fillStyle(0x000000);
    g.fillCircle(6, 13, 1.5);
    g.fillCircle(26, 13, 1.5);
    g.fillCircle(6, 51, 1.5);
    g.fillCircle(26, 51, 1.5);
    // Cracks
    g.lineStyle(1.2, 0x111115, 0.8);
    g.beginPath();
    g.moveTo(6, 20); g.lineTo(14, 28); g.lineTo(10, 36); g.lineTo(18, 44);
    g.moveTo(26, 25); g.lineTo(20, 32); g.lineTo(24, 40);
    g.strokePath();
    this.tex(g, 'barricade', 32, 64);
  }

  // ═══ FIRE BULLET 16×8 ═══
  private drawFireBullet(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 0, 0, 16, 8, 2, 0xcc3300);
    this.rect(g, 2, 1, 14, 6, 1, 0xff5500);
    this.rect(g, 5, 1, 10, 5, 1, 0xff8800);
    this.rect(g, 8, 2, 7, 3, 0.5, 0xffcc00);
    g.fillStyle(0xffffff); g.fillCircle(15, 4, 1);
    this.tex(g, 'bullet-fire', 16, 8);
  }

  // ═══ SWORD SLASH 56×24 ═══
  private drawSwordSlash(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const W = 56, H = 24;
    const layers = [
      { a: 0.25, c: 0x330808, mul: 12 },
      { a: 0.55, c: 0x882020, mul: 10 },
      { a: 0.8, c: 0xcc3333, mul: 7 },
      { a: 0.95, c: 0xff6644, mul: 3 },
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, 12);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, 12 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, 12 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    g.fillStyle(0xff6644); g.fillCircle(3, 12, 1.5); g.fillCircle(53, 12, 1.5);
    this.tex(g, 'sword-slash', W, H);
  }

  // ═══ HEAVY SWORD SLASH 96×40 ═══
  private drawSwordSlashHeavy(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    const W = 96, H = 40;
    const layers = [
      { a: 0.25, c: 0x660022, mul: 20 },
      { a: 0.55, c: 0xd61a1a, mul: 16 },
      { a: 0.8, c: 0xff0066, mul: 12 },
      { a: 0.95, c: 0xffffff, mul: 6 },
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, H / 2);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    g.fillStyle(0xffffff); g.fillCircle(3, H / 2, 2.5); g.fillCircle(W - 4, H / 2, 2.5);
    this.tex(g, 'sword-slash-heavy', W, H);
  }

  // ═══ DESTINY CARD 20×28 ═══
  private drawDestinyCard(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.rect(g, 0, 0, 20, 28, 2, 0x1a1008);
    this.rect(g, 1, 1, 18, 26, 2, 0x2a1a0d);
    this.rect(g, 2, 2, 16, 24, 1, 0x110804);
    g.fillStyle(0x887744); g.fillCircle(10, 8, 2);
    g.fillStyle(0xccaa66); g.fillTriangle(8, 8, 12, 8, 10, 5);
    g.fillStyle(0xffcc00); g.fillCircle(10, 16, 1.5);
    this.tex(g, 'destiny-echo', 20, 28);
  }

  // ═══ SHADOW 36×12 ═══
  private drawShadow(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(18, 6, 36, 12);
    this.tex(g, 'shadow', 36, 12);
  }

  // ═══ BACKGROUNDS ═══
  private drawBackgrounds(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    for (let y = 0; y < 480; y++) {
      const t = y / 480;
      g.fillStyle(((Math.floor(5 + t * 5)) << 16) | ((Math.floor(3 + t * 4)) << 8) | Math.floor(12 + t * 6));
      g.fillRect(0, y, 960, 1);
    }
    for (let i = 0; i < 150; i++) {
      const sx = Phaser.Math.Between(0, 959), sy = Phaser.Math.Between(0, 320);
      const b = Math.random();
      g.fillStyle(b > 0.85 ? 0x8899bb : b > 0.6 ? 0x556677 : b > 0.3 ? 0x445566 : 0x334455);
      g.fillCircle(sx, sy, b > 0.6 ? 0.7 : 0.4);
    }
    this.tex(g, 'bg-sky', 960, 480);

    g.fillStyle(0x05070f); g.fillRect(0, 0, 960, 140);
    for (let x = 0; x < 960; x++) {
      const h = 12 + Math.sin(x * 0.006 + 0.5) * 26 + Math.sin(x * 0.012 + 1) * 18 + Math.sin(x * 0.004 + 2.5) * 35;
      g.fillStyle(0x0d1220);
      for (let y = 140 - h; y < 140; y++) g.fillRect(x, y, 1, 1);
    }
    this.tex(g, 'bg-mountains', 960, 140);

    g.fillStyle(0x05070f); g.fillRect(0, 0, 960, 100);
    [30, 110, 190, 280, 360, 440, 530, 610, 700, 770, 850, 920].forEach(tx => {
      const th = Phaser.Math.Between(30, 65), tw = Phaser.Math.Between(5, 12);
      g.fillStyle(0x0e1322);
      g.beginPath(); g.moveTo(tx - tw / 2, 100); g.lineTo(tx, 100 - th); g.lineTo(tx + tw / 2, 100); g.closePath();
      g.fillPath();
    });
    this.tex(g, 'bg-forest', 960, 100);

    g.fillStyle(0x05070f); g.fillRect(0, 0, 960, 80);
    [40, 190, 320, 460, 590, 720, 840, 915].forEach(rx => {
      const rh = Phaser.Math.Between(25, 60), rw = Phaser.Math.Between(8, 16);
      g.fillStyle(0x162030); g.fillRect(rx, 80 - rh, rw, rh);
    });
    this.tex(g, 'bg-ruins', 960, 80);
  }

  // ═══ PARTICLES ═══
  private drawParticles(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.circ(g, 4, 4, 3.5, 0xff4400); this.circ(g, 4, 3, 2.5, 0xff6600); this.circ(g, 4, 3, 1.5, 0xffaa00);
    this.tex(g, 'particle-fire', 8, 8);
    this.circ(g, 4, 4, 3.5, 0x443333); this.circ(g, 4, 3, 2.5, 0x554444);
    this.tex(g, 'particle-smoke', 8, 8);
    this.circ(g, 2, 2, 2, 0xffcc00); this.circ(g, 1.5, 1.5, 0.8, 0xffffff);
    this.tex(g, 'particle-spark', 4, 4);
    this.circ(g, 2, 2, 2, 0xff5500); this.circ(g, 1.5, 1.5, 1, 0xff8800);
    this.tex(g, 'particle-ember', 4, 4);
  }
}
