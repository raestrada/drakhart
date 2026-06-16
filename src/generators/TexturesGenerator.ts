import Phaser from 'phaser';

export class TexturesGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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
  private ditherRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, col: number): void {
    g.fillStyle(col);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if ((dx + dy) % 2 === 0) {
          g.fillRect(x + dx, y + dy, 1, 1);
        }
      }
    }
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

  public generate(): void {
    this.genWarriorFrames();
    this.genMechaFrames();
    this.genDragonFrames();
    this.drawShadowWraith();
    this.drawShieldEnemy();
    this.drawSpitterEnemy();
    this.drawLeaperEnemy();
    this.drawBoss();
    this.drawTerrainTextures();

    // Level 2 Refinery Tiles
    this.drawRefineryTile();
    this.drawLavaGround();
    this.drawRefineryLavaTile();
    this.drawSteamVent();
    this.drawCoolValve();
    this.drawMechaEnemy();
    this.drawMechaGraveyardBg();
    this.drawDestroyedMechaA();
    this.drawDestroyedMechaB();
    this.drawThrusterBarrier();

    // Bush small (procedural only)
    this.drawBush();

    // Bush large (procedural only)
    this.drawLargeBush();

    // Rock destructible (procedural only)
    this.drawDestructibleRock();

    // Rock large (procedural only)
    this.drawLargeRockProcedural();

    // Red moon
    if (this.scene.textures.exists('bg-moon-raw')) {
      this.keyOutBlackAndScale('bg-moon-raw', 'bg-moon', 160, 160);
    } else {
      this.drawRedMoon();
    }

    // Castle silhouette
    if (this.scene.textures.exists('bg-castle-raw')) {
      this.keyOutBlackAndScale('bg-castle-raw', 'bg-castle', 384, 384);
    } else {
      this.drawCastleSilhouette();
    }

    // Refinery support images (un-tiled backdrops)
    if (this.scene.textures.exists('bg-refinery-sun-raw')) {
      this.keyOutBlackAndScale('bg-refinery-sun-raw', 'image-refinery-sun', 240, 240);
    }
    if (this.scene.textures.exists('bg-furnace-raw')) {
      this.keyOutBlackAndScale('bg-furnace-raw', 'image-furnace', 384, 384);
    }
    if (this.scene.textures.exists('bg-furnace-pipes-raw')) {
      this.keyOutBlackAndScale('bg-furnace-pipes-raw', 'image-furnace-pipes', 384, 384);
    }

    // Procedural background layers for Level 2 (Smelting Refinery)
    this.drawRefinerySky();
    this.drawRefineryFurnaces();
    this.drawRefineryStructures();

    // Procedural decorative props for Level 1, 2, and 3
    this.drawVisualProps();

    // Level 3 Gorge background layers (rendered procedurally)
    this.drawGorgeWalls();
    this.drawGorgeStructures();

    // Level 3 single reactor core backdrop support image
    if (this.scene.textures.exists('bg-gorge-reactor-raw')) {
      this.keyOutBlackAndScale('bg-gorge-reactor-raw', 'bg-gorge-reactor', 384, 384);
    }

    this.drawDragonCore();
    this.drawEnergyPickup();
    this.drawSkyCore();
    this.drawBarricade();
    this.drawFireBullet();
    this.drawSwordSlash();
    this.drawSwordSlashHeavy();
    this.drawDestinyCard();
    this.drawShadow();
    this.drawTwinkleStar();
    this.drawMoonGlow();
    this.drawForegroundElements();
    this.drawBackgrounds();
    this.drawParticles();
    this.drawZone3Hazards();
    this.drawZone3Enemies();
    this.drawAltarSave();
  }

  // ═══════════════════════════════════════
  //  WARRIOR FRAMES — 48×72 (Draconus Dark Knight)
  // ═══════════════════════════════════════

  private genWarriorFrames(): void {
    this.drawWarrior('h-idle-0', 0, 0, 0, 0, 'none');
    this.drawWarrior('h-idle-1', 0, -1, 1, 0, 'none');
    this.drawWarrior('h-idle-2', 0, -2, 2, 0, 'none');
    this.drawWarrior('h-idle-3', 0, -1, 1, 0, 'none');
    this.drawWarrior('h-idle-4', 0, -0, 0, 0, 'none');

    this.drawWarrior('h-walk-0', 4, 0, -2, 0, 'none');
    this.drawWarrior('h-walk-1', 1, -1, -1, 0, 'none');
    this.drawWarrior('h-walk-2', -4, 0, 2, 0, 'none');
    this.drawWarrior('h-walk-3', -1, -1, 1, 0, 'none');
    this.drawWarrior('h-walk-4', 3, -1, -1, 0, 'none');
    this.drawWarrior('h-walk-5', -2, -1, -2, 0, 'none');

    this.drawWarrior('h-jump', 0, -2, 0, 0, 'jump');
    this.drawWarrior('h-fall', 0, 2, 3, 0, 'fall');

    this.drawWarrior('h-attack-0', 1, 0, 0, 1, 'none');
    this.drawWarrior('h-attack-1', 3, 1, 0, 2, 'none');
    this.drawWarrior('h-attack-2', 0, 0, 0, 3, 'none');

    this.drawWarrior('player-human', 0, 0, 0, 0, 'none');
    this.drawWarriorKneeling('h-kneeling');
  }

  private drawWarriorKneeling(key: string): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const dx = 24;
    const dyBody = 24 + 10; // 34 for head/torso (lower kneeling height)
    const dyLegs = 24;      // 24 for legs/cape/blade tip (standard floor height)

    // Cape (starts at torso, hangs down to ground)
    g.fillStyle(P.wCa1);
    g.beginPath();
    g.moveTo(10 + dx, 22 + dyBody);
    g.lineTo(2 + dx, 60 + dyLegs);
    g.lineTo(0 + dx, 66 + dyLegs);
    g.lineTo(16 + dx, 60 + dyLegs);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wCa2);
    g.beginPath();
    g.moveTo(11 + dx, 24 + dyBody);
    g.lineTo(4 + dx, 58 + dyLegs);
    g.lineTo(2 + dx, 63 + dyLegs);
    g.lineTo(16 + dx, 57 + dyLegs);
    g.closePath(); g.fillPath();

    // Kneeling legs
    g.lineStyle(5, P.wSt1);
    g.beginPath(); g.moveTo(14 + dx, 38 + dyLegs); g.lineTo(16 + dx, 48 + dyLegs); g.lineTo(6 + dx, 56 + dyLegs); g.strokePath();
    g.lineStyle(4, P.wSt2);
    g.beginPath(); g.moveTo(6 + dx, 56 + dyLegs); g.lineTo(0 + dx, 56 + dyLegs); g.strokePath();

    g.lineStyle(5, P.wSt2);
    g.beginPath(); g.moveTo(18 + dx, 38 + dyLegs); g.lineTo(22 + dx, 48 + dyLegs); g.lineTo(10 + dx, 56 + dyLegs); g.strokePath();
    g.lineStyle(4, P.wSt3);
    g.beginPath(); g.moveTo(10 + dx, 56 + dyLegs); g.lineTo(4 + dx, 56 + dyLegs); g.strokePath();

    // Torso
    const torsoX = 12 + dx;
    const torsoY = 22 + dyBody;
    const torsoW = 16;
    const torsoH = 18;

    g.fillStyle(P.wSt1);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW - 3, torsoY + 4);
    g.lineTo(torsoX + torsoW + 1, torsoY + 9);
    g.lineTo(torsoX + torsoW - 3, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt2);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW - 4, torsoY + 5);
    g.lineTo(torsoX + torsoW, torsoY + 9);
    g.lineTo(torsoX + torsoW - 4, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.wSt3);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 6, torsoY + 6);
    g.lineTo(torsoX + torsoW - 4, torsoY + 9);
    g.lineTo(torsoX + torsoW - 6, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 3);
    g.closePath(); g.fillPath();

    // Head
    const headX = 24 + dx;
    const headY = 16 + dyBody;

    g.fillStyle(P.wH3);
    g.beginPath(); g.moveTo(headX - 6, headY - 4); g.lineTo(headX - 14, headY - 8); g.lineTo(headX - 8, headY - 2); g.closePath(); g.fillPath();
    g.fillStyle(P.wH1);
    g.beginPath(); g.moveTo(headX - 5, headY - 5); g.lineTo(headX - 11, headY - 8); g.lineTo(headX - 7, headY - 3); g.closePath(); g.fillPath();

    this.circ(g, headX, headY, 6, P.wSt1);
    this.circ(g, headX, headY, 5, P.wSt2);

    g.fillStyle(P.wBr2);
    g.beginPath(); g.moveTo(headX + 2, headY); g.lineTo(headX + 5, headY + 2); g.lineTo(headX + 3, headY + 4); g.closePath(); g.fillPath();

    // Sword (Grip & Guard shifted to match torso, blade sticking into ground at dyLegs)
    g.fillStyle(P.wBr1);
    g.fillRect(35 + dx, 22 + dyBody, 3, 10);
    this.circ(g, 36.5 + dx, 22 + dyBody, 2.5, P.wSt1);
    g.fillStyle(P.wSt1);
    g.fillRect(29 + dx, 32 + dyBody, 15, 3);
    
    // Blade reaches the floor perfectly
    g.fillStyle(0xdcdde1);
    g.fillRect(34 + dx, 35 + dyBody, 5, 24);
    g.fillStyle(0xffffff);
    g.fillRect(36 + dx, 35 + dyBody, 1, 24);

    // Arm reaching to grab hilt
    g.lineStyle(4, P.wSt1);
    g.beginPath(); g.moveTo(16 + dx, 22 + dyBody); g.lineTo(28 + dx, 26 + dyBody); g.lineTo(36 + dx, 28 + dyBody); g.strokePath();
    g.lineStyle(3, P.wSt3);
    g.beginPath(); g.moveTo(16 + dx, 22 + dyBody); g.lineTo(28 + dx, 26 + dyBody); g.lineTo(35 + dx, 28 + dyBody); g.strokePath();

    this.tex(g, key, 96, 96);
  }

  private drawWarrior(
    key: string,
    legShift: number,
    bodyBob: number,
    capeShift: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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
      // Overhead windup (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX - 2, armY - 4, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 7, armY - 1, 14, 3);          // guard
      g.fillStyle(P.wBl1); g.fillRect(armX - 2, armY - 37, 6, 36);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX - 1, armY - 35, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 0.25, armY - 31, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX - 2, armY - 37); g.lineTo(armX + 1, armY - 42); g.lineTo(armX + 4, armY - 37); g.closePath(); g.fillPath(); // blade tip
    } else if (swPhase === 2) {
      // Heavy forward slash (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 3, armY, 6, 4, 1);    // hilt
      g.fillStyle(P.wGo); g.fillRect(armX + 9, armY - 5, 3, 14);          // guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 12, armY - 1, 36, 6);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX + 14, armY, 34, 4);            // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 18, armY + 1.25, 26, 1.5); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 48, armY - 1); g.lineTo(armX + 53, armY + 2); g.lineTo(armX + 48, armY + 5); g.closePath(); g.fillPath(); // blade tip
    } else if (swPhase === 3) {
      // Recovery blade down (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 3, armY + 4, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 2, armY + 10, 14, 3);         // guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 2, armY + 13, 6, 36);         // blade base
      g.fillStyle(P.wBl2); g.fillRect(armX + 3, armY + 15, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 4.25, armY + 19, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
      g.beginPath(); g.moveTo(armX + 2, armY + 49); g.lineTo(armX + 5, armY + 54); g.lineTo(armX + 8, armY + 49); g.closePath(); g.fillPath(); // blade tip
    } else {
      // Idle / Default stance (longer blade: 36px)
      g.fillStyle(P.wLe1); g.fillRoundedRect(armX + 2, armY - 2, 4, 6, 1); // hilt
      g.fillStyle(P.wGo); g.fillRect(armX - 3, armY - 5, 14, 3);          // wide guard
      g.fillStyle(P.wBl1); g.fillRect(armX + 2, armY - 41, 6, 36);         // blade base (width 6, height 36)
      g.fillStyle(P.wBl2); g.fillRect(armX + 3, armY - 39, 4, 34);         // inner blade
      g.fillStyle(P.wBr3, 0.6); g.fillRect(armX + 4.25, armY - 35, 1.5, 26); // blood runes
      g.fillStyle(P.wBl3);
        g.beginPath(); g.moveTo(armX + 2, armY - 41); g.lineTo(armX + 5, armY - 46); g.lineTo(armX + 8, armY - 41); g.closePath(); g.fillPath(); // blade tip
    }

    // ── Rim Light & Polish ──
    // Helmet rim — bright edge on top
    g.fillStyle(P.wSt4, 0.5);
    g.fillRect(headX + 3, headY + 1, 6, 1);
    // Pauldron rim
    g.fillStyle(P.wSt4, 0.45);
    g.fillRect(pauldronX + 2, pauldronY + 1, 8, 1);
    // Visor ambient glow
    g.fillStyle(P.wVisor2, 0.15);
    g.fillRect(headX + 4, headY + 2, 10, 6);
    // Cape fold line
    g.fillStyle(P.wCa3, 0.4);
    g.fillRect(10 + dx - capeDrift, 40 + dy + b, 1, 15);
    // Knee highlight dot
    g.fillStyle(P.wSt4, 0.5);
    g.fillCircle(flKneeX, flKneeY - 1.5, 0.8);
    // Sword edge gleam
    if (!isAttacking) {
      g.fillStyle(0x888899, 0.3);
      g.fillRect(armX + 7, armY - 40, 1, 38);
    }

    this.tex(g, key, 96, 96);
  }

  // ═══════════════════════════════════════
  //  MECHA FRAMES — 64×80 (Draconel Gothic Knight)
  // ═══════════════════════════════════════

  private genMechaFrames(): void {
    this.drawMecha('m-idle-0', 0, 0, 0, 'none');
    this.drawMecha('m-idle-1', 0, -1, 0, 'none');
    this.drawMecha('m-idle-2', 0, -2, 0, 'none');
    this.drawMecha('m-idle-3', 0, -1, 0, 'none');

    this.drawMecha('m-walk-0', 4, 0, 0, 'none');
    this.drawMecha('m-walk-1', 0, -1, 0, 'none');
    this.drawMecha('m-walk-2', -4, 0, 0, 'none');
    this.drawMecha('m-walk-3', 0, -1, 0, 'none');
    this.drawMecha('m-walk-4', 2, -1, 0, 'none');
    this.drawMecha('m-walk-5', -2, -1, 0, 'none');

    this.drawMecha('m-jump', 0, -3, 0, 'jump');
    this.drawMecha('m-fall', 0, 3, 0, 'fall');

    this.drawMecha('m-attack-0', 1, 0, 1, 'none');
    this.drawMecha('m-attack-1', 4, 2, 2, 'none');
    this.drawMecha('m-attack-2', 2, 1, 3, 'none');

    this.drawMecha('player-mecha', 0, 0, 0, 'none');
    this.drawMechaKneeling('m-kneeling');

    // === Enemy Mecha frames (Side-view/profile animated) ===
    this.drawEnemyMecha('enemy-mecha', 0, 0, false); // default static fallback
    this.drawEnemyMecha('em-idle-0', 0, 0, false);
    this.drawEnemyMecha('em-idle-1', 0, -1, false);
    this.drawEnemyMecha('em-idle-2', 0, -2, false);

    this.drawEnemyMecha('em-walk-0', 3, 0, false);
    this.drawEnemyMecha('em-walk-1', 0, -1, false);
    this.drawEnemyMecha('em-walk-2', -3, 0, false);
    this.drawEnemyMecha('em-walk-3', 0, -1, false);

    this.drawEnemyMecha('em-charge', 0, 1, true);

    // === Elite Mecha frames (Colossal mini-boss) ===
    this.drawEliteMecha('elite-mecha', 0, 0, 'idle'); // fallback
    this.drawEliteMecha('elm-idle-0', 0, 0, 'idle');
    this.drawEliteMecha('elm-idle-1', 0, -1, 'idle');
    this.drawEliteMecha('elm-idle-2', 0, -2, 'idle');

    this.drawEliteMecha('elm-walk-0', 6, 0, 'walk');
    this.drawEliteMecha('elm-walk-1', 0, -2, 'walk');
    this.drawEliteMecha('elm-walk-2', -6, 0, 'walk');
    this.drawEliteMecha('elm-walk-3', 0, -2, 'walk');

    this.drawEliteMecha('elm-attack', 0, 0, 'attack');

    // === Refinery Cauldron (background smelt effect) ===
    this.drawCauldron('bg-cauldron');
  }

  private drawEnemyMecha(
    key: string,
    legShift: number,
    bodyBob: number,
    isCharging: boolean
  ): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 48, H = 36;
    const b = bodyBob;
    const ls = legShift;

    // === 1. Background Leg (Dark shaded reverse-jointed) ===
    const bHipX = 18;
    const bHipY = 22 + b;
    const bKneeX = 12 - ls * 0.5;
    const bKneeY = 28 + b;
    const bFootX = 16 - ls;
    const bFootY = 35;

    g.lineStyle(4, 0x0f121a); // joint backing
    g.beginPath(); g.moveTo(bHipX, bHipY); g.lineTo(bKneeX, bKneeY); g.lineTo(bFootX, bFootY); g.strokePath();
    g.lineStyle(3, 0x19212e); // thigh/shin
    g.beginPath(); g.moveTo(bHipX, bHipY); g.lineTo(bKneeX, bKneeY); g.lineTo(bFootX, bFootY); g.strokePath();
    g.fillStyle(0x0f121a); g.fillCircle(bKneeX, bKneeY, 1.8);
    // foot claw
    g.fillStyle(0x131922); g.fillRect(bFootX - 3, bFootY - 1, 6, 2);

    // === 2. Thruster Flame (Left side, pointing backward) ===
    if (isCharging) {
      // Large double flame for charge-dash
      g.fillStyle(0xff3300);
      g.beginPath(); g.moveTo(10, 14 + b); g.lineTo(1, 16 + b); g.lineTo(10, 18 + b); g.closePath(); g.fillPath();
      g.fillStyle(0xffaa00);
      g.beginPath(); g.moveTo(10, 15 + b); g.lineTo(3, 16 + b); g.lineTo(10, 17 + b); g.closePath(); g.fillPath();
      g.fillStyle(0xffffff);
      g.beginPath(); g.moveTo(10, 16 + b); g.lineTo(5, 16 + b); g.lineTo(10, 16 + b); g.closePath(); g.fillPath();
    } else if (Math.abs(ls) > 0) {
      // Tiny puff of flame while walking
      g.fillStyle(0xffaa00);
      g.fillRect(7, 15 + b, 3, 2);
      g.fillStyle(0xffffff);
      g.fillRect(8, 16 + b, 2, 1);
    }

    // === 3. Main Torso / Chassis (Side-view, facing right) ===
    // Main armor block
    g.fillStyle(0x18202b);
    g.beginPath();
    g.moveTo(10, 10 + b);
    g.lineTo(34, 10 + b);
    g.lineTo(30, 24 + b);
    g.lineTo(12, 24 + b);
    g.closePath();
    g.fillPath();

    // Side flank plates
    g.fillStyle(0x141b24);
    g.beginPath();
    g.moveTo(10, 10 + b);
    g.lineTo(26, 10 + b);
    g.lineTo(24, 24 + b);
    g.lineTo(12, 24 + b);
    g.closePath();
    g.fillPath();

    // Highlights (metallic edges)
    g.fillStyle(0x32435c);
    g.fillRect(11, 10 + b, 22, 2); // top edge highlight
    g.beginPath(); g.moveTo(10, 10 + b); g.lineTo(12, 24 + b); g.lineTo(13, 24 + b); g.lineTo(11, 10 + b); g.closePath(); g.fillPath();

    // Sloped cockpit/face plate at the front (right side)
    g.fillStyle(0x0e131b);
    g.beginPath();
    g.moveTo(28, 11 + b);
    g.lineTo(34, 11 + b);
    g.lineTo(31, 23 + b);
    g.lineTo(26, 23 + b);
    g.closePath();
    g.fillPath();

    // Menacing visor slit (glowing red)
    g.fillStyle(0x6b0a0a); // dark red back
    g.fillRect(29, 13 + b, 5, 3);
    g.fillStyle(0xcc1111); // bright red
    g.fillRect(29, 14 + b, 5, 1);
    g.fillStyle(0xffaa66); // optic sensor glow
    g.fillRect(32, 14 + b, 1, 1);

    // Central core bezel (Energist core on side)
    this.circ(g, 18, 17 + b, 4, 0x8a7015);
    this.circ(g, 18, 17 + b, 3, 0x0f121a);
    this.circ(g, 18, 17 + b, 2, 0xcc2200);
    this.circ(g, 18, 17 + b, 1, 0xff8800);

    // === 4. Mounted Weapons (Top-mounted) ===
    // Back shoulder missile pod
    g.fillStyle(0x131922); g.fillRect(11, 4 + b, 10, 7);
    g.fillStyle(0x283548); g.fillRect(12, 5 + b, 8, 5);
    // Missile tips (front-facing right)
    g.fillStyle(0x07090d); g.fillRect(18, 6 + b, 2, 3);
    g.fillStyle(0xff3300); g.fillRect(19, 7 + b, 1, 1);

    // Main heavy shoulder auto-cannon (protrudes far forward to the right)
    g.fillStyle(0x131922); g.fillRect(22, 6 + b, 8, 5);
    g.fillStyle(0x1b2430); g.fillRect(28, 7 + b, 14, 3); // long barrel
    g.fillStyle(0x0f131a); g.fillRect(41, 6 + b, 2, 5); // muzzle cap
    // Muzzle heat glow tip
    g.fillStyle(0xff8800); g.fillRect(42, 8 + b, 1, 1);

    // === 5. Foreground Leg (Lighter reverse-jointed) ===
    const fHipX = 26;
    const fHipY = 22 + b;
    const fKneeX = 32 + ls * 0.5;
    const fKneeY = 28 + b;
    const fFootX = 28 + ls;
    const fFootY = 35;

    g.lineStyle(5, 0x0f121a); // joint backing
    g.beginPath(); g.moveTo(fHipX, fHipY); g.lineTo(fKneeX, fKneeY); g.lineTo(fFootX, fFootY); g.strokePath();
    g.lineStyle(4, 0x232e40); // thigh/shin
    g.beginPath(); g.moveTo(fHipX, fHipY); g.lineTo(fKneeX, fKneeY); g.lineTo(fFootX, fFootY); g.strokePath();
    g.lineStyle(2, 0x32435c); // thigh highlight
    g.beginPath(); g.moveTo(fHipX, fHipY + 1); g.lineTo(fKneeX - 1, fKneeY - 1); g.strokePath();

    this.circ(g, fKneeX, fKneeY, 2.2, 0x8a7015); // gold knee cap
    this.circ(g, fKneeX, fKneeY, 1.0, 0x0f121a);

    // Heavy foot claw
    g.fillStyle(0x131922); g.fillRect(fFootX - 4, fFootY - 1, 8, 2);
    g.fillStyle(0x8a7015); g.fillRect(fFootX + 2, fFootY - 1, 2, 1); // gold front claw

    // === 6. Gold Trim & Details ===
    g.fillStyle(0x8a7015);
    g.fillRect(13, 9 + b, 18, 1); // gold trim line
    // Rivets
    g.fillStyle(0x07090d);
    g.fillRect(14, 13 + b, 1, 1);
    g.fillRect(23, 13 + b, 1, 1);

    this.tex(g, key, W, H);
  }

  private drawEliteMecha(
    key: string,
    legShift: number,
    bodyBob: number,
    state: 'idle' | 'walk' | 'attack'
  ): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 128, H = 128;
    const b = bodyBob;
    const ls = legShift;
    const dx = 16;
    const dy = 8;

    // --- 1. Background Leg (slender dark jointed leg) ---
    const bHipX = 42 + dx;
    const bHipY = 56 + dy + b;
    const bKneeX = 30 + dx - ls * 0.5;
    const bKneeY = 74 + dy + b;
    const bFootX = 38 + dx - ls;
    const bFootY = 96 + dy;

    g.lineStyle(8, 0x0a0d14);
    g.beginPath(); g.moveTo(bHipX, bHipY); g.lineTo(bKneeX, bKneeY); g.lineTo(bFootX, bFootY); g.strokePath();
    g.lineStyle(5, 0x141b24);
    g.beginPath(); g.moveTo(bHipX, bHipY); g.lineTo(bKneeX, bKneeY); g.lineTo(bFootX, bFootY); g.strokePath();
    this.circ(g, bKneeX, bKneeY, 3, 0x0a0d14);
    g.fillStyle(0x0e131b); g.fillRect(bFootX - 6, bFootY - 2, 12, 4);

    // --- 2. Spine Gears (Clockwork detail at back of chassis) ---
    const rot = (ls * 10) * Math.PI / 180;
    const gearColor = 0x8a7015;
    const gearX = 36 + dx;
    const gearY = 32 + dy + b;
    this.circ(g, gearX, gearY, 10, 0x151c22);
    this.circ(g, gearX, gearY, 8, gearColor);
    g.lineStyle(3, gearColor);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const ta = angle + rot;
      g.beginPath();
      g.moveTo(gearX + Math.cos(ta) * 8, gearY + Math.sin(ta) * 8);
      g.lineTo(gearX + Math.cos(ta) * 12, gearY + Math.sin(ta) * 12);
      g.strokePath();
    }
    this.circ(g, gearX, gearY, 3, 0x0a0d14);

    // --- 3. Main Torso / Heavy Chassis ---
    g.fillStyle(0x1a222d);
    g.beginPath();
    g.moveTo(30 + dx, 22 + dy + b);
    g.lineTo(76 + dx, 22 + dy + b);
    g.lineTo(70 + dx, 58 + dy + b);
    g.lineTo(32 + dx, 58 + dy + b);
    g.closePath(); g.fillPath();

    g.fillStyle(0x131922);
    g.beginPath();
    g.moveTo(34 + dx, 26 + dy + b);
    g.lineTo(58 + dx, 26 + dy + b);
    g.lineTo(54 + dx, 54 + dy + b);
    g.lineTo(36 + dx, 54 + dy + b);
    g.closePath(); g.fillPath();

    g.fillStyle(0x2f3c4e);
    g.fillRect(32 + dx, 22 + dy + b, 42, 3);

    // Visor Sensor
    g.fillStyle(0x4a0a0a);
    g.fillRect(66 + dx, 28 + dy + b, 10, 5);
    g.fillStyle(0xff2200);
    g.fillRect(68 + dx, 29 + dy + b, 8, 3);
    g.fillStyle(0xffaa66);
    g.fillRect(73 + dx, 30 + dy + b, 2, 1);

    // Magma conduits
    g.lineStyle(3, 0xcc3300);
    g.beginPath();
    g.moveTo(38 + dx, 44 + dy + b);
    g.lineTo(50 + dx, 44 + dy + b);
    g.lineTo(54 + dx, 50 + dy + b);
    g.strokePath();
    g.lineStyle(1.5, 0xff7700);
    g.beginPath();
    g.moveTo(38 + dx, 44 + dy + b);
    g.lineTo(50 + dx, 44 + dy + b);
    g.lineTo(54 + dx, 50 + dy + b);
    g.strokePath();

    // Central core
    this.circ(g, 46 + dx, 40 + dy + b, 9, 0x8a7015);
    this.circ(g, 46 + dx, 40 + dy + b, 7, 0x0a0d14);
    this.circ(g, 46 + dx, 40 + dy + b, 5, 0xff4400);
    this.circ(g, 46 + dx, 40 + dy + b, 2.5, 0xffff00);

    // --- 4. Shoulder Railgun ---
    g.fillStyle(0x0e131b); g.fillRect(36 + dx, 12 + dy + b, 24, 10);
    g.fillStyle(0x1a222d); g.fillRect(40 + dx, 14 + dy + b, 16, 6);
    g.fillStyle(0x131922); g.fillRect(56 + dx, 15 + dy + b, 36, 4);
    g.fillStyle(0x2f3c4e); g.fillRect(92 + dx, 13 + dy + b, 4, 8);
    g.fillStyle(0xff7700); g.fillRect(94 + dx, 16 + dy + b, 2, 2);

    // --- 5. Weapon Arm / Shield Arm ---
    let handX = 72 + dx;
    let handY = 52 + dy + b;
    if (state === 'attack') {
      handX = 96 + dx;
      handY = 40 + dy + b;
    }

    g.lineStyle(6, 0x0e131b);
    g.beginPath(); g.moveTo(56 + dx, 38 + dy + b); g.lineTo(handX, handY); g.strokePath();
    g.lineStyle(4, 0x1f272e);
    g.beginPath(); g.moveTo(56 + dx, 38 + dy + b); g.lineTo(handX, handY); g.strokePath();

    if (state === 'attack') {
      g.fillStyle(0x131922);
      g.fillRect(handX - 4, handY - 8, 28, 16);
      g.fillStyle(0x1a222d);
      g.fillRect(handX + 4, handY - 5, 20, 10);
      g.fillStyle(0xff8800);
      g.fillRect(handX + 24, handY - 3, 4, 6);
      
      this.circ(g, handX + 28, handY, 14, 0xff5500);
      this.circ(g, handX + 28, handY, 8, 0xffaa00);
      this.circ(g, handX + 28, handY, 4, 0xffffff);
    } else {
      g.fillStyle(0x131922);
      g.beginPath();
      g.moveTo(handX - 6, handY - 4);
      g.lineTo(handX + 12, handY + 12);
      g.lineTo(handX + 6, handY + 28);
      g.lineTo(handX - 12, handY + 12);
      g.closePath(); g.fillPath();

      g.fillStyle(0x1a222d);
      g.beginPath();
      g.moveTo(handX - 3, handY - 1);
      g.lineTo(handX + 9, handY + 11);
      g.lineTo(handX + 4, handY + 25);
      g.lineTo(handX - 8, handY + 11);
      g.closePath(); g.fillPath();

      g.lineStyle(3, 0x8a7015);
      g.beginPath(); g.moveTo(handX - 4, handY + 6); g.lineTo(handX + 2, handY + 12); g.lineTo(handX - 2, handY + 16); g.strokePath();
    }

    // --- 6. Foreground Leg (massive jointed leg with gold plating) ---
    const fHipX = 58 + dx;
    const fHipY = 56 + dy + b;
    const fKneeX = 72 + dx + ls * 0.5;
    const fKneeY = 74 + dy + b;
    const fFootX = 64 + dx + ls;
    const fFootY = 96 + dy;

    g.lineStyle(10, 0x0a0d14);
    g.beginPath(); g.moveTo(fHipX, fHipY); g.lineTo(fKneeX, fKneeY); g.lineTo(fFootX, fFootY); g.strokePath();
    g.lineStyle(7, 0x27354a);
    g.beginPath(); g.moveTo(fHipX, fHipY); g.lineTo(fKneeX, fKneeY); g.lineTo(fFootX, fFootY); g.strokePath();
    g.lineStyle(3, 0x3d5272);
    g.beginPath(); g.moveTo(fHipX, fHipY + 1); g.lineTo(fKneeX - 1, fKneeY - 1); g.strokePath();

    this.circ(g, fKneeX, fKneeY, 5, 0x8a7015);
    this.circ(g, fKneeX, fKneeY, 2, 0x0a0d14);

    g.fillStyle(0x0a0d14); g.fillRect(fFootX - 8, fFootY - 2, 16, 4);
    g.fillStyle(0x8a7015); g.fillRect(fFootX + 4, fFootY - 2, 4, 3);
    g.fillStyle(0x8a7015); g.fillRect(fFootX - 8, fFootY - 2, 3, 3);

    this.tex(g, key, W, H);
  }

  private drawCauldron(key: string): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 96, H = 96;

    g.lineStyle(4, 0x1c1f24);
    g.beginPath(); g.moveTo(28, 0); g.lineTo(34, 40); g.strokePath();
    g.beginPath(); g.moveTo(68, 0); g.lineTo(62, 40); g.strokePath();

    g.lineStyle(2, 0x2f363f);
    g.beginPath(); g.moveTo(28, 0); g.lineTo(34, 40); g.strokePath();
    g.beginPath(); g.moveTo(68, 0); g.lineTo(62, 40); g.strokePath();

    this.circ(g, 34, 40, 5, 0x0f1215);
    this.circ(g, 62, 40, 5, 0x0f1215);

    const cx = 48, cy = 52;
    g.fillStyle(0x181c22);
    g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.closePath(); g.fillPath();

    g.lineStyle(3, 0x323b47);
    g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.strokePath();

    g.fillStyle(0x0d0f13);
    g.beginPath(); g.arc(cx, cy, 18, 0, Math.PI * 2); g.closePath(); g.fillPath();

    g.fillStyle(0xff5500);
    g.beginPath();
    g.arc(cx, cy, 17, Math.PI * 0.1, Math.PI * 0.9);
    g.lineTo(cx + 15, cy + 5);
    g.closePath(); g.fillPath();

    g.fillStyle(0xffaa00);
    g.beginPath();
    g.arc(cx, cy + 4, 12, Math.PI * 0.1, Math.PI * 0.9);
    g.lineTo(cx + 10, cy + 6);
    g.closePath(); g.fillPath();

    g.fillStyle(0x181c22);
    g.beginPath();
    g.moveTo(cx + 16, cy - 6);
    g.lineTo(cx + 26, cy + 4);
    g.lineTo(cx + 16, cy + 12);
    g.closePath(); g.fillPath();

    g.lineStyle(2, 0x323b47);
    g.beginPath();
    g.moveTo(cx + 16, cy - 6); g.lineTo(cx + 26, cy + 4); g.lineTo(cx + 16, cy + 12);
    g.strokePath();

    const streamLeft = cx + 18;
    const streamWidth = 8;
    g.fillStyle(0xff5500);
    g.fillRect(streamLeft, cy + 2, streamWidth, H - (cy + 2));
    g.fillStyle(0xffaa00);
    g.fillRect(streamLeft + 2, cy + 2, streamWidth - 4, H - (cy + 2));
    g.fillStyle(0xffffff);
    g.fillRect(streamLeft + 3, cy + 6, 2, H - (cy + 6));

    g.fillStyle(0x0a0c0e);
    this.circ(g, cx - 12, cy + 12, 1.5, 0x0a0c0e);
    this.circ(g, cx,      cy + 16, 1.5, 0x0a0c0e);
    this.circ(g, cx + 12, cy + 12, 1.5, 0x0a0c0e);

    this.tex(g, key, W, H);
  }

  private drawMechaKneeling(key: string): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const P = this.P;
    const dx = 24;
    const dy = 24 + 12;

    g.fillStyle(P.mRd1);
    g.beginPath();
    g.moveTo(10 + dx, 20 + dy);
    g.lineTo(0 + dx, 62 + dy);
    g.lineTo(16 + dx, 58 + dy);
    g.closePath(); g.fillPath();

    g.lineStyle(6, P.mJo);
    g.beginPath(); g.moveTo(14 + dx, 38 + dy); g.lineTo(16 + dx, 48 + dy); g.lineTo(6 + dx, 54 + dy); g.strokePath();
    g.lineStyle(5, P.mPl3);
    g.beginPath(); g.moveTo(6 + dx, 54 + dy); g.lineTo(0 + dx, 54 + dy); g.strokePath();

    g.lineStyle(6, P.mJo2);
    g.beginPath(); g.moveTo(18 + dx, 38 + dy); g.lineTo(22 + dx, 48 + dy); g.lineTo(10 + dx, 54 + dy); g.strokePath();
    g.lineStyle(5, P.mPl1);
    g.beginPath(); g.moveTo(10 + dx, 54 + dy); g.lineTo(4 + dx, 54 + dy); g.strokePath();

    const torsoX = 10 + dx;
    const torsoY = 20 + dy;
    const torsoW = 20;
    const torsoH = 20;

    g.fillStyle(P.mJo);
    g.beginPath();
    g.moveTo(torsoX - 1, torsoY);
    g.lineTo(torsoX + torsoW + 1, torsoY + 4);
    g.lineTo(torsoX + torsoW - 1, torsoY + torsoH + 1);
    g.lineTo(torsoX - 1, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mPl1);
    g.beginPath();
    g.moveTo(torsoX, torsoY + 1);
    g.lineTo(torsoX + torsoW, torsoY + 5);
    g.lineTo(torsoX + torsoW - 2, torsoY + torsoH);
    g.lineTo(torsoX, torsoY + torsoH - 1);
    g.closePath(); g.fillPath();

    g.fillStyle(P.mGo);
    g.beginPath();
    g.moveTo(torsoX + 3, torsoY + 3);
    g.lineTo(torsoX + torsoW - 3, torsoY + 6);
    g.lineTo(torsoX + torsoW - 5, torsoY + torsoH - 2);
    g.lineTo(torsoX + 3, torsoY + torsoH - 3);
    g.closePath(); g.fillPath();

    this.circ(g, torsoX + 10, torsoY + 10, 4.5, P.mRd1);
    g.lineStyle(1.5, 0x111111);
    g.beginPath(); g.moveTo(torsoX + 7, torsoY + 10); g.lineTo(torsoX + 13, torsoY + 11); g.strokePath();

    const headX = 22 + dx;
    const headY = 14 + dy;

    this.circ(g, headX, headY, 7, P.mJo);
    this.circ(g, headX, headY, 6, P.mPl1);

    g.fillStyle(0x0e4428);
    g.beginPath(); g.moveTo(headX + 2, headY - 1); g.lineTo(headX + 6, headY + 1); g.lineTo(headX + 3, headY + 3); g.closePath(); g.fillPath();

    // Dramatic pose: Mecha puts the massive claymore tip in the ground and holds the hilt
    // 1. Draw the Colossal Claymore
    // Claymore Grip/Hilt
    g.fillStyle(P.mJo);
    g.fillRect(38 + dx, 14 + dy, 4, 12);
    // Pommel
    this.circ(g, 40 + dx, 14 + dy, 3.5, P.mPl3);
    // Guard (wide mechanical cross-guard)
    g.fillStyle(P.mPl3);
    g.fillRect(28 + dx, 26 + dy, 24, 4);
    // Guard mecha runes
    g.fillStyle(0xff0055);
    g.fillRect(34 + dx, 27 + dy, 3, 2);
    g.fillRect(43 + dx, 27 + dy, 3, 2);

    // Colossal Blade (vertical, sticking into the ground)
    g.fillStyle(P.mPl1); // metal body
    g.fillRect(36 + dx, 30 + dy, 8, 42);
    // White-hot center line
    g.fillStyle(0xffffff);
    g.fillRect(39 + dx, 30 + dy, 2, 42);
    // Glowing pink energy runes on the blade
    g.fillStyle(0xff0055);
    g.fillRect(39 + dx, 40 + dy, 2, 6);
    g.fillRect(39 + dx, 54 + dy, 2, 6);

    // 2. Draw the heavy arm reaching to grab the hilt
    g.lineStyle(5, P.mJo);
    g.beginPath(); g.moveTo(16 + dx, 20 + dy); g.lineTo(28 + dx, 22 + dy); g.lineTo(38 + dx, 22 + dy); g.strokePath();
    g.lineStyle(4, P.mPl1);
    g.beginPath(); g.moveTo(16 + dx, 20 + dy); g.lineTo(28 + dx, 22 + dy); g.lineTo(37 + dx, 22 + dy); g.strokePath();

    this.tex(g, key, 96, 96);
  }

  private drawMecha(
    key: string,
    legShift: number,
    bodyBob: number,
    attackFrame: number,
    jumpState: 'none' | 'jump' | 'fall'
  ): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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

    // ── 7. Draconel Helmet (White yelmo, swept-back gold crest, green visor) ──
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

    // ── Rim Light & Core Glow ──
    // Core pulse aura
    g.fillStyle(P.mCo1, 0.12);
    g.fillCircle(coreX, coreY, 10);
    g.fillStyle(P.mCo2, 0.08);
    g.fillCircle(coreX, coreY, 6);
    // Helmet crest rim
    g.fillStyle(P.mPl2, 0.4);
    g.fillRect(headX + 2, headY + 1, 10, 1);
    // Pauldron top edge (pauldronX/Y defined above)
    g.fillStyle(P.mPl2, 0.35);
    g.fillRect(pauldronX + 2, pauldronY + 1, 10, 1);
    // Gold belt highlight
    g.fillStyle(P.mGo, 0.5);
    g.fillRect(torsoX + 1, torsoY + torsoH - 1, torsoW - 2, 1);

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
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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
  private drawShadowWraith(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. Back exhaust pipe (facing right, pipe is on the left)
    g.fillStyle(0x1e272e);
    g.fillRect(2, 13, 5, 4);

    // Engine exhaust soot/sparks (orange flame trail)
    g.fillStyle(0xff5500);
    g.beginPath();
    g.moveTo(2, 13);
    g.lineTo(-2, 15);
    g.lineTo(2, 17);
    g.closePath();
    g.fillPath();

    // 2. Main metal fuselage (dark steel, elongated boxy capsule)
    g.fillStyle(0x2f3542);
    g.fillRoundedRect(6, 8, 18, 14, 2);

    // Upper structural plating
    g.fillStyle(0x57606f);
    g.fillRoundedRect(8, 9, 12, 3, 1);

    // 3. Side stabilization wing/propeller on top
    g.fillStyle(0x747d8c);
    g.fillRect(12, 4, 6, 2);
    g.fillStyle(0xa4b0be);
    g.fillRect(9, 2, 12, 2); // rotor blade

    // 4. Front optical targeting sensor/visor (facing right)
    g.fillStyle(0x000000);
    g.fillRect(21, 11, 4, 7); // visor frame
    g.fillStyle(0xff1e00);
    g.fillRect(22, 12, 2, 5); // glowing red camera lens
    g.fillStyle(0xffffff);
    g.fillCircle(23, 13.5, 0.5); // reflection glint

    // 5. Mechanical panel rivet details
    g.fillStyle(0x1e272e);
    g.fillCircle(10, 18, 1);
    g.fillCircle(16, 18, 1);

    this.tex(g, 'enemy-sentry', 32, 32);
  }

  private drawShieldEnemy(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. Jointed mechanical bipedal leg (side-view chicken leg)
    // Hip joint
    g.fillStyle(0x1e272e);
    g.fillCircle(12, 21, 2);
    // Thigh
    g.lineStyle(2, 0x57606f);
    g.beginPath();
    g.moveTo(12, 21);
    g.lineTo(8, 26);
    g.strokePath();
    // Shin
    g.lineStyle(2, 0x57606f);
    g.beginPath();
    g.moveTo(8, 26);
    g.lineTo(14, 32);
    g.strokePath();
    // Foot plate
    g.fillStyle(0x1e272e);
    g.fillRect(10, 31, 6, 2);

    // 2. Torso (boxy dark iron, facing right)
    g.fillStyle(0x2f3542);
    g.fillRoundedRect(7, 6, 15, 15, 2);
    
    // Front visor targeting slit (facing right)
    g.fillStyle(0x000000);
    g.fillRect(16, 9, 6, 3);
    g.fillStyle(0xff1e00);
    g.fillRect(17, 10, 5, 1.2); // red sensor slit

    // Back exhaust vents
    g.fillStyle(0x1e272e);
    g.fillRect(5, 8, 2, 4);

    // 3. Spiky drill/pike weapon protruding forward
    g.fillStyle(0x747d8c);
    g.fillRect(18, 14, 6, 3);
    g.fillStyle(0xa4b0be);
    g.beginPath();
    g.moveTo(24, 13);
    g.lineTo(31, 15);
    g.lineTo(24, 17);
    g.closePath();
    g.fillPath();

    // 4. Heavy Shield on the front-right (protects front)
    g.fillStyle(0x57606f); // dark metal shield plate
    g.fillRect(23, 2, 6, 28);
    g.lineStyle(1, 0x8899aa); // shield bevel highlight
    g.strokeRect(23, 2, 6, 28);

    // Hazard warning stripes on the shield
    g.lineStyle(2, 0xeccc68); // industrial yellow stripes
    g.beginPath();
    g.moveTo(23, 8); g.lineTo(29, 14);
    g.moveTo(23, 14); g.lineTo(29, 20);
    g.moveTo(23, 20); g.lineTo(29, 26);
    g.strokePath();

    // Corner rivets on shield
    g.fillStyle(0x1e272e);
    g.fillCircle(25, 4, 0.8);
    g.fillCircle(27, 4, 0.8);
    g.fillCircle(25, 28, 0.8);
    g.fillCircle(27, 28, 0.8);

    this.tex(g, 'enemy-shield', 32, 32);
  }

  private drawSpitterEnemy(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. Tank tracks base (facing right, bottom layer)
    g.fillStyle(0x1e272e); // black rubber/steel tracks casing
    g.fillRoundedRect(4, 25, 24, 7, 2.5);

    // Track wheel bolts inside
    g.fillStyle(0x57606f);
    g.fillCircle(8, 28, 2);
    g.fillCircle(16, 28, 2);
    g.fillCircle(24, 28, 2);

    // 2. Main chassis (industrial military green, boxy)
    g.fillStyle(0x383b2a);
    g.fillRect(6, 12, 16, 13);
    
    // Armored panel trim
    g.lineStyle(1, 0x5c5e4f);
    g.strokeRect(6, 12, 16, 13);

    // Rivet dots on chassis panel
    g.fillStyle(0x1e272e);
    g.fillCircle(9, 15, 0.8);
    g.fillCircle(9, 21, 0.8);

    // 3. Physical mortar gun barrel mounted on top (angled up-right)
    g.lineStyle(5, 0x57606f); // dark steel thick barrel
    g.beginPath();
    g.moveTo(12, 12);
    g.lineTo(25, 5);
    g.strokePath();

    // Open barrel muzzle (facing right)
    g.fillStyle(0x1e272e);
    g.fillCircle(25, 5, 2);

    // 4. Optical targeting lens/scope on the barrel
    g.fillStyle(0xff7700);
    g.fillCircle(18, 9, 2);
    g.fillStyle(0xffff00);
    g.fillCircle(18, 9, 0.8);

    this.tex(g, 'enemy-spitter', 32, 32);
  }

  private drawLeaperEnemy(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. Rocket booster tank on the back (facing right, backpack is on left)
    g.fillStyle(0x1e272e);
    g.fillRect(2, 7, 6, 10);
    g.fillStyle(0x57606f); // metallic casing bands
    g.fillRect(2, 10, 6, 1.5);
    
    // Thruster nozzle & ignition spark (blue flame)
    g.fillStyle(0x33aaff);
    g.beginPath();
    g.moveTo(5, 17);
    g.lineTo(2, 23);
    g.lineTo(7, 21);
    g.closePath();
    g.fillPath();

    // 2. Torso (compact dark steel plating)
    g.fillStyle(0x2f3542);
    g.fillRoundedRect(7, 5, 12, 14, 2);

    // Front targeting visor lens (facing right)
    g.fillStyle(0x000000);
    g.fillCircle(15, 9, 3);
    g.fillStyle(0xff1e00);
    g.fillCircle(15, 9, 2); // glowing red optical eye
    g.fillStyle(0xffffff);
    g.fillCircle(16, 8, 0.6); // lens highlight

    // 3. Side-view mechanical springy shock leg (Z-joint)
    // Hip joint
    g.fillStyle(0x1e272e);
    g.fillCircle(12, 19, 2);
    // Thigh (jointed back)
    g.lineStyle(2, 0x57606f);
    g.beginPath();
    g.moveTo(12, 19);
    g.lineTo(6, 25);
    g.strokePath();
    // Shin (jointed forward)
    g.lineStyle(2.5, 0x57606f);
    g.beginPath();
    g.moveTo(6, 25);
    g.lineTo(14, 31);
    g.strokePath();
    // Shock absorber spring indicator on the shin joint
    g.lineStyle(1.2, 0xff5500);
    g.beginPath();
    g.moveTo(8, 23); g.lineTo(11, 26);
    g.strokePath();

    // Foot landing pad
    g.fillStyle(0x1e272e);
    g.fillRect(11, 31, 5, 2);

    this.tex(g, 'enemy-leaper', 32, 32);
  }

  // ═══ BOSS 128×128 ═══
  private drawBoss(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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

    // ── Corruption Details ──
    // Core corruption veins
    g.fillStyle(0xff1166, 0.25);
    g.fillCircle(60, 74, 14);
    // Energy tendrils spreading from core
    g.lineStyle(1.5, 0xff2266, 0.35);
    g.beginPath(); g.moveTo(60, 62); g.lineTo(55, 55); g.strokePath();
    g.beginPath(); g.moveTo(60, 62); g.lineTo(72, 58); g.strokePath();
    g.beginPath(); g.moveTo(60, 86); g.lineTo(54, 95); g.strokePath();
    // Cracked armor lines
    g.lineStyle(1, 0x442244, 0.6);
    g.beginPath(); g.moveTo(32, 60); g.lineTo(40, 68); g.strokePath();
    g.beginPath(); g.moveTo(88, 56); g.lineTo(80, 65); g.strokePath();
    // Crown corruption — extra dark spikes
    g.fillStyle(0x220011, 0.5);
    for (let i = 0; i < 4; i++) {
      const sx = 94 + i * 7;
      g.fillTriangle(sx, -3, sx + 2, 8, sx + 4, 0);
    }
    // Eye glow bleed
    g.fillStyle(0xff2288, 0.15);
    g.fillCircle(102, 22, 6);
    g.fillCircle(114, 22, 6);

    this.tex(g, 'boss', 128, 128);
  }

  // ═══ TERRAIN TEXTURES ═══
  private drawTerrainTextures(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // Ground — dark earth with roots & stipple shading
    g.fillStyle(0x14100c);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x1a1510);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x0d0a08);
    g.fillRect(0, 28, 32, 4);
    // Dithered shadow on ground bottom
    this.ditherRect(g, 0, 24, 32, 4, 0x070504);
    // Surface detail: small rocks
    g.fillStyle(0x1c1612);
    g.fillCircle(6, 6, 2);
    g.fillCircle(18, 7, 1.5);
    g.fillCircle(28, 5, 1.8);
    // Mossy patches
    g.fillStyle(0x1a2e18, 0.45);
    g.fillCircle(10, 5, 3);
    g.fillCircle(22, 6, 2.5);
    // Organic Root lines
    g.fillStyle(0x1a120c, 0.85);
    g.fillRect(14, 2, 2, 7);
    g.fillRect(16, 2, 1, 4);
    g.fillRect(12, 6, 2, 2);
    // Stone crack lines
    g.fillStyle(0x0a0705, 0.7);
    g.fillRect(22, 10, 2, 4);
    g.fillRect(24, 12, 3, 2);
    this.tex(g, 'tile-ground', 32, 32);

    // Rock platform — natural stone with cracks and specular highlight
    g.fillStyle(0x1c1814);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x26201a);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x120e0a);
    g.fillRect(0, 14, 32, 2);
    // Dither shadow
    this.ditherRect(g, 0, 11, 32, 3, 0x0d0a08);
    // Rock texture spots & cracks
    g.fillStyle(0x201a15, 0.6);
    g.fillCircle(8, 7, 2);
    g.fillCircle(22, 6, 2.5);
    g.fillStyle(0x0d0a08, 0.7);
    g.fillRect(12, 3, 1, 6);
    g.fillRect(13, 8, 3, 1);
    // Moss
    g.fillStyle(0x1a2818, 0.4);
    g.fillCircle(28, 4, 2);
    g.fillCircle(30, 5, 1);
    this.tex(g, 'tile-platform', 32, 16);

    // Grass-topped earth platform with blades & stipple
    g.fillStyle(0x181a14);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x1a2014);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x0e100a);
    g.fillRect(0, 14, 32, 2);
    this.ditherRect(g, 0, 12, 32, 2, 0x080906);
    // Detailed grass blades
    g.fillStyle(0x1a3018, 0.75);
    g.fillRect(4, 1, 1, 3);
    g.fillRect(5, 0, 1, 2);
    g.fillRect(10, 0, 1, 3);
    g.fillRect(16, 1, 1, 4);
    g.fillRect(17, 0, 1, 2);
    g.fillRect(22, 0, 1, 3);
    g.fillRect(28, 1, 1, 3);
    g.fillRect(29, 0, 1, 2);
    // Earth spots
    g.fillStyle(0x141610, 0.5);
    g.fillCircle(8, 8, 2);
    g.fillCircle(24, 7, 1.8);
    this.tex(g, 'tile-grass', 32, 16);

    // Stone ruins block — ancient carved stone with runes & cracks
    g.fillStyle(0x201c18);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x2a241e);
    g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x15120e);
    g.fillRect(0, 14, 32, 2);
    this.ditherRect(g, 0, 11, 32, 3, 0x0e0c0a);
    // Carved brick seams
    g.fillStyle(0x15120e, 0.8);
    g.fillRect(4, 2, 1, 12);
    g.fillRect(20, 2, 1, 12);
    g.fillRect(4, 7, 16, 1);
    // Runic carvings in ruins
    g.fillStyle(0xcc2222, 0.45); // glowing faint red runes
    g.fillRect(10, 4, 3, 1);
    g.fillRect(11, 4, 1, 4);
    g.fillRect(24, 5, 1, 4);
    // Weathering/noise
    g.fillStyle(0x1a1612, 0.6);
    g.fillCircle(10, 10, 1.5);
    g.fillCircle(26, 7, 1);
    this.tex(g, 'tile-ruins', 32, 16);

    // Tree stump platform
    g.fillStyle(0x1a120c);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x221810);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x0e0a06);
    g.fillRect(0, 14, 32, 2);
    // Rings
    g.fillStyle(0x1c140e, 0.4);
    g.fillEllipse(16, 6, 20, 8);
    g.fillStyle(0x1a120c, 0.3);
    g.fillEllipse(16, 5, 14, 5);
    g.fillStyle(0x181008, 0.3);
    g.fillEllipse(16, 4, 8, 3);
    this.tex(g, 'tile-stump', 32, 16);

    this.drawCrumblingTile();
    this.drawMossyTile();
    this.drawAltarTile();
    this.drawCaveGround();
    this.drawThornsTile();
  }

  // ═══ THORNS TILE 32×32 ═══
  private drawThornsTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x0a050d); g.fillRect(0, 0, 32, 32);
    g.lineStyle(2, 0x1f0d2b);
    g.beginPath();
    g.moveTo(0, 32); g.lineTo(32, 0);
    g.moveTo(32, 32); g.lineTo(0, 0);
    g.moveTo(16, 32); g.lineTo(16, 0);
    g.moveTo(0, 16); g.lineTo(32, 16);
    g.strokePath();

    g.fillStyle(0xcc2222);
    g.fillTriangle(4, 16, 12, 12, 12, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(6, 16, 11, 14, 11, 18);

    g.fillStyle(0xcc2222);
    g.fillTriangle(28, 16, 20, 12, 20, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(26, 16, 21, 14, 21, 18);

    g.fillStyle(0xcc2222);
    g.fillTriangle(16, 4, 12, 12, 20, 12);
    g.fillStyle(0xff5533);
    g.fillTriangle(16, 6, 14, 11, 18, 11);

    g.fillStyle(0xcc2222);
    g.fillTriangle(16, 28, 12, 20, 20, 20);
    g.fillStyle(0xff5533);
    g.fillTriangle(16, 26, 14, 21, 18, 21);

    this.tex(g, 'tile-thorns', 32, 32);
  }

  // ═══ CRUMBLING TILE 32×16 ═══
  private drawCrumblingTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x1a1510); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x221c16); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x0c0806); g.fillRect(0, 14, 32, 2);
    // Cracks
    g.fillStyle(0x0a0604); g.fillRect(6, 4, 2, 8);
    g.fillStyle(0x0a0604); g.fillRect(18, 3, 3, 4);
    g.fillStyle(0x0a0604); g.fillRect(25, 6, 2, 6);
    this.tex(g, 'tile-crumbling', 32, 16);
  }

  // ═══ MOSSY TILE 32×16 ═══
  private drawMossyTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x181a14); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x22281a); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x0e1008); g.fillRect(0, 14, 32, 2);
    g.fillStyle(0x1a3018, 0.5); g.fillRect(10, 4, 6, 3);
    g.fillStyle(0x1a3018, 0.4); g.fillRect(20, 6, 4, 2);
    this.tex(g, 'tile-mossy', 32, 16);
  }

  // ═══ ALTAR TILE 32×16 ═══
  private drawAltarTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x221c18); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x332a22); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x15100c); g.fillRect(0, 14, 32, 2);
    g.fillStyle(0x887744, 0.3); g.fillRect(12, 4, 8, 2);
    this.tex(g, 'tile-altar', 32, 16);
  }

  // ═══ CAVE GROUND 32×32 ═══
  private drawCaveGround(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x121420); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x181c28); g.fillRect(0, 0, 32, 3);
    g.fillStyle(0x0a0c14); g.fillRect(0, 28, 32, 4);
    g.fillStyle(0x0c0e18, 0.6); g.fillRect(10, 8, 3, 2);
    this.tex(g, 'ground-cave', 32, 32);
  }

  // ═══ DESTRUCTIBLE BUSH 24×20 ═══
  private drawBush(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Shadow base
    g.fillStyle(0x080c06, 0.85);
    g.fillEllipse(12, 12, 22, 16);

    // Deep foliage layers (dark stylized green-brown forest colors)
    g.fillStyle(0x1b2812);
    g.fillCircle(6, 12, 6);
    g.fillCircle(18, 12, 6);
    g.fillCircle(12, 8, 8);

    // Midground foliage (olive/emerald green)
    g.fillStyle(0x283e1b);
    g.fillCircle(8, 11, 4);
    g.fillCircle(16, 11, 4);
    g.fillCircle(12, 9, 6);

    // Glowing magma/ash berries (glowing embers on leaves)
    g.fillStyle(0xff4400);
    g.fillCircle(7, 8, 1.5);
    g.fillCircle(17, 10, 1.5);
    g.fillCircle(12, 5, 1.5);

    // Stems (dark charcoal brown)
    g.fillStyle(0x181008);
    g.fillRect(10, 13, 1.5, 7);
    g.fillRect(13, 13, 1.5, 7);

    this.tex(g, 'bush', 24, 20);
  }

  // ═══ DESTRUCTIBLE LARGE BUSH 32×28 ═══
  private drawLargeBush(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Shadow base
    g.fillStyle(0x080c06, 0.85);
    g.fillEllipse(16, 17, 30, 22);

    // Deep foliage layers
    g.fillStyle(0x16240f);
    g.fillCircle(8, 18, 8);
    g.fillCircle(24, 18, 8);
    g.fillCircle(16, 12, 11);

    // Midground foliage
    g.fillStyle(0x233b17);
    g.fillCircle(10, 16, 6);
    g.fillCircle(22, 16, 6);
    g.fillCircle(16, 13, 8);

    // Leaf highlights (lighter moss green)
    g.fillStyle(0x385c25);
    g.fillCircle(12, 12, 4);
    g.fillCircle(20, 12, 4);
    g.fillCircle(16, 9, 5);

    // Glowing magma berries
    g.fillStyle(0xff3300);
    g.fillCircle(9, 11, 1.8);
    g.fillCircle(23, 13, 1.8);
    g.fillCircle(16, 6, 1.8);
    g.fillStyle(0xffaa00);
    g.fillCircle(14, 12, 1.2);
    g.fillCircle(20, 9, 1.2);

    // Stems
    g.fillStyle(0x181008);
    g.fillRect(13, 18, 2, 10);
    g.fillRect(17, 18, 2, 10);

    this.tex(g, 'bush-large', 32, 28);
  }

  // ═══ DESTRUCTIBLE ROCK 24×24 ═══
  private drawDestructibleRock(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Rock base shadow (black bevel)
    g.fillStyle(0x0a0c10);
    g.fillRoundedRect(0, 0, 24, 24, 3);
    
    // Main volcanic slate body (dark gray-blue)
    g.fillStyle(0x20242e);
    g.beginPath();
    g.moveTo(2, 22);
    g.lineTo(22, 22);
    g.lineTo(22, 6);
    g.lineTo(16, 2);
    g.lineTo(6, 2);
    g.closePath();
    g.fillPath();

    // 3D beveled highlights (top and right light metallic edges)
    g.lineStyle(1.5, 0x4e5768);
    g.beginPath();
    g.moveTo(6, 2); g.lineTo(16, 2); g.lineTo(22, 6); g.lineTo(22, 22);
    g.strokePath();

    // Glowing magma veins (glowing red-orange cracks)
    g.lineStyle(1.5, 0xff3300);
    g.beginPath();
    g.moveTo(6, 18); g.lineTo(12, 10); g.lineTo(18, 12);
    g.moveTo(12, 10); g.lineTo(14, 3);
    g.strokePath();

    // Core bright hot point
    g.fillStyle(0xffaa00);
    g.fillCircle(12, 10, 1.5);
    
    this.tex(g, 'rock-destructible', 24, 24);
  }

  // ═══ RED MOON 128×128 ═══
  private drawRedMoon(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const mx = 64, my = 64;
    g.fillStyle(0x441111, 0.2);
    g.fillCircle(mx, my, 60);
    g.fillStyle(0x331111, 0.4);
    g.fillCircle(mx, my, 52);
    g.fillStyle(0xaa1818, 0.8);
    g.fillCircle(mx, my, 40);
    g.fillStyle(0xff3333, 0.9);
    g.fillCircle(mx, my, 37);
    g.fillStyle(0xff8866, 0.95);
    g.fillCircle(mx, my, 34);
    g.fillStyle(0x080610); // Matches sky background color
    g.fillCircle(mx + 10, my + 3, 36);
    this.tex(g, 'bg-moon', 128, 128);
  }

  // ═══ CASTLE SILHOUETTE 256×256 ═══
  private drawCastleSilhouette(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x060812, 0.95);
    g.fillRect(40, 160, 176, 96);
    g.fillRect(40, 80, 32, 80);
    g.fillTriangle(40, 80, 56, 40, 72, 80);
    g.fillRect(184, 80, 32, 80);
    g.fillTriangle(184, 80, 200, 40, 216, 80);
    g.fillRect(96, 60, 64, 100);
    g.fillTriangle(96, 60, 128, 0, 160, 60);
    g.fillRect(72, 140, 24, 20);
    g.fillRect(160, 140, 24, 20);
    g.fillTriangle(72, 160, 72, 100, 96, 160);
    g.fillTriangle(184, 160, 184, 100, 160, 160);
    g.fillStyle(0x0e111f, 0.85);
    g.fillCircle(128, 110, 24);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const tx = 128 + Math.cos(angle) * 28;
      const ty = 110 + Math.sin(angle) * 28;
      g.fillRect(tx - 4, ty - 4, 8, 8);
    }
    g.fillStyle(0x060812);
    g.fillCircle(128, 110, 16);
    this.tex(g, 'bg-castle', 256, 256);
  }

  // ═══ FOREGROUND ELEMENTS ═══
  private drawForegroundElements(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // Burnt tree 32×140 (foreground)
    g.fillStyle(0x0d0a08, 0.7);
    g.fillRect(12, 0, 8, 140);
    g.fillStyle(0x151210, 0.5);
    g.fillRect(14, 0, 4, 140);
    // Branches
    g.fillRect(4, 30, 12, 3);
    g.fillRect(18, 60, 10, 2);
    g.fillRect(2, 90, 14, 2);
    g.fillRect(20, 110, 8, 2);
    this.tex(g, 'fg-tree', 32, 140);

    // Broken column 24×100 (foreground)
    g.fillStyle(0x181c22, 0.6);
    g.fillRect(4, 0, 16, 100);
    g.fillStyle(0x202830, 0.4);
    g.fillRect(6, 0, 12, 100);
    // Crack
    g.fillStyle(0x0c0e12, 0.5);
    g.fillRect(8, 40, 2, 15);
    // Top break
    g.fillStyle(0x141820, 0.3);
    g.fillRect(2, 0, 20, 3);
    this.tex(g, 'fg-column', 24, 100);

    // Vine 8×120 (foreground, cave)
    g.fillStyle(0x1a2818, 0.4);
    g.fillRect(3, 0, 2, 120);
    g.fillStyle(0x1a2818, 0.3);
    for (let y = 10; y < 120; y += 20) {
      g.fillRect(2, y, 4, 1);
    }
    this.tex(g, 'fg-vine', 8, 120);
  }

  // ═══ DRAGON CORE 16×16 ═══
  private drawDragonCore(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    this.rect(g, 3, 0, 10, 14, 2, 0x3a4a5a);
    this.rect(g, 4, 1, 8, 12, 2, 0x4a5a6a);
    this.rect(g, 5, 2, 6, 10, 1, 0x0a0505);
    this.circ(g, 8, 6, 2.5, 0xff4400);
    this.circ(g, 8, 6, 1.5, 0xff8800);
    this.circ(g, 8, 6, 0.6, 0xffcc00);
    this.tri(g, 6, 0, 10, 0, 8, -2, 0x5a6a7a);
    this.tex(g, 'dragon-core', 16, 16);
  }

  // ═══ SKY CORE 16×16 ═══
  private drawSkyCore(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    this.rect(g, 3, 0, 10, 14, 2, 0x334455);
    this.rect(g, 4, 1, 8, 12, 2, 0x446688);
    this.rect(g, 5, 2, 6, 10, 1, 0x050a15);
    this.circ(g, 8, 6, 2.5, 0x4488ff);
    this.circ(g, 8, 6, 1.5, 0x88ccff);
    this.circ(g, 8, 6, 0.6, 0xffffff);
    this.tri(g, 6, 0, 10, 0, 8, -2, 0x557799);
    this.tex(g, 'sky-core', 16, 16);
  }

  // ═══ BARRICADE 32×64 ═══
  private drawBarricade(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    this.rect(g, 0, 0, 16, 8, 2, 0xcc3300);
    this.rect(g, 2, 1, 14, 6, 1, 0xff5500);
    this.rect(g, 5, 1, 10, 5, 1, 0xff8800);
    this.rect(g, 8, 2, 7, 3, 0.5, 0xffcc00);
    g.fillStyle(0xffffff); g.fillCircle(15, 4, 1);
    this.tex(g, 'bullet-fire', 16, 8);
  }

  // ═══ SWORD SLASH 80×28 ═══
  private drawSwordSlash(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 80, H = 28;
    const layers = [
      { a: 0.20, c: 0x0a4422, mul: 13 }, // outer faint green glow
      { a: 0.50, c: 0x22aa55, mul: 11 }, // mid-layer green
      { a: 0.75, c: 0x22ffaa, mul: 8 },  // bright green-cyan
      { a: 0.95, c: 0xaaffdd, mul: 4 },  // hot mint core
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, H / 2);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    // Inner white hot streak line for extreme energy feel
    g.lineStyle(2, 0xffffff, 0.9);
    g.beginPath();
    g.moveTo(6, H / 2);
    for (let x = 6; x < W - 6; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * 1.5);
    g.strokePath();

    g.fillStyle(0xaaffdd); g.fillCircle(3, H / 2, 2.0); g.fillCircle(W - 4, H / 2, 2.0);
    this.tex(g, 'sword-slash', W, H);
  }

  // ═══ HEAVY SWORD SLASH 128×48 ═══
  private drawSwordSlashHeavy(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 128, H = 48;
    const layers = [
      { a: 0.20, c: 0x660022, mul: 23 }, // dark violet/red heavy trail
      { a: 0.50, c: 0xd61a1a, mul: 18 },
      { a: 0.75, c: 0xff0066, mul: 13 }, // mecha pink-red glow
      { a: 0.95, c: 0xffaa44, mul: 7 },  // gold core
    ];
    layers.forEach(l => {
      g.fillStyle(l.c, l.a);
      g.beginPath(); g.moveTo(2, H / 2);
      for (let x = 2; x < W - 2; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * l.mul);
      for (let x = W - 3; x >= 1; x--) g.lineTo(x, H / 2 + Math.sin((x / W) * Math.PI) * l.mul);
      g.closePath(); g.fillPath();
    });
    // White-hot inner core
    g.lineStyle(3.5, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(8, H / 2);
    for (let x = 8; x < W - 8; x++) g.lineTo(x, H / 2 - Math.sin((x / W) * Math.PI) * 2.5);
    g.strokePath();

    g.fillStyle(0xffffff); g.fillCircle(3, H / 2, 3.0); g.fillCircle(W - 4, H / 2, 3.0);
    this.tex(g, 'sword-slash-heavy', W, H);
  }

  // ═══ DESTINY CARD 20×28 ═══
  private drawDestinyCard(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
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
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(18, 6, 36, 12);
    this.tex(g, 'shadow', 36, 12);
  }

  // ═══ TWINKLING STAR 5×5 ═══
  private drawTwinkleStar(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1.0);
    g.fillRect(2, 2, 1, 1); // center
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(1, 2, 3, 1); // horizontal
    g.fillRect(2, 1, 1, 3); // vertical
    this.tex(g, 'star-twinkle', 5, 5);
  }

  // ═══ MOON GLOW 512×512 ═══
  private drawMoonGlow(): void {
    const canvasGlow = document.createElement('canvas');
    canvasGlow.width = 512;
    canvasGlow.height = 512;
    const ctxGlow = canvasGlow.getContext('2d');
    if (ctxGlow) {
      const grad = ctxGlow.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, 'rgba(230, 40, 50, 0.22)'); // softened crimson center glow
      grad.addColorStop(0.2, 'rgba(210, 30, 40, 0.10)');
      grad.addColorStop(0.5, 'rgba(160, 20, 30, 0.03)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctxGlow.fillStyle = grad;
      ctxGlow.fillRect(0, 0, 512, 512);
    }
    if (this.scene.textures.exists('moon-glow')) {
      this.scene.textures.remove('moon-glow');
    }
    this.scene.textures.addCanvas('moon-glow', canvasGlow);
  }

  private drawBackgrounds(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Sky gradient
    for (let y = 0; y < 1200; y++) {
      const t = y / 1200;
      const r = Math.floor(4 * (1 - t) + 8 * t);
      const gr = Math.floor(3 * (1 - t) + 5 * t);
      const bl = Math.floor(10 * (1 - t) + 16 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, y, 960, 1);
    }

    // Draw Nebula / Milky Way core dust cloud (low alpha overlay circles)
    const drawNebulaCloud = (cx: number, cy: number, radius: number, color: number, alpha: number) => {
      g.fillStyle(color, alpha);
      g.fillCircle(cx, cy, radius);
    };

    for (let j = 0; j < 60; j++) {
      const t = j / 60;
      // Diagonal lane from top-left-ish to bottom-right-ish
      const lx = 150 + t * 600 + Phaser.Math.Between(-80, 80);
      const ly = t * 1200 + Phaser.Math.Between(-100, 100);
      
      drawNebulaCloud(lx, ly, Phaser.Math.Between(100, 180), 0x5a186b, 0.03); // purple
      if (Math.random() > 0.4) {
        drawNebulaCloud(lx + Phaser.Math.Between(-30, 30), ly + Phaser.Math.Between(-30, 30), Phaser.Math.Between(80, 140), 0x821c4b, 0.025); // magenta
      }
      if (Math.random() > 0.4) {
        drawNebulaCloud(lx + Phaser.Math.Between(-40, 40), ly + Phaser.Math.Between(-40, 40), Phaser.Math.Between(120, 200), 0x1d478a, 0.02); // cosmic blue
      }
    }

    // Standard background stars
    for (let i = 0; i < 350; i++) {
      const sx = Phaser.Math.Between(0, 959), sy = Phaser.Math.Between(0, 1100);
      const b = Math.random();
      g.fillStyle(b > 0.85 ? 0x8899bb : b > 0.6 ? 0x556677 : b > 0.3 ? 0x445566 : 0x334455);
      g.fillCircle(sx, sy, b > 0.6 ? 0.7 : 0.4);
    }

    // Nebula dense star clusters
    for (let i = 0; i < 200; i++) {
      const t = Math.random();
      const lx = 150 + t * 600 + Phaser.Math.Between(-100, 100);
      const ly = t * 1200 + Phaser.Math.Between(-120, 120);
      if (lx >= 0 && lx < 960 && ly >= 0 && ly < 1200) {
        const b = Math.random();
        g.fillStyle(b > 0.7 ? 0xccddee : 0x8899aa);
        g.fillCircle(lx, ly, b > 0.8 ? 0.8 : 0.5);
      }
    }

    // Bright flare stars
    for (let i = 0; i < 25; i++) {
      const sx = Phaser.Math.Between(50, 910), sy = Phaser.Math.Between(30, 800);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(sx, sy, 1.2);
      g.fillStyle(0xffffff, 0.3);
      g.fillRect(sx - 4, sy, 9, 1);
      g.fillRect(sx, sy - 4, 1, 9);
    }

    this.tex(g, 'bg-sky', 960, 1200);

    // Mountains (960x800, transparent above peaks, gradient body below peaks, glowing red ridge highlight)
    g.fillStyle(0x0d1220);
    for (let x = 0; x < 960; x++) {
      const h = 15 + Math.sin(x * 0.006 + 0.5) * 30 
                 + Math.cos(x * 0.015 + 1.2) * 18 
                 + Math.abs(Math.sin(x * 0.04 + 0.3)) * 10 
                 + Math.abs(Math.cos(x * 0.09 + 2.1)) * 5;
      const peakY = 140 - Math.floor(h);

      // 1. Draw glowing crimson ridge peak (2 pixels)
      g.fillStyle(0x3e1820); // warm dark red/crimson moonlight edge
      g.fillRect(x, peakY, 1, 2);

      // 2. Draw mountain body with vertical gradient (dark indigo fading to near black)
      const startY = peakY + 2;
      const totalH = 800 - startY;
      const bands = Math.ceil(totalH / 12);
      for (let b = 0; b < bands; b++) {
        const bandY = startY + b * 12;
        const bandH = Math.min(12, 800 - bandY);
        const t = b / bands;
        const r = Math.floor(25 * (1 - t) + 12 * t);
        const gr = Math.floor(32 * (1 - t) + 16 * t);
        const bl = Math.floor(52 * (1 - t) + 26 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, bandY, 1, bandH);
      }
    }
    this.tex(g, 'bg-mountains', 960, 800);

    // Forest (960x800, transparent above horizon/trees, gradient body below horizon)
    const groundStartY = 100;
    const groundTotalH = 700;
    const groundBands = 50;
    for (let b = 0; b < groundBands; b++) {
      const bandY = groundStartY + Math.floor(b * (groundTotalH / groundBands));
      const bandH = Math.ceil(groundTotalH / groundBands);
      const t = b / groundBands;
      const r = Math.floor(24 * (1 - t) + 10 * t);
      const gr = Math.floor(36 * (1 - t) + 15 * t);
      const bl = Math.floor(54 * (1 - t) + 24 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, bandY, 960, bandH);
    }

    const drawPineTree = (tx: number, th: number, tw: number) => {
      const layers = 3;
      const layerH = th / layers;
      for (let l = 0; l < layers; l++) {
        const scale = 1 - (l * 0.25);
        const bottomY = 100 - (l * layerH * 0.8);
        const topY = bottomY - layerH * 1.4;
        const w = tw * scale;

        // Deep shadow on left side
        g.fillStyle(0x060c12);
        g.beginPath();
        g.moveTo(tx - w / 2, bottomY);
        g.lineTo(tx, topY);
        g.lineTo(tx, bottomY);
        g.closePath();
        g.fillPath();

        // Warm red moonlight highlight on right side
        g.fillStyle(0x28191d);
        g.beginPath();
        g.moveTo(tx, bottomY);
        g.lineTo(tx, topY);
        g.lineTo(tx + w / 2, bottomY);
        g.closePath();
        g.fillPath();

        // Outer highlight edge
        g.fillStyle(0x402528);
        g.beginPath();
        g.moveTo(tx, topY);
        g.lineTo(tx + w / 2, bottomY);
        g.lineTo(tx + w / 2 - 1, bottomY);
        g.lineTo(tx, topY);
        g.closePath();
        g.fillPath();
      }
      // Trunk
      g.fillStyle(0x040608);
      g.fillRect(tx - 2, 100, 4, 8);
    };
    [30, 110, 190, 280, 360, 440, 530, 610, 700, 770, 850, 920].forEach(tx => {
      const th = Phaser.Math.Between(30, 65), tw = Phaser.Math.Between(8, 16);
      drawPineTree(tx, th, tw);
    });
    this.tex(g, 'bg-forest', 960, 800);

    // Ruins (960x800, transparent above horizon/pillars, gradient body below horizon)
    // 1. Draw ruins ground with 2D checkerboard dithering at boundaries
    for (let y = 80; y < 800; y++) {
      let color = 0x2b384a;
      let nextColor = 0x2b384a;
      let mid = 0;

      if (y < 160) {
        color = 0x2b384a;
        nextColor = 0x1f2838;
        mid = 160;
      } else if (y < 280) {
        color = 0x1f2838;
        nextColor = 0x141b26;
        mid = 280;
      } else if (y < 440) {
        color = 0x141b26;
        nextColor = 0x0a0d14;
        mid = 440;
      } else {
        color = 0x0a0d14;
        nextColor = 0x0a0d14;
        mid = 800;
      }

      const dist = y - (mid - 6);
      if (mid < 800 && dist >= 0 && dist <= 12) {
        const t = dist / 12;
        for (let x = 0; x < 960; x++) {
          let drawNext = false;
          if (t < 0.25) {
            drawNext = ((x + y) % 4 === 0);
          } else if (t < 0.5) {
            drawNext = ((x + y) % 2 === 0);
          } else if (t < 0.75) {
            drawNext = ((x + y) % 4 !== 0);
          } else {
            drawNext = true;
          }
          g.fillStyle(drawNext ? nextColor : color);
          g.fillRect(x, y, 1, 1);
        }
      } else {
        g.fillStyle(color);
        g.fillRect(0, y, 960, 1);
      }
    }

    // 2. Draw subterranean dungeon archways (cellars under the ruins)
    const drawSubArch = (ax: number, ay: number, aw: number, ah: number) => {
      // Dark chamber cavity
      g.fillStyle(0x06090e);
      g.fillRect(ax + 4, ay + 6, aw - 8, ah - 6);
      g.fillRect(ax + 8, ay, aw - 16, 6);
      g.fillRect(ax + 6, ay + 3, aw - 12, 3);
      g.fillRect(ax + 4, ay + 6, aw - 8, 3);

      // Inner wall highlights (moonlight catching inner left/top)
      g.fillStyle(0x4a5d80);
      g.fillRect(ax + 4, ay + 6, 1, ah - 6);
      g.fillRect(ax + 8, ay, aw - 16, 1);
      g.fillRect(ax + 6, ay + 3, 2, 1);
      g.fillRect(ax + 4, ay + 6, 2, 1);

      // Outer stone frame
      g.fillStyle(0x1a2133);
      g.fillRect(ax, ay, 4, ah);
      g.fillRect(ax + aw - 4, ay, 4, ah);
      g.fillRect(ax, ay - 4, aw, 4);
      // Frame highlights
      g.fillStyle(0x8c5064);
      g.fillRect(ax + aw - 1, ay - 4, 1, ah + 4);
      g.fillRect(ax, ay - 4, aw, 1);
    };

    drawSubArch(120, 110, 50, 70);
    drawSubArch(450, 115, 60, 80);
    drawSubArch(720, 110, 55, 75);

    // 3. Draw weathered horizontal brick masonry rows
    g.fillStyle(0x182030);
    for (let gy = 120; gy < 600; gy += 24) {
      for (let x = 0; x < 960; x += 32) {
        if (Math.random() > 0.35) {
          g.fillRect(x, gy, 20, 1);
        }
      }
    }

    // 4. Draw stone block debris / rubble piles at the horizon
    g.fillStyle(0x162030);
    [80, 130, 230, 310, 350, 430, 510, 570, 670, 760, 830, 870].forEach(rx => {
      const w = Phaser.Math.Between(6, 12);
      const h = Phaser.Math.Between(4, 10);
      g.fillRect(rx, 80 - h, w, h);
      // Highlight on right edge of rubble
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, 80 - h, 1, h);
      g.fillRect(rx, 80 - h, w, 1);
      g.fillStyle(0x162030);
    });

    const drawGothicWindowWall = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      
      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, 12, h);
      g.fillRect(rx + w - 12, topY, 12, h);
      g.fillRect(rx + 12, 80 - 20, w - 24, 6);
      g.fillRect(rx + 12, topY, w - 24, 12);
      g.fillRect(rx + 12, topY + 12, 4, 6);
      g.fillRect(rx + w - 16, topY + 12, 4, 6);
      g.fillRect(rx + 16, topY + 12, w - 32, 3);
      g.fillRect(rx + Math.floor(w / 2) - 2, topY + 12, 4, h - 32);
      g.fillRect(rx - 2, topY + 10, 2, h - 10);
      g.fillRect(rx + w, topY + 10, 2, h - 10);
      g.fillRect(rx - 1, topY - 8, 3, 8);
      g.fillRect(rx + w - 2, topY - 8, 3, 8);
      g.fillRect(rx, topY - 12, 1, 4);
      g.fillRect(rx + w - 1, topY - 12, 1, 4);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + 12, topY + 12, 1, h - 32);
      g.fillRect(rx + Math.floor(w / 2) - 2, topY + 12, 1, h - 32);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(rx + w - 12 - 1, topY + 12, 1, h - 32);
      g.fillRect(rx + Math.floor(w / 2) + 1, topY + 12, 1, h - 32);
      g.fillRect(rx, topY, w, 1);
      g.fillRect(rx + 12, 80 - 20, w - 24, 1);

      // Brick joints
      g.fillStyle(0x090c14);
      for (let y = topY + 14; y < 80; y += 14) {
        g.fillRect(rx, y, 12, 1);
        g.fillRect(rx + w - 12, y, 12, 1);
      }
    };

    const drawGothicArch = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const pillarW = 8;
      
      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, pillarW, h);
      g.fillRect(rx + w - pillarW, topY, pillarW, h);
      g.fillRect(rx - 2, topY, pillarW + 4, 3);
      g.fillRect(rx + w - pillarW - 2, topY, pillarW + 4, 3);
      g.fillRect(rx, topY - 6, w, 6);
      g.fillRect(rx + pillarW, topY, 4, 4);
      g.fillRect(rx + w - pillarW - 4, topY, 4, 4);
      g.fillRect(rx + pillarW + 4, topY - 3, w - (pillarW + 4) * 2, 3);
      g.fillRect(rx + Math.floor(w / 2) - 3, topY - 12, 6, 6);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 2, 6);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + w - pillarW, topY, 1, h);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + pillarW - 1, topY, 1, h);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(rx, topY - 6, w, 1);
      g.fillRect(rx - 2, topY, pillarW + 4, 1);
      g.fillRect(rx + w - pillarW - 2, topY, pillarW + 4, 1);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 1, 6);
    };

    const drawTowerPillar = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const slitW = 4;
      const slitX = rx + Math.floor(w / 2) - Math.floor(slitW / 2);

      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, slitX - rx, h);
      g.fillRect(slitX + slitW, topY, rx + w - (slitX + slitW), h);
      g.fillRect(slitX, topY, slitW, 20);
      g.fillRect(slitX, 80 - 20, slitW, 20);
      g.fillRect(rx - 3, topY, w + 6, 4);
      g.fillRect(rx - 1, topY - 4, w + 2, 4);
      g.fillRect(rx + 4, topY - 10, w - 8, 6);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 2, 8);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(slitX + slitW, topY + 20, 1, h - 40);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + w - 1, topY, 1, h);
      g.fillRect(slitX - 1, topY + 20, 1, h - 40);
      g.fillRect(rx - 3, topY, w + 6, 1);
      g.fillRect(rx + Math.floor(w / 2) - 1, topY - 18, 1, 8);
    };

    const drawBrokenColumn = (rx: number, w: number, h: number) => {
      const topY = 80 - h;
      const partW = Math.floor(w / 2);

      // Base
      g.fillStyle(0x141b2a);
      g.fillRect(rx, topY, partW, h);
      g.fillRect(rx + partW, topY + 12, w - partW, h - 12);
      g.fillRect(rx - 2, topY, partW + 2, 3);
      g.fillRect(rx - 6, 80 - 4, 4, 4);
      g.fillRect(rx + w + 2, 80 - 3, 3, 3);

      // Left shadow
      g.fillStyle(0x060912);
      g.fillRect(rx, topY, 1, h);
      g.fillRect(rx + partW, topY + 12, 1, h - 12);

      // Right & Top highlight
      g.fillStyle(0x4c2b36);
      g.fillRect(rx + partW - 1, topY, 1, h);
      g.fillRect(rx + w - 1, topY + 12, 1, h - 12);
      g.fillRect(rx - 2, topY, partW + 2, 1);
      g.fillRect(rx + partW, topY + 12, w - partW, 1);
    };

    drawGothicArch(40, 80, 70);
    drawTowerPillar(160, 20, 110);
    drawGothicWindowWall(240, 60, 85);
    drawBrokenColumn(360, 16, 50);
    drawGothicArch(440, 90, 65);
    drawGothicWindowWall(580, 70, 95);
    drawTowerPillar(700, 24, 120);
    drawGothicArch(780, 70, 75);
    drawBrokenColumn(890, 16, 60);

    this.tex(g, 'bg-ruins', 960, 800);

    // Procedural Mist Texture (512x128, soft horizontal transparency waves)
    const canvasMist = document.createElement('canvas');
    canvasMist.width = 512;
    canvasMist.height = 128;
    const ctxMist = canvasMist.getContext('2d');
    if (ctxMist) {
      for (let x = 0; x < 512; x++) {
        for (let y = 0; y < 128; y++) {
          const density = (Math.sin(x * 0.02) * Math.cos(y * 0.05) + Math.sin(x * 0.05 + y * 0.1) * 0.5 + 1.5) / 3;
          const edgeFade = Math.sin((y / 128) * Math.PI); 
          const alpha = Math.floor(density * edgeFade * 40); 
          ctxMist.fillStyle = `rgba(130, 45, 55, ${alpha / 255})`; 
          ctxMist.fillRect(x, y, 1, 1);
        }
      }
    }
    if (this.scene.textures.exists('bg-mist')) {
      this.scene.textures.remove('bg-mist');
    }
    this.scene.textures.addCanvas('bg-mist', canvasMist);
  }

  // ═══ PARTICLES ═══
  private drawParticles(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    this.circ(g, 4, 4, 3.5, 0xff4400); this.circ(g, 4, 3, 2.5, 0xff6600); this.circ(g, 4, 3, 1.5, 0xffaa00);
    this.tex(g, 'particle-fire', 8, 8);
    this.circ(g, 4, 4, 3.5, 0x443333); this.circ(g, 4, 3, 2.5, 0x554444);
    this.tex(g, 'particle-smoke', 8, 8);
    this.circ(g, 2, 2, 2, 0xffcc00); this.circ(g, 1.5, 1.5, 0.8, 0xffffff);
    this.tex(g, 'particle-spark', 4, 4);
    this.circ(g, 2, 2, 2, 0xff5500); this.circ(g, 1.5, 1.5, 1, 0xff8800);
    this.tex(g, 'particle-ember', 4, 4);
  }

  private keyOutBlackAndScale(rawKey: string, targetKey: string, targetW: number, targetH: number): void {
    const textureObj = this.scene.textures.get(rawKey);
    if (!textureObj) {
      console.warn(`Texture ${rawKey} not found!`);
      return;
    }
    const source = textureObj.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(source, 0, 0, targetW, targetH);

    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    // Detect background color from top-left corner pixel (0, 0)
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Distance to detected background color
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      // Absolute black or absolute white check as safety fallbacks
      const isBlack = r < 18 && g < 18 && b < 18;
      const isWhite = r > 238 && g > 238 && b > 238;

      if (dist < 45 || isBlack || isWhite) {
        data[i + 3] = 0; // Make transparent
      } else if (targetKey === 'bg-castle') {
        // Brighten the castle pixels to allow bright multiplicative tints in Phaser.
        // We map the dark silhouette colors to a bright light-gray/silver-white scale,
        // preserving details like the clock hands and outline shading.
        const brightness = (r + g + b) / 3;
        const newVal = Math.round(160 + (brightness / 255) * 95);
        data[i] = newVal;
        data[i + 1] = newVal;
        data[i + 2] = newVal;
      }
    }

    // Smoothly fade out the bottom of the castle silhouette to avoid a cut-off look
    if (targetKey === 'bg-castle') {
      // Find the actual bottom row of the castle (the last row with any visible pixels)
      let actualBottomY = 0;
      for (let y = targetH - 1; y >= 0; y--) {
        let rowHasPixels = false;
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          if (data[idx + 3] > 0) {
            rowHasPixels = true;
            break;
          }
        }
        if (rowHasPixels) {
          actualBottomY = y;
          break;
        }
      }

      // Apply the fade-out to the bottom of the actual castle height (e.g. 70 pixels fade length)
      const fadeLength = 70; 
      const fadeStart = Math.max(0, actualBottomY - fadeLength);

      for (let y = fadeStart; y <= actualBottomY; y++) {
        const factor = 1 - (y - fadeStart) / (actualBottomY - fadeStart);
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          data[idx + 3] = Math.round(data[idx + 3] * factor);
        }
      }

      // Clear any pixels below actualBottomY just in case
      for (let y = actualBottomY + 1; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const idx = (y * targetW + x) * 4;
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (this.scene.textures.exists(targetKey)) {
      this.scene.textures.remove(targetKey);
    }
    this.scene.textures.addCanvas(targetKey, canvas);
  }

  private drawLargeRockProcedural(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Rock base shadow
    g.fillStyle(0x0a0c10);
    g.fillRoundedRect(0, 0, 32, 32, 4);

    // Main craggy dark slate body
    g.fillStyle(0x20242e);
    g.beginPath();
    g.moveTo(3, 29);
    g.lineTo(29, 29);
    g.lineTo(29, 8);
    g.lineTo(22, 3);
    g.lineTo(10, 3);
    g.closePath();
    g.fillPath();

    // Left shadow facet (darker overlay)
    g.fillStyle(0x131720, 0.4);
    g.beginPath();
    g.moveTo(3, 29);
    g.lineTo(14, 29);
    g.lineTo(10, 3);
    g.closePath();
    g.fillPath();

    // Beveled highlight lines (top and right edges)
    g.lineStyle(1.5, 0x5a667c);
    g.beginPath();
    g.moveTo(10, 3); g.lineTo(22, 3); g.lineTo(29, 8); g.lineTo(29, 29);
    g.strokePath();

    // Magma veins (heavy hot cracks)
    g.lineStyle(2.0, 0xff2200);
    g.beginPath();
    g.moveTo(8, 24); g.lineTo(16, 14); g.lineTo(24, 18);
    g.moveTo(16, 14); g.lineTo(18, 4);
    g.strokePath();

    // Secondary vein branch
    g.lineStyle(1.0, 0xff6600);
    g.beginPath();
    g.moveTo(24, 18); g.lineTo(27, 10);
    g.strokePath();

    // Glowing core dots
    g.fillStyle(0xffaa00);
    g.fillCircle(16, 14, 2);
    g.fillCircle(24, 18, 1);

    this.tex(g, 'rock-large', 32, 32);
  }

  private drawRefineryTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2d3436); g.fillRect(0, 0, 32, 16);
    g.fillStyle(0x636e72); g.fillRect(0, 0, 32, 2);
    g.fillStyle(0x1e272e); g.fillRect(0, 14, 32, 2);
    this.ditherRect(g, 0, 11, 32, 3, 0x161c20);
    
    // Grid lines / metal plate borders
    g.fillStyle(0x3d4446);
    g.fillRect(8, 2, 1, 12);
    g.fillRect(16, 2, 1, 12);
    g.fillRect(24, 2, 1, 12);
    g.fillRect(2, 8, 28, 1);
    
    // Rivets on metal plates
    g.fillStyle(0x1e272e);
    g.fillRect(2, 3, 1, 1);
    g.fillRect(6, 3, 1, 1);
    g.fillRect(10, 3, 1, 1);
    g.fillRect(14, 3, 1, 1);
    g.fillRect(18, 3, 1, 1);
    g.fillRect(22, 3, 1, 1);
    g.fillRect(26, 3, 1, 1);
    g.fillRect(30, 3, 1, 1);
    g.fillRect(2, 13, 1, 1);
    g.fillRect(30, 13, 1, 1);
    
    // Rust streaks
    g.fillStyle(0x8b4513, 0.45);
    g.fillRect(12, 4, 1, 3);
    g.fillRect(17, 9, 1, 4);
    g.fillRect(27, 2, 1, 2);
    this.tex(g, 'tile-refinery', 32, 16);
  }

  private drawLavaGround(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x2d3033); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x3d4043); g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x1a1c1e); g.fillRect(0, 28, 32, 4);
    
    // Magma veins
    g.fillStyle(0xd63031);
    g.fillRect(4, 8, 6, 4);
    g.fillRect(10, 10, 8, 4);
    g.fillRect(18, 12, 10, 4);
    g.fillRect(12, 18, 6, 8);
    
    g.fillStyle(0xe17055);
    g.fillRect(6, 9, 3, 2);
    g.fillRect(12, 11, 4, 2);
    g.fillRect(20, 13, 6, 2);
    g.fillRect(13, 20, 4, 4);
    
    g.fillStyle(0xfdcb6e);
    g.fillCircle(14, 12, 1.5);
    g.fillCircle(22, 14, 1.5);
    g.fillCircle(15, 22, 1.2);
    
    this.tex(g, 'tile-lava-ground', 32, 32);
  }

  private drawRefineryLavaTile(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Base bright orange-red
    g.fillStyle(0xe17055); g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xfdcb6e); g.fillRect(0, 0, 32, 6); // Top hot layer
    
    // Bubbles
    g.fillStyle(0xd63031);
    g.fillCircle(8, 12, 3);
    g.fillCircle(24, 18, 4);
    g.fillCircle(14, 26, 3.5);
    
    g.fillStyle(0xffaa44);
    g.fillCircle(9, 11, 1.5);
    g.fillCircle(25, 17, 2);
    g.fillCircle(15, 25, 1.8);
    
    this.tex(g, 'tile-refinery-lava', 32, 32);
  }

  private drawSteamVent(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Metallic pipe base
    g.fillStyle(0x34495e); g.fillRect(4, 16, 24, 16);
    g.fillStyle(0x2c3e50); g.fillRect(4, 16, 12, 16);
    
    // Flange/rim
    g.fillStyle(0x506275); g.fillRect(2, 8, 28, 8);
    g.fillStyle(0x3d4e61); g.fillRect(2, 8, 14, 8);
    
    // Glowing hot steam output rim
    g.fillStyle(0xe67e22); g.fillRect(6, 4, 20, 4);
    g.fillStyle(0xf1c40f); g.fillRect(10, 4, 12, 4);
    
    this.tex(g, 'steam-vent', 32, 32);
  }

  private drawCoolValve(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Vertical pipe
    g.fillStyle(0x4b6584); g.fillRect(12, 0, 8, 32);
    g.fillStyle(0x2b3b4e); g.fillRect(12, 0, 4, 32);
    
    // Valve hub
    g.fillStyle(0x57606f); g.fillCircle(16, 16, 8);
    g.fillStyle(0x2f3542); g.fillCircle(16, 16, 4);
    
    // Circular wheel valve handle
    g.lineStyle(2.5, 0x3498db);
    g.strokeCircle(16, 16, 11);
    
    // glowing indicator in center
    g.fillStyle(0x00d2d3); g.fillCircle(16, 16, 2.5);
    g.fillStyle(0xffffff); g.fillCircle(16, 16, 1);
    
    this.tex(g, 'cool-valve', 32, 32);
  }

  private drawMechaEnemy(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // Dimensions: 48 wide x 36 tall — horizontal tank-mech chassis
    const W = 48, H = 36;

    // === Dark mechanical joints/frame backing (shadow layer) ===
    g.fillStyle(0x0f121a);
    g.fillRect(10, 10, 28, 16); // core block
    
    // Hip joint sockets
    g.fillCircle(12, 22, 3.5);
    g.fillCircle(36, 22, 3.5);

    // === 1. Background Leg (Left - reverse-jointed) ===
    // Thigh
    g.fillStyle(0x19212e);
    g.beginPath();
    g.moveTo(12, 22);
    g.lineTo(5, 27);
    g.lineTo(8, 29);
    g.lineTo(15, 24);
    g.closePath();
    g.fillPath();
    // Knee joint
    g.fillStyle(0x0a0d14);
    g.fillCircle(6, 28, 2.5);
    // Shin plate
    g.fillStyle(0x232e40);
    g.beginPath();
    g.moveTo(6, 28);
    g.lineTo(10, 35);
    g.lineTo(14, 35);
    g.lineTo(10, 28);
    g.closePath();
    g.fillPath();
    // Heavy claw foot
    g.fillStyle(0x131922);
    g.fillRect(6, 34, 9, 2);
    g.fillStyle(0x8a7015);
    g.fillRect(7, 34, 2, 1); // gold toe claw

    // === 2. Background Leg (Right - reverse-jointed) ===
    // Thigh
    g.fillStyle(0x19212e);
    g.beginPath();
    g.moveTo(36, 22);
    g.lineTo(43, 27);
    g.lineTo(40, 29);
    g.lineTo(33, 24);
    g.closePath();
    g.fillPath();
    // Knee joint
    g.fillStyle(0x0a0d14);
    g.fillCircle(42, 28, 2.5);
    // Shin plate
    g.fillStyle(0x232e40);
    g.beginPath();
    g.moveTo(42, 28);
    g.lineTo(38, 35);
    g.lineTo(34, 35);
    g.lineTo(38, 28);
    g.closePath();
    g.fillPath();
    // Heavy claw foot
    g.fillStyle(0x131922);
    g.fillRect(33, 34, 9, 2);
    g.fillStyle(0x8a7015);
    g.fillRect(39, 34, 2, 1); // gold toe claw

    // === 3. Chassis / Torso Armor (Angled & heavy plates) ===
    // Main plate (dark gunmetal)
    g.fillStyle(0x18202b);
    g.beginPath();
    g.moveTo(11, 10);
    g.lineTo(37, 10);
    g.lineTo(35, 25);
    g.lineTo(13, 25);
    g.closePath();
    g.fillPath();

    // Secondary angled flank plates
    g.fillStyle(0x141b24);
    g.beginPath(); g.moveTo(8, 12); g.lineTo(11, 10); g.lineTo(13, 25); g.lineTo(9, 21); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(40, 12); g.lineTo(37, 10); g.lineTo(35, 25); g.lineTo(39, 21); g.closePath(); g.fillPath();

    // 3D edge highlights (metallic blue-grey)
    g.fillStyle(0x32435c);
    g.fillRect(12, 10, 24, 2); // top edge
    g.beginPath(); g.moveTo(11, 12); g.lineTo(13, 25); g.lineTo(14, 25); g.lineTo(12, 12); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(37, 12); g.lineTo(35, 25); g.lineTo(34, 25); g.lineTo(36, 12); g.closePath(); g.fillPath();

    // Central sloped visor cowl (skull-like face shield)
    g.fillStyle(0x0e131b);
    g.beginPath();
    g.moveTo(15, 11);
    g.lineTo(33, 11);
    g.lineTo(30, 23);
    g.lineTo(18, 23);
    g.closePath();
    g.fillPath();

    // === 4. Visor - Menacing V-shaped eye visor glowing Red ===
    g.fillStyle(0x6b0a0a); // dark red backing
    g.beginPath();
    g.moveTo(17, 13); g.lineTo(24, 15); g.lineTo(31, 13);
    g.lineTo(30, 15); g.lineTo(24, 17); g.lineTo(18, 15);
    g.closePath(); g.fillPath();

    g.fillStyle(0xcc1111); // bright red
    g.beginPath();
    g.moveTo(18, 14); g.lineTo(24, 15.5); g.lineTo(30, 14);
    g.lineTo(29, 15); g.lineTo(24, 16.5); g.lineTo(19, 15);
    g.closePath(); g.fillPath();

    g.fillStyle(0xffaa66); // orange/white hot points (optics sensors)
    g.fillRect(19, 14, 2, 1);
    g.fillRect(27, 14, 2, 1);

    // === 5. Central Reactor Core (Energist stone) ===
    this.circ(g, 24, 19, 5, 0x8a7015); // gold bezel
    this.circ(g, 24, 19, 3.8, 0x0f121a); // socket
    this.circ(g, 24, 19, 2.6, 0xcc2200); // glowing red core
    this.circ(g, 24, 19, 1.5, 0xff8800); // bright orange
    this.circ(g, 24, 19, 0.7, 0xffffff); // white point

    // Vertical grill slots over core (metallic bars)
    g.fillStyle(0x0f121a);
    g.fillRect(22, 16, 1, 6);
    g.fillRect(25, 16, 1, 6);

    // === 6. Shoulder Weapons (Mounted on sides) ===
    // Left shoulder: Heavy Multiple Missile Pod
    g.fillStyle(0x131922); g.fillRect(1, 5, 9, 11);
    g.fillStyle(0x283548); g.fillRect(2, 6, 7, 9);
    // 2x2 Missile Tubes
    g.fillStyle(0x07090d);
    g.fillRect(3, 7, 2, 2);
    g.fillRect(6, 7, 2, 2);
    g.fillRect(3, 11, 2, 2);
    g.fillRect(6, 11, 2, 2);
    // Red missile tips
    g.fillStyle(0xff3300);
    g.fillRect(3.5, 7.5, 1, 1);
    g.fillRect(6.5, 7.5, 1, 1);
    g.fillRect(3.5, 11.5, 1, 1);
    g.fillRect(6.5, 11.5, 1, 1);

    // Right shoulder: Heavy Twin Auto-cannon
    g.fillStyle(0x131922); g.fillRect(38, 5, 9, 11);
    g.fillStyle(0x283548); g.fillRect(39, 6, 7, 9);
    // Dual heavy barrels protruding forward
    g.fillStyle(0x1b2430);
    g.fillRect(44, 7, 4, 2); // upper barrel
    g.fillRect(44, 11, 4, 2); // lower barrel
    // Muzzle flash / tips
    g.fillStyle(0xff8800);
    g.fillRect(47, 7, 1, 1);
    g.fillRect(47, 12, 1, 1);

    // === 7. Gothic Spikes, Rivets & Battle Damage ===
    g.fillStyle(0x8a7015);
    // Shoulder spikes
    g.beginPath(); g.moveTo(1, 5); g.lineTo(0, 2); g.lineTo(3, 5); g.closePath(); g.fillPath();
    g.beginPath(); g.moveTo(47, 5); g.lineTo(48, 2); g.lineTo(45, 5); g.closePath(); g.fillPath();
    // Gold chest trim band
    g.fillRect(14, 9, 20, 1);

    // Rivets
    g.fillStyle(0x07090d);
    g.fillRect(12, 12, 1, 1);
    g.fillRect(35, 12, 1, 1);
    g.fillRect(14, 23, 1, 1);
    g.fillRect(33, 23, 1, 1);

    // Rust streaks
    g.fillStyle(0x381a05);
    g.fillRect(14, 24, 1, 2);
    g.fillRect(33, 24, 1, 2);

    this.tex(g, 'enemy-mecha', W, H);
  }

  private drawMechaGraveyardBg(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const W = 640, H = 400;

    // Dark ashen sky gradient
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const r = Math.floor(18 * (1 - t) + 8 * t);
      const gr = Math.floor(10 * (1 - t) + 4 * t);
      const bl = Math.floor(14 * (1 - t) + 6 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, y, W, 1);
    }

    // Distant columns of smoke (tall dark plumes)
    const smokePillars = [50, 130, 260, 380, 490, 580];
    smokePillars.forEach((sx) => {
      for (let sy = 0; sy < H - 80; sy++) {
        const alpha = 0.15 + 0.08 * Math.sin(sy * 0.05 + sx);
        const w = 14 + 6 * Math.sin(sy * 0.03);
        g.fillStyle(0x111111, alpha);
        g.fillRect(sx - w / 2, sy, w, 1);
      }
    });

    // Fallen giant mecha silhouettes in distance
    const mechaPositions = [
      { x: 40, y: H - 120, w: 90, h: 100 },
      { x: 180, y: H - 100, w: 110, h: 90 },
      { x: 340, y: H - 130, w: 80, h: 110 },
      { x: 470, y: H - 95, w: 100, h: 85 },
      { x: 570, y: H - 115, w: 70, h: 100 },
    ];

    mechaPositions.forEach((m) => {
      // Main fallen body (tilted at ~25 deg — suggest collapsed)
      g.fillStyle(0x0d0f14);
      // Torso slab
      g.fillRect(m.x, m.y, m.w, m.h * 0.5);
      // Arm strewn to side
      g.fillRect(m.x + m.w - 10, m.y + 10, m.w * 0.4, m.h * 0.2);
      // Leg stub pointing down
      g.fillRect(m.x + m.w * 0.2, m.y + m.h * 0.4, m.w * 0.25, m.h * 0.6);
      // Cracked reactor glow (faint, deep red)
      g.fillStyle(0x330000);
      g.fillCircle(m.x + m.w * 0.4, m.y + m.h * 0.2, m.w * 0.12);
      g.fillStyle(0x660000);
      g.fillCircle(m.x + m.w * 0.4, m.y + m.h * 0.2, m.w * 0.07);
      // Dark rim
      g.fillStyle(0x0d0f14);
      g.fillRect(m.x - 2, m.y - 2, m.w + 4, 2);
    });

    // Ground line (scorched dark earth)
    g.fillStyle(0x0a0c0e);
    g.fillRect(0, H - 80, W, 80);

    // Scorch marks on ground
    for (let i = 0; i < 8; i++) {
      const sx = 40 + i * 75;
      g.fillStyle(0x060708);
      g.fillEllipse(sx, H - 75, 60, 20);
    }

    this.tex(g, 'bg-mecha-graveyard', W, H);
  }

  private drawDestroyedMechaA(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // 96x80 — fallen mech torso half-buried in the ground

    // Shadow beneath
    g.fillStyle(0x000000, 0.45);
    g.fillEllipse(48, 74, 84, 14);

    // === Giant background silhouette skeleton ===
    g.fillStyle(0x0a0c10);
    g.fillRect(12, 20, 72, 54);

    // === Main Torso Chassis (Huge tilted gunmetal plates) ===
    g.fillStyle(0x151c24);
    // Tilted polygon torso shape
    g.beginPath();
    g.moveTo(10, 24);
    g.lineTo(86, 14);
    g.lineTo(90, 72);
    g.lineTo(6, 76);
    g.closePath();
    g.fillPath();

    // Armor overlay plates (detailed mechanical layers)
    g.fillStyle(0x222c3a);
    g.beginPath();
    g.moveTo(14, 28);
    g.lineTo(82, 18);
    g.lineTo(86, 68);
    g.lineTo(10, 72);
    g.closePath();
    g.fillPath();

    // Lighter highlight plates (rust-stained edges)
    g.fillStyle(0x344358);
    g.beginPath();
    g.moveTo(16, 30);
    g.lineTo(80, 20);
    g.lineTo(84, 45);
    g.lineTo(12, 50);
    g.closePath();
    g.fillPath();

    // === Exposed mechanical spine / ribcage structure ===
    // Rust iron details
    g.fillStyle(0x401802);
    for (let i = 0; i < 5; i++) {
      const y = 32 + i * 8;
      const w = 48 - i * 4;
      g.fillRect(24 + i * 2, y, w, 3);
      g.fillStyle(0x6b2b07);
      g.fillRect(24 + i * 2, y, w, 1); // highlights
      g.fillStyle(0x401802);
    }

    // === Cracked central reactor room ===
    g.fillStyle(0x090b10);
    g.fillEllipse(48, 48, 28, 20);
    // Faint dying reactor glow (multiple colors)
    g.fillStyle(0x330000);
    g.fillEllipse(48, 48, 24, 16);
    g.fillStyle(0x880000);
    g.fillEllipse(48, 48, 16, 10);
    g.fillStyle(0xdd3300);
    g.fillEllipse(48, 48, 8, 5);
    g.fillStyle(0xff8800);
    g.fillEllipse(48, 48, 3, 2);

    // Exposed wires hanging out (decaying green/blue cords)
    g.lineStyle(1.5, 0x004d2c);
    g.beginPath(); g.moveTo(44, 50); g.lineTo(36, 68); g.lineTo(38, 75); g.strokePath();
    g.lineStyle(1.5, 0x0a335c);
    g.beginPath(); g.moveTo(52, 52); g.lineTo(58, 70); g.lineTo(54, 76); g.strokePath();
    g.lineStyle(1, 0x002211);
    g.beginPath(); g.moveTo(48, 51); g.lineTo(46, 73); g.strokePath();

    // === Smashed skull-like mecha head visor ===
    g.fillStyle(0x111720);
    g.fillRect(36, 10, 24, 16);
    // White/grey forehead plate
    g.fillStyle(0x2d3a4d);
    g.beginPath();
    g.moveTo(38, 11); g.lineTo(58, 11); g.lineTo(55, 20); g.lineTo(41, 20);
    g.closePath(); g.fillPath();
    // Cracked green visor
    g.fillStyle(0x003311);
    g.fillRect(40, 16, 16, 4);
    g.fillStyle(0x00ff66);
    g.fillRect(41, 17, 10, 2); // left side still glowing faintly
    // Visual crack line
    g.lineStyle(1, 0x0a0f18);
    g.beginPath(); g.moveTo(48, 15); g.lineTo(52, 21); g.strokePath();

    // === Blown shoulder weapon stub ===
    g.fillStyle(0x0a0f15);
    g.fillRect(2, 22, 16, 12);
    // Charred metal edge
    g.fillStyle(0x180000);
    g.fillRect(2, 22, 4, 12);
    // Sparks/embers
    g.fillStyle(0xff5500);
    g.fillRect(2, 25, 2, 2);
    g.fillRect(3, 29, 1, 1);

    // === Huge broken shoulder guard (right side pauldron) ===
    g.fillStyle(0x1c2533);
    g.beginPath();
    g.moveTo(82, 14); g.lineTo(95, 22); g.lineTo(91, 44); g.lineTo(76, 32);
    g.closePath(); g.fillPath();
    g.fillStyle(0x384a66);
    g.beginPath();
    g.moveTo(84, 16); g.lineTo(93, 23); g.lineTo(89, 41); g.lineTo(78, 31);
    g.closePath(); g.fillPath();
    // Battle scar slash across shoulder
    g.fillStyle(0x090b10);
    g.beginPath(); g.moveTo(82, 26); g.lineTo(92, 34); g.lineTo(89, 36); g.closePath(); g.fillPath();

    // Rust streaks running down chassis
    g.fillStyle(0x3a1500);
    g.fillRect(20, 28, 2, 22);
    g.fillRect(72, 25, 2, 18);
    g.fillRect(32, 29, 1, 15);

    // Gold trim remnants
    g.fillStyle(0x594610);
    g.fillRect(14, 28, 68, 2);

    this.tex(g, 'deco-mecha-a', 96, 80);
  }

  private drawDestroyedMechaB(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // 80x64 — smashed mech leg/arm half-buried diagonally

    // Shadow
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(40, 58, 72, 12);

    // === Background joint gear elements ===
    g.fillStyle(0x0a0c10);
    g.fillCircle(64, 20, 14);

    // Main heavy structural arm/leg diagonal beam
    g.fillStyle(0x131a24);
    g.beginPath();
    g.moveTo(2, 16);
    g.lineTo(66, 2);
    g.lineTo(76, 26);
    g.lineTo(12, 42);
    g.closePath();
    g.fillPath();

    // Armour plating overlay
    g.fillStyle(0x222c3a);
    g.beginPath();
    g.moveTo(6, 18);
    g.lineTo(62, 6);
    g.lineTo(70, 24);
    g.lineTo(14, 38);
    g.closePath();
    g.fillPath();

    // Highlights
    g.fillStyle(0x344358);
    g.beginPath();
    g.moveTo(8, 20);
    g.lineTo(60, 8);
    g.lineTo(64, 18);
    g.lineTo(12, 30);
    g.closePath();
    g.fillPath();

    // === Exposed mechanical gears & wrist/knee joint actuators ===
    g.fillStyle(0x4d3608); // rusted gears
    g.fillCircle(64, 20, 10);
    g.fillStyle(0x131a24);
    g.fillCircle(64, 20, 6);
    // Gear teeth dots
    g.fillStyle(0x4d3608);
    g.fillRect(63, 8, 2, 2);
    g.fillRect(63, 30, 2, 2);
    g.fillRect(52, 19, 2, 2);
    g.fillRect(74, 19, 2, 2);

    // Hydraulic cylinder piston
    g.fillStyle(0x1f2733);
    g.fillRect(42, 16, 12, 8);
    g.fillStyle(0x6e7e94); // chrome piston rod
    g.fillRect(48, 18, 10, 4);

    // Rust markings
    g.fillStyle(0x3a1500);
    g.fillRect(20, 18, 2, 16);
    g.fillRect(35, 14, 1, 18);

    // === Colossal rusted sword blade/claymore lying under the arm ===
    g.fillStyle(0x282c35); // dark steel guard
    g.fillRect(4, 34, 6, 18);
    g.fillStyle(0x401802); // rusted iron blade
    g.beginPath();
    g.moveTo(10, 40);
    g.lineTo(54, 46);
    g.lineTo(52, 54);
    g.lineTo(10, 48);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x6b2b07); // rust highlight
    g.fillRect(10, 43, 42, 2);

    // Blown impact crater hole in plating
    g.fillStyle(0x06080c);
    g.fillEllipse(26, 26, 12, 8);
    g.fillStyle(0x260000);
    g.fillEllipse(26, 26, 7, 5);
    g.fillStyle(0xff4400);
    g.fillRect(26, 26, 1, 1);

    // Rubble debris at the base
    g.fillStyle(0x131a24);
    g.fillRect(0, 42, 16, 6);
    g.fillStyle(0x07090c);
    g.fillRect(2, 44, 8, 4);

    this.tex(g, 'deco-mecha-b', 80, 64);
  }

  private drawThrusterBarrier(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // 24x96 — tall energy barrier / force field pillar

    // Metal frame edges (left and right)
    g.fillStyle(0x1a2030);
    g.fillRect(0, 0, 6, 96);
    g.fillRect(18, 0, 6, 96);
    g.fillStyle(0x2a3040);
    g.fillRect(1, 0, 4, 96);
    g.fillRect(19, 0, 4, 96);

    // Frame rivets
    for (let ry = 8; ry < 96; ry += 16) {
      g.fillStyle(0x3a4555);
      g.fillRect(2, ry, 2, 2);
      g.fillStyle(0x3a4555);
      g.fillRect(20, ry, 2, 2);
    }

    // Energy field core (magenta/cyan oscillating bands)
    for (let by = 0; by < 96; by++) {
      const t = by / 96;
      // Oscillate between cyan and magenta
      const phase = (Math.sin(t * Math.PI * 8) + 1) / 2;
      const r = Math.floor(0 * (1 - phase) + 180 * phase);
      const gr = Math.floor(180 * (1 - phase) + 0 * phase);
      const bl = Math.floor(220 * (1 - phase) + 220 * phase);
      const brightness = 0.5 + 0.5 * Math.sin(t * Math.PI * 14);
      const fr = Math.floor(r * brightness);
      const fg = Math.floor(gr * brightness);
      const fb = Math.floor(bl * brightness);
      g.fillStyle((fr << 16) | (fg << 8) | fb);
      g.fillRect(6, by, 12, 1);
    }

    // Glow edge overlays
    g.fillStyle(0x00cccc, 0.3);
    g.fillRect(6, 0, 2, 96);
    g.fillRect(16, 0, 2, 96);

    // Top and bottom cap emitters
    g.fillStyle(0x2a3040);
    g.fillRect(0, 0, 24, 6);
    g.fillRect(0, 90, 24, 6);
    g.fillStyle(0x00aacc);
    g.fillRect(4, 1, 16, 3);
    g.fillRect(4, 92, 16, 3);
    g.fillStyle(0x00ffff);
    g.fillRect(8, 2, 8, 1);
    g.fillRect(8, 93, 8, 1);

    this.tex(g, 'thruster-barrier', 24, 96);
  }



  private drawEnergyPickup(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    // metallic bracket/base
    this.rect(g, 2, 6, 12, 4, 1, 0x3a4a5a);
    this.rect(g, 4, 4, 8, 8, 1, 0x4a5a6a);
    // glowing blue capsule
    this.circ(g, 8, 8, 3.5, 0x00d2d3);
    this.circ(g, 8, 8, 2.0, 0x00ffff);
    this.circ(g, 8, 8, 0.8, 0xffffff);
    // rings / side wings
    this.rect(g, 0, 7, 2, 2, 0, 0x00d2d3);
    this.rect(g, 14, 7, 2, 2, 0, 0x00d2d3);
    this.tex(g, 'energy-pickup', 16, 16);
  }

  private drawGorgeWalls(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const w = 960;
    const h = 800;

    // Dual-silhouette: ceiling (top) and floor (bottom)
    // Seamlessly tileable over x = 960 using integer period sine waves
    for (let x = 0; x < w; x++) {
      const angle = x * (2 * Math.PI / w);
      
      // 1. Ceiling rocks (y = 0 down to hTop)
      const hTop = 130 + Math.sin(angle) * 35 
                       + Math.cos(angle * 2) * 20 
                       + Math.sin(angle * 5) * 8 
                       + Math.cos(angle * 12) * 4;
      const topPeak = Math.floor(hTop);

      // Gradient body for ceiling (from very dark purple-gray to dark navy)
      for (let y = 0; y < topPeak - 2; y++) {
        const t = y / topPeak;
        const r = Math.floor(8 * (1 - t) + 20 * t);
        const gr = Math.floor(6 * (1 - t) + 14 * t);
        const bl = Math.floor(14 * (1 - t) + 30 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, y, 1, 1);
      }
      
      // Magma glow edge at the bottom of the ceiling rock
      g.fillStyle(0xd35400); // orange-red magma
      g.fillRect(x, topPeak - 2, 1, 1);
      g.fillStyle(0xff8833); // brighter yellow-orange edge
      g.fillRect(x, topPeak - 1, 1, 1);

      // 2. Floor rocks (y = 800 - hBot up to 800)
      const hBot = 150 + Math.cos(angle) * 45 
                       + Math.sin(angle * 2) * 25 
                       + Math.cos(angle * 4) * 12 
                       + Math.sin(angle * 14) * 5;
      const botPeak = Math.floor(hBot);
      const startY = h - botPeak;

      // Magma glow edge at the top of the floor rock
      g.fillStyle(0xff8833); // brighter yellow-orange edge
      g.fillRect(x, startY, 1, 1);
      g.fillStyle(0xd35400); // orange-red magma
      g.fillRect(x, startY + 1, 1, 1);

      // Gradient body for floor (from dark navy to very dark purple-gray)
      for (let y = startY + 2; y < h; y++) {
        const t = (y - startY) / botPeak;
        const r = Math.floor(20 * (1 - t) + 8 * t);
        const gr = Math.floor(14 * (1 - t) + 6 * t);
        const bl = Math.floor(30 * (1 - t) + 14 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, y, 1, 1);
      }
    }

    this.tex(g, 'bg-gorge-walls', w, h);
  }

  private drawGorgeStructures(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const tw = 480;
    const th = 480;

    // Draw industrial girders and pipes that tile seamlessly
    // 1. Horizontal heavy pipe at y = 140 (height 28)
    const pipeY = 140;
    const pipeH = 28;
    for (let py = 0; py < pipeH; py++) {
      const t = py / pipeH;
      let col = 0x111622; // dark steel
      if (t < 0.2) col = 0x556270; // highlight top
      else if (t < 0.5) col = 0x222d3d; // medium
      else if (t > 0.8) col = 0x0a0f16; // shadow bottom
      g.fillStyle(col);
      g.fillRect(0, pipeY + py, tw, 1);
    }
    
    // Pipe rivets/joints every 120 pixels
    for (let rx = 0; rx < tw; rx += 120) {
      g.fillStyle(0x0a0f16);
      g.fillRect(rx, pipeY - 2, 6, pipeH + 4);
      g.fillStyle(0x7f8c8d);
      g.fillRect(rx + 2, pipeY, 2, 4);
      g.fillRect(rx + 2, pipeY + pipeH - 4, 2, 4);
    }

    // 2. Vertical girders (posts) of width 20 at x = 90 and x = 370
    const girderWidth = 20;
    const girderXLocations = [90, 370];
    
    girderXLocations.forEach((gx) => {
      // Draw vertical beam
      g.fillStyle(0x0a0e14); // deep slate/black girder body
      g.fillRect(gx, 0, girderWidth, th);

      g.fillStyle(0x1b2330); // vertical highlight strip
      g.fillRect(gx + 4, 0, 4, th);

      g.fillStyle(0x05070a); // shadow side
      g.fillRect(gx + 12, 0, 8, th);

      // Truss patterns: Draw diagonal crossbars at 60px height intervals
      for (let ty = 0; ty < th; ty += 120) {
        g.lineStyle(2, 0x1b2330);
        // diagonal truss line
        g.beginPath();
        g.moveTo(gx + girderWidth, ty);
        g.lineTo(gx - 40, ty + 60);
        g.moveTo(gx - 40, ty);
        g.lineTo(gx + girderWidth, ty + 60);
        g.strokePath();

        // horizontal truss line
        g.beginPath();
        g.moveTo(gx, ty + 60);
        g.lineTo(gx - 40, ty + 60);
        g.strokePath();
      }
    });

    // 3. Glowing biomechanical power cables weaving through the structures
    g.lineStyle(2, 0xa30045, 0.7); // purple-pink glow
    g.beginPath();
    for (let cx = 0; cx < tw; cx++) {
      const cy = 240 + Math.sin(cx * (2 * Math.PI / tw) * 2) * 50;
      if (cx === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    }
    g.strokePath();

    g.lineStyle(1.2, 0xff88ee, 0.9); // inner cable light core
    g.beginPath();
    for (let cx = 0; cx < tw; cx++) {
      const cy = 240 + Math.sin(cx * (2 * Math.PI / tw) * 2) * 50;
      if (cx === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    }
    g.strokePath();

    this.tex(g, 'bg-gorge-structures', tw, th);
  }

  private drawRefinerySky(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const w = 960;
    const h = 1200;

    // Volcanic gradient
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const r = Math.floor(11 * (1 - t) + 80 * t);
      const gr = Math.floor(7 * (1 - t) + 20 * t);
      const bl = Math.floor(18 * (1 - t) + 18 * t);
      g.fillStyle((r << 16) | (gr << 8) | bl);
      g.fillRect(0, y, w, 1);
    }

    // Soot/smoke clouds
    const drawSmokeCloud = (cx: number, cy: number, radius: number, color: number, alpha: number) => {
      g.fillStyle(color, alpha);
      g.fillCircle(cx, cy, radius);
    };

    for (let j = 0; j < 30; j++) {
      const t = j / 30;
      const lx = t * w + Phaser.Math.Between(-50, 50);
      const ly = h * 0.4 + t * 400 + Phaser.Math.Between(-100, 100);
      drawSmokeCloud(lx, ly, Phaser.Math.Between(120, 240), 0x110707, 0.25); // black soot
      drawSmokeCloud(lx + 40, ly - 20, Phaser.Math.Between(80, 180), 0x2d0b11, 0.15); // dark red smoke
    }

    // Glowing embers in sky
    for (let i = 0; i < 40; i++) {
      const ex = Phaser.Math.Between(0, w - 1);
      const ey = Phaser.Math.Between(0, h - 1);
      const size = Phaser.Math.Between(2, 4);
      g.fillStyle(Math.random() > 0.5 ? 0xff5500 : 0xffaa00, 0.6);
      g.fillRect(ex, ey, size, size);
    }

    this.tex(g, 'bg-refinery-sky', w, h);
  }

  private drawRefineryFurnaces(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const w = 960;
    const h = 800;

    // Background of smelting chimneys/towers
    // Drawn as dark silhouettes with hot glowing points
    for (let x = 0; x < w; x++) {
      // Periodic jagged roofline of towers and furnace stacks
      const angle = x * (2 * Math.PI / w);
      let chimneyY = 220;

      // Add a couple of distinct chimney stacks
      const dx1 = Math.abs(x - 240);
      const dx2 = Math.abs(x - 680);

      if (dx1 < 32) {
        chimneyY = 100;
      } else if (dx2 < 40) {
        chimneyY = 80;
      } else {
        chimneyY = 240 + Math.sin(angle * 3) * 35 
                           + Math.cos(angle * 7) * 12;
      }

      const peakY = Math.floor(chimneyY);
      
      // Draw structure body (very dark maroon/grey gradient)
      for (let y = peakY; y < h; y++) {
        const t = (y - peakY) / (h - peakY || 1);
        const r = Math.floor(18 * (1 - t) + 10 * t);
        const gr = Math.floor(12 * (1 - t) + 8 * t);
        const bl = Math.floor(18 * (1 - t) + 12 * t);
        g.fillStyle((r << 16) | (gr << 8) | bl);
        g.fillRect(x, y, 1, 1);
      }

      // Highlight on right edge of chimneys
      if (dx1 === 31 || dx2 === 39 || (x % 96 === 0 && x > peakY)) {
        g.fillStyle(0x4c1b22);
        g.fillRect(x, peakY, 1, h - peakY);
      }
    }

    // Draw a couple of glowing background windows/slits in the towers
    const drawGlowingSlit = (cx: number, cy: number, cw: number, ch: number) => {
      g.fillStyle(0x7f1105);
      g.fillRect(cx, cy, cw, ch);
      g.fillStyle(0xff4400);
      g.fillRect(cx + 1, cy + 1, cw - 2, ch - 2);
      g.fillStyle(0xffaa00);
      g.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);
    };

    drawGlowingSlit(224, 180, 8, 40);
    drawGlowingSlit(234, 180, 8, 40);
    drawGlowingSlit(664, 160, 10, 50);
    drawGlowingSlit(678, 160, 10, 50);

    drawGlowingSlit(110, 320, 24, 14);
    drawGlowingSlit(530, 310, 32, 16);
    drawGlowingSlit(820, 330, 20, 12);

    this.tex(g, 'bg-refinery-furnaces', w, h);
  }

  private drawRefineryStructures(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    const w = 480;
    const h = 800;

    // Draw medium-parallax industrial pipes and steel frameworks
    // Vertical beam at x = 120 and x = 360
    const beamW = 24;
    [120, 360].forEach(bx => {
      g.fillStyle(0x0a0c14);
      g.fillRect(bx, 0, beamW, h);

      g.fillStyle(0x2d3440); // highlights
      g.fillRect(bx + 4, 0, 4, h);
      g.fillRect(bx + 18, 0, 2, h);

      // cross trusses
      for (let y = 0; y < h; y += 160) {
        g.lineStyle(2.5, 0x1f2733);
        g.beginPath();
        g.moveTo(bx + beamW, y);
        g.lineTo(bx - 40, y + 80);
        g.moveTo(bx - 40, y);
        g.lineTo(bx + beamW, y + 80);
        g.strokePath();

        // horizontal beam
        g.fillRect(bx - 40, y + 80, 40, 6);
      }
    });

    // Horizontal glowing coolant pipes
    const pipeY1 = 280;
    const pipeY2 = 540;
    const pipeH = 16;
    [pipeY1, pipeY2].forEach(py => {
      // Pipe dark body
      g.fillStyle(0x161c28);
      g.fillRect(0, py, w, pipeH);
      
      // Glowing liquid strip in center
      g.fillStyle(0xff3300);
      g.fillRect(0, py + 5, w, 6);
      g.fillStyle(0xffaa00);
      g.fillRect(0, py + 7, w, 2);

      // Pipe rims
      for (let px = 40; px < w; px += 160) {
        g.fillStyle(0x0d121c);
        g.fillRect(px, py - 2, 8, pipeH + 4);
        g.fillStyle(0x3e4a5e);
        g.fillRect(px + 2, py - 2, 2, pipeH + 4);
      }
    });

    this.tex(g, 'bg-refinery-structures', w, h);
  }

  private drawVisualProps(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. Glowing Crystals (prop-crystal, 16x24)
    g.clear();
    g.fillStyle(0x9b59b6, 0.22);
    g.fillCircle(8, 12, 10);
    g.fillStyle(0x8e44ad, 0.45);
    g.fillCircle(8, 14, 6);
    g.fillStyle(0xbe2edd);
    g.beginPath();
    g.moveTo(8, 2);
    g.lineTo(13, 12);
    g.lineTo(8, 22);
    g.lineTo(3, 12);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xe056fd);
    g.beginPath();
    g.moveTo(8, 2);
    g.lineTo(13, 12);
    g.lineTo(8, 22);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff);
    g.fillRect(7, 10, 2, 4);
    this.tex(g, 'prop-crystal', 16, 24);

    // 2. Iron Chain (prop-chain, 8x48)
    g.clear();
    const linkH = 12;
    for (let y = 0; y < 48; y += linkH) {
      g.lineStyle(1.5, 0x1e272e);
      g.strokeRoundedRect(1, y, 6, linkH, 3);
      g.fillStyle(0x2f3640);
      g.fillRoundedRect(1.5, y + 0.5, 5, linkH - 1, 2.5);
      g.fillStyle(0x8c5064);
      g.fillRect(4, y + 2, 2, 6);
      g.fillStyle(0xdff9fb);
      g.fillRect(2, y + 2, 1, 3);
    }
    this.tex(g, 'prop-chain', 8, 48);

    // 3. Refinery Console (prop-console, 24x32)
    g.clear();
    g.fillStyle(0x1e272e);
    g.fillRect(2, 6, 20, 26);
    g.fillStyle(0x2f3640);
    g.fillRect(2, 6, 10, 26);
    g.fillStyle(0x0a3d62);
    g.fillRect(4, 8, 16, 12);
    g.lineStyle(1, 0x00d2d3, 0.85);
    g.beginPath();
    g.moveTo(5, 14);
    g.lineTo(9, 14);
    g.lineTo(11, 10);
    g.lineTo(13, 18);
    g.lineTo(15, 14);
    g.lineTo(19, 14);
    g.strokePath();
    g.fillStyle(0xff3f34);
    g.fillCircle(6, 24, 1.5);
    g.fillStyle(0xffc048);
    g.fillCircle(12, 24, 1.5);
    g.fillStyle(0x05c46b);
    g.fillCircle(18, 24, 1.5);
    g.fillStyle(0x718093);
    g.fillRect(2, 6, 20, 1.5);
    g.fillRect(21, 6, 1, 26);
    this.tex(g, 'prop-console', 24, 32);

    // 4. Warning Light (prop-warning-light, 16x16)
    g.clear();
    g.fillStyle(0x2c3e50);
    g.fillRect(2, 11, 12, 5);
    g.lineStyle(1, 0x7f8c8d);
    g.strokeRect(4, 2, 8, 9);
    g.fillStyle(0xff2200, 0.45);
    g.fillCircle(8, 6, 5);
    g.fillStyle(0xff8833);
    g.fillCircle(8, 6, 2.5);
    g.fillStyle(0xffffff);
    g.fillCircle(8, 6, 1);
    this.tex(g, 'prop-warning-light', 16, 16);

    // 5. Floating Gorge Debris 1 (prop-debris-1, 24x24)
    g.clear();
    g.fillStyle(0x1e1e24);
    g.beginPath();
    g.moveTo(12, 2);
    g.lineTo(22, 8);
    g.lineTo(18, 20);
    g.lineTo(6, 18);
    g.lineTo(3, 10);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x3e3e4a);
    g.beginPath();
    g.moveTo(12, 2);
    g.lineTo(22, 8);
    g.lineTo(18, 12);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff4400);
    g.fillRect(8, 10, 6, 2);
    g.fillRect(10, 8, 2, 6);
    g.fillStyle(0xffaa00);
    g.fillCircle(10, 10, 1);
    this.tex(g, 'prop-debris-1', 24, 24);

    // 6. Floating Gorge Debris 2 (prop-debris-2, 20x20)
    g.clear();
    g.fillStyle(0x18181f);
    g.beginPath();
    g.moveTo(10, 3);
    g.lineTo(18, 9);
    g.lineTo(14, 17);
    g.lineTo(5, 14);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff3300);
    g.fillRect(8, 9, 4, 1.5);
    this.tex(g, 'prop-debris-2', 20, 20);
  }

  private drawZone3Hazards(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. hazard-piston (48x48) - heavy iron plate crusher
    g.fillStyle(0x1a1d24); g.fillRect(0, 0, 48, 48); // dark background structure
    g.fillStyle(0x2c303c); g.fillRect(4, 4, 40, 40); // inner plate
    // draw diagonal hazard stripes
    g.fillStyle(0xd35400); // orange warning stripes
    for (let offset = -40; offset < 80; offset += 16) {
      g.beginPath();
      g.moveTo(offset, 0);
      g.lineTo(offset + 8, 0);
      g.lineTo(offset - 8, 48);
      g.lineTo(offset - 16, 48);
      g.closePath();
      g.fillPath();
    }
    // border & rivets
    g.lineStyle(3, 0x5e6a75);
    g.strokeRect(2, 2, 44, 44);
    // rivets
    g.fillStyle(0x7f8c8d);
    g.fillCircle(6, 6, 2.5);
    g.fillCircle(42, 6, 2.5);
    g.fillCircle(6, 42, 2.5);
    g.fillCircle(42, 42, 2.5);
    this.tex(g, 'hazard-piston', 48, 48);

    // 2. hazard-piston-rod (16x48) - steel piston shaft
    g.fillStyle(0x2d3436); g.fillRect(0, 0, 16, 48); // dark base
    g.fillStyle(0x636e72); g.fillRect(4, 0, 8, 48); // chrome highlight center
    g.fillStyle(0xdfe6e9); g.fillRect(6, 0, 2, 48); // bright white shine
    this.tex(g, 'hazard-piston-rod', 16, 48);

    // 3. hazard-laser-node (32x32) - circular generator node
    g.fillStyle(0x1e272e); g.fillCircle(16, 16, 15); // outer rim
    g.lineStyle(2, 0xd2dae2); g.strokeCircle(16, 16, 15);
    g.fillStyle(0x485460); g.fillCircle(16, 16, 11); // inner shield
    // red generator core
    g.fillStyle(0xff3f34); g.fillCircle(16, 16, 7);
    g.fillStyle(0xffffff); g.fillCircle(16, 16, 3);
    this.tex(g, 'hazard-laser-node', 32, 32);

    // 4. hazard-laser-beam (16x16) - pulsing electric beam
    g.fillStyle(0xff3f34, 0.4); g.fillRect(0, 0, 16, 16); // red outer glow
    g.fillStyle(0xff7f50); g.fillRect(0, 4, 16, 8); // orange inner
    g.fillStyle(0xffffff); g.fillRect(0, 6, 16, 4); // white hot core
    this.tex(g, 'hazard-laser-beam', 16, 16);
  }

  private drawZone3Enemies(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 1. enemy-seeker-drone (32x32) - Iron Empire scout drone
    // Octagonal boxy body
    g.fillStyle(0x2f3542);
    g.beginPath();
    g.moveTo(10, 2); g.lineTo(22, 2);
    g.lineTo(30, 10); g.lineTo(30, 22);
    g.lineTo(22, 30); g.lineTo(10, 30);
    g.lineTo(2, 22); g.lineTo(2, 10);
    g.closePath();
    g.fillPath();

    // Rivets
    g.fillStyle(0x0f141d);
    g.fillRect(10, 4, 2, 2);
    g.fillRect(20, 4, 2, 2);
    g.fillRect(26, 10, 2, 2);
    g.fillRect(26, 20, 2, 2);

    // Glowing red center sensor
    g.fillStyle(0xff4757); g.fillRect(8, 12, 16, 8);
    g.fillStyle(0xffffff); g.fillRect(14, 14, 4, 4);

    // Back stabilizer fins / side plates
    g.fillStyle(0x1e272e);
    g.fillRect(0, 12, 2, 8);
    g.fillRect(30, 12, 2, 8);
    this.tex(g, 'enemy-seeker-drone', 32, 32);

    // 2. enemy-mine-dropper (40x40) - crane mecha drone
    g.fillStyle(0x2f3542); g.fillRect(6, 6, 28, 20); // main box body
    g.fillStyle(0x1e272e); g.fillRect(2, 12, 4, 12); // left thruster
    g.fillRect(34, 12, 4, 12); // right thruster
    // yellow flame sparks under thrusters
    g.fillStyle(0xffa502); g.fillRect(3, 24, 2, 6); g.fillRect(35, 24, 2, 6);
    // bottom deployment clamp/arm
    g.fillStyle(0x747d8c); g.fillRect(14, 26, 12, 8);
    g.fillStyle(0x57606f); g.fillRect(12, 34, 4, 6); g.fillRect(24, 34, 4, 6);
    // hazard stripe panel
    g.fillStyle(0xeccc68); g.fillRect(10, 10, 20, 8);
    g.fillStyle(0x2f3542);
    g.beginPath();
    g.moveTo(10, 10); g.lineTo(14, 10); g.lineTo(10, 18); g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(18, 10); g.lineTo(22, 10); g.lineTo(18, 18); g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(26, 10); g.lineTo(30, 10); g.lineTo(26, 18); g.closePath(); g.fillPath();
    this.tex(g, 'enemy-mine-dropper', 40, 40);

    // 3. enemy-gunship (64x48) - heavy militarized jet fighter
    g.fillStyle(0x2f3542); // main body
    g.fillRect(16, 8, 32, 32);
    // cockpit / glowing visor
    g.fillStyle(0xff3838); g.fillRect(12, 16, 6, 16);
    g.fillStyle(0xffffff); g.fillRect(12, 22, 2, 4);

    // wings
    g.fillStyle(0x1e272e);
    g.beginPath();
    g.moveTo(32, 8); g.lineTo(56, 0); g.lineTo(44, 24); g.closePath(); g.fillPath();
    g.beginPath();
    g.moveTo(32, 40); g.lineTo(56, 48); g.lineTo(44, 24); g.closePath(); g.fillPath();

    // engine thrusters on the back
    g.fillStyle(0x57606f);
    g.fillRect(48, 12, 12, 8);
    g.fillRect(48, 28, 12, 8);
    g.fillStyle(0xff7f50); // fire exhaust
    g.fillRect(60, 14, 4, 4); g.fillRect(60, 30, 4, 4);

    // bottom cannons
    g.fillStyle(0x747d8c);
    g.fillRect(8, 30, 10, 4);
    g.fillRect(8, 14, 10, 4);
    this.tex(g, 'enemy-gunship', 64, 48);

    // 4. bullet-homing (16x16) - homing rocket
    g.fillStyle(0xced6e0); g.fillRect(4, 5, 8, 6); // missile body
    g.fillStyle(0xff4757); g.beginPath(); g.moveTo(4, 5); g.lineTo(0, 8); g.lineTo(4, 11); g.closePath(); g.fillPath(); // red nose
    g.fillStyle(0x2f3542); g.fillRect(12, 4, 2, 8); // tail fins
    g.fillStyle(0xffa502); g.fillRect(14, 6, 2, 4); // small exhaust fire
    this.tex(g, 'bullet-homing', 16, 16);

    // 5. bullet-mine (24x24) - hazard spike mine
    g.fillStyle(0x2f3542); g.fillCircle(12, 12, 8); // core
    g.lineStyle(1.5, 0xeccc68); g.strokeCircle(12, 12, 8); // yellow safety boundary
    // red spikes
    g.fillStyle(0xff4757);
    g.fillRect(11, 0, 2, 4);
    g.fillRect(11, 20, 2, 4);
    g.fillRect(0, 11, 4, 2);
    g.fillRect(20, 11, 4, 2);
    // diagonal spikes
    g.fillRect(3, 3, 3, 3);
    g.fillRect(18, 3, 3, 3);
    g.fillRect(3, 18, 3, 3);
    g.fillRect(18, 18, 3, 3);
    // center red blinking led
    g.fillStyle(0xff3838); g.fillCircle(12, 12, 2.5);
    g.fillStyle(0xffffff); g.fillCircle(12, 12, 1);
    this.tex(g, 'bullet-mine', 24, 24);
  }

  private drawAltarSave(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0 });

    // 0. Dragon Bone & Obsidian Mountain Base
    // Mountain from Y=120 to Y=240
    // Dark rock base
    g.fillStyle(0x0c0a0c);
    g.beginPath();
    g.moveTo(64, 120);
    g.lineTo(12, 160);
    g.lineTo(0, 240);
    g.lineTo(128, 240);
    g.lineTo(116, 160);
    g.closePath();
    g.fillPath();

    // Jagged obsidian rocks
    g.fillStyle(0x1a151f);
    g.fillTriangle(64, 130, 20, 240, 100, 240);
    g.fillStyle(0x2d2435);
    g.fillTriangle(64, 140, 40, 240, 80, 240);
    g.fillStyle(0x1a151f);
    g.fillTriangle(30, 160, 10, 240, 60, 240);
    g.fillTriangle(100, 150, 60, 240, 120, 240);

    // Giant ancient dragon ribs jutting out of the rock
    g.lineStyle(4, 0x8a8a7a, 1);
    g.beginPath(); g.moveTo(40, 200); g.lineTo(20, 160); g.lineTo(10, 170); g.strokePath();
    g.beginPath(); g.moveTo(80, 220); g.lineTo(110, 170); g.lineTo(125, 180); g.strokePath();
    g.lineStyle(2, 0xbfbfae, 1);
    g.beginPath(); g.moveTo(40, 200); g.lineTo(20, 160); g.strokePath();
    g.beginPath(); g.moveTo(80, 220); g.lineTo(110, 170); g.strokePath();

    // 1. Pedestal steps (stone blocks)
    // Bottom step: Y = 124 to 144 (height 20). Width = 112, centered (X from 8 to 120). Slate-grey.
    g.fillStyle(0x1e272e);
    g.fillRect(8, 124, 112, 20);
    g.fillStyle(0x2d3436);
    g.fillRect(12, 126, 104, 16);
    
    // Crack lines on bottom step
    g.lineStyle(1.5, 0x1e272e);
    g.lineBetween(30, 126, 35, 142);
    g.lineBetween(90, 126, 95, 138);

    // Middle step: Y = 104 to 124 (height 20). Width = 96, centered (X from 16 to 112).
    g.fillStyle(0x2d3436);
    g.fillRect(16, 104, 96, 20);
    g.fillStyle(0x57606f);
    g.fillRect(20, 106, 88, 16);
    
    // Crack lines on middle step
    g.lineBetween(50, 106, 52, 122);
    g.lineBetween(75, 106, 78, 118);

    // Top step / Altar table: Y = 84 to 104 (height 20). Width = 80, centered (X from 24 to 104).
    g.fillStyle(0x747d8c);
    g.fillRect(24, 84, 80, 20);
    g.fillStyle(0xdcdde1);
    g.fillRect(28, 86, 72, 16);

    // 2. Pillars at the sides (gothic/biomechanical columns)
    // Left pillar base: X from 12 to 28, Y from 84 to 104
    g.fillStyle(0x1e272e);
    g.fillRect(12, 80, 16, 24);
    g.fillStyle(0x2d3436);
    g.fillRect(14, 82, 12, 20);

    // Right pillar base: X from 100 to 116, Y from 84 to 104
    g.fillStyle(0x1e272e);
    g.fillRect(100, 80, 16, 24);
    g.fillStyle(0x2d3436);
    g.fillRect(102, 82, 12, 20);

    // Left pillar shaft: X from 14 to 26, Y from 36 to 80 (height = 44)
    g.fillStyle(0x2d3436);
    g.fillRect(14, 36, 12, 44);
    // Left pillar highlights / pipes wrap
    g.fillStyle(0x57606f);
    g.fillRect(16, 36, 4, 44); // pipe 1
    g.fillStyle(0xdcdde1);
    g.fillRect(17, 36, 1, 44); // pipe highlight
    g.fillStyle(0x747d8c);
    g.fillRect(22, 36, 3, 44); // pipe 2

    // Right pillar shaft: X from 102 to 114, Y from 36 to 80 (height = 44)
    g.fillStyle(0x2d3436);
    g.fillRect(102, 36, 12, 44);
    // Right pillar highlights / pipes wrap
    g.fillStyle(0x57606f);
    g.fillRect(104, 36, 4, 44); // pipe 1
    g.fillStyle(0xdcdde1);
    g.fillRect(105, 36, 1, 44); // pipe highlight
    g.fillStyle(0x747d8c);
    g.fillRect(110, 36, 3, 44); // pipe 2

    // Horizontal metal collars on pillars
    g.fillStyle(0x1e272e);
    g.fillRect(12, 46, 16, 4);
    g.fillRect(12, 66, 16, 4);
    g.fillRect(100, 46, 16, 4);
    g.fillRect(100, 66, 16, 4);

    // Left pillar cap: X from 12 to 28, Y from 32 to 36
    g.fillStyle(0x1e272e);
    g.fillRect(12, 32, 16, 4);
    // Right pillar cap: X from 100 to 116, Y from 32 to 36
    g.fillStyle(0x1e272e);
    g.fillRect(100, 32, 16, 4);

    // 3. Gothic Arch connecting the pillars at the top: Y from 0 to 32
    g.fillStyle(0x1e272e);
    g.beginPath();
    g.moveTo(14, 32);
    g.lineTo(64, 0); // Pointy gothic peak at top center
    g.lineTo(114, 32);
    g.lineTo(98, 32);
    g.lineTo(64, 8); // Inner arch peak
    g.lineTo(30, 32);
    g.closePath();
    g.fillPath();

    // Arch outline highlight
    g.lineStyle(2, 0x57606f, 1);
    g.beginPath();
    g.moveTo(14, 32);
    g.lineTo(64, 0);
    g.lineTo(114, 32);
    g.strokePath();

    // 4. Glowing mecha-pink runes on steps and pillars
    g.fillStyle(0xff0055);
    // steps runes
    g.fillRect(36, 112, 6, 3);
    g.fillRect(86, 112, 6, 3);
    g.fillRect(45, 132, 8, 3);
    g.fillRect(75, 132, 8, 3);
    // pillars runes
    g.fillRect(15, 52, 2, 8);
    g.fillRect(111, 52, 2, 8);
    g.fillRect(23, 40, 2, 6);
    g.fillRect(103, 40, 2, 6);

    // 5. Giant floating crystal core (Draconel Heart) in the center chamber
    // Float chamber: X from 28 to 100, Y from 32 to 84 (Center is X=64, Y=58)
    
    // Biomechanical tubes connecting the core area to the pillars
    g.lineStyle(2, 0x2f3542, 1);
    g.lineBetween(20, 58, 44, 58);
    g.lineBetween(108, 58, 84, 58);
    
    g.fillStyle(0xff0055);
    // Giant crystal core
    g.beginPath();
    g.moveTo(64, 36);  // top peak
    g.lineTo(46, 58);  // left corner
    g.lineTo(64, 80);  // bottom peak
    g.lineTo(82, 58);  // right corner
    g.closePath();
    g.fillPath();

    // Inner glowing white core
    g.fillStyle(0xffffff);
    g.beginPath();
    g.moveTo(64, 44);
    g.lineTo(54, 58);
    g.lineTo(64, 72);
    g.lineTo(74, 58);
    g.closePath();
    g.fillPath();

    // Small floating pink diamond embers around the core
    g.fillStyle(0xff0055);
    g.fillRect(40, 42, 4, 4);
    g.fillRect(84, 42, 4, 4);
    g.fillRect(40, 70, 4, 4);
    g.fillRect(84, 70, 4, 4);

    this.tex(g, 'altar-save', 128, 240);
  }

}
