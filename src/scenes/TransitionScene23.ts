import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { FormState } from '../systems/FormStateMachine';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_ZOOM_HUMAN, CAMERA_LERP } from '../utils/constants';

export class TransitionScene23 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  public currentBiome: string | undefined;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingMechaUnlock = true;
  private pendingDragonUnlock = true;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;
  private terrainGen!: TerrainGenerator;

  constructor() { super({ key: 'TransitionScene23' }); }

  init(data?: any): void {
    this.hasTransitioned = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.mechaUnlocked !== undefined) this.pendingMechaUnlock = data.mechaUnlocked;
      if (data.dragonUnlocked !== undefined) this.pendingDragonUnlock = data.dragonUnlocked;
    }
  }

  create(): void {
    const W = 1920, H = 1080;
    const vw = this.scale.width;
    const vh = this.scale.height;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#0a080c');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'refinery';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene23' }); });

    // Full-viewport backgrounds — Refinery industrial depth
    // Layer 0: Sky
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30).setTint(0x331133);
    // Layer 1: Moon — bright orange, bobbing
    const moon = this.add.image(W * 0.78, H * 0.16, 'bg-moon').setOrigin(0.5).setScrollFactor(0.02).setDepth(-28).setAlpha(0.85).setTint(0xff8844);
    this.tweens.add({ targets: moon, y: moon.y - 6, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Layer 2: Mountains — visible silhouette
    this.add.tileSprite(0, H * 0.35, W * 1.5, H * 0.55, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.08).setDepth(-22).setAlpha(0.55).setTint(0x332244);
    // Layer 3: Far smog — slow drift, orange
    const smogFar = this.add.tileSprite(0, H * 0.30, W * 1.5, H * 0.30, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-20).setAlpha(0.5).setTint(0xff5500);
    this.tweens.add({ targets: smogFar, tilePositionX: 400, duration: 30000, loop: -1 });
    // Layer 4: Mid smog — faster drift, red-orange
    const smogMid = this.add.tileSprite(0, H * 0.40, W * 1.5, H * 0.28, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.18).setDepth(-19).setAlpha(0.45).setTint(0xff3300);
    this.tweens.add({ targets: smogMid, tilePositionX: -500, duration: 20000, loop: -1 });
    // Layer 5: Near smog — fast, dense
    const smogNear = this.add.tileSprite(0, H * 0.50, W * 1.5, H * 0.22, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.25).setDepth(-18).setAlpha(0.4).setTint(0xcc4400);
    this.tweens.add({ targets: smogNear, tilePositionX: 700, duration: 15000, loop: -1 });
    // Layer 6: Forest silhouette at base
    this.add.tileSprite(0, H * 0.50, W * 1.5, H * 0.35, 'bg-forest').setOrigin(0, 0).setScrollFactor(0.30).setDepth(-15).setAlpha(0.5).setTint(0x331100);
    // Layer 7: Furnace glow — animated large point lights
    this.drawRefineryFurnaceGlow(W, H);

    // Ember rain
    this.startRefineryEmbers(W, H);

    this.drawRefineryBackdrop(W);

    // Ground — organic up to cliff edge
    const groundY = 736;
    const cliffEdgeX = W - 300;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, cliffEdgeX, 'refinery', 20);

    // Tarot
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null));

    // Player
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // Altar
    this.saveAltar = new SaveAltar(this, W / 2 - 200, groundY, 'TransitionScene23');
    const altarGlow = this.add.pointlight(W / 2 - 200, groundY - 180, 0xff0044, 80, 0.4).setDepth(-1);
    this.tweens.add({ targets: altarGlow, radius: 100, intensity: 0.6, duration: 1500, yoyo: true, repeat: -1 });

    this.physics.add.collider(this.player, this.platforms);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x88809c);
      this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
      if (this.player && this.player.active) this.player.setLighting(true);
      this.saveAltar.setLighting(true);
      
      const altarLight = this.lights.addLight(W / 2 - 200, groundY - 180, 180, 0xff0044, 1.8);
      this.tweens.add({
        targets: altarLight,
        intensity: { from: 1.2, to: 2.2 },
        radius: { from: 150, to: 200 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  private drawRefineryBackdrop(W: number): void {
    const g = this.add.graphics().setDepth(-10);
    const wallW = 260; // Wider start area
    g.fillStyle(0x151d25, 1);
    g.fillRect(0, 350, wallW, 500);
    g.fillStyle(0x1c2834, 0.6);
    g.fillRect(10, 360, wallW - 20, 480);
    g.fillStyle(0x0d1218, 0.5);
    g.fillRect(0, 400, wallW, 3);
    g.fillRect(0, 500, wallW, 3);
    g.fillRect(0, 800, wallW, 3);

    const doorW = 100, doorH = 260;
    g.fillStyle(0x0a0e13, 1);
    g.fillRect(65, 736 - doorH, doorW, doorH);
    g.lineStyle(4, 0x3a4a5a, 1);
    g.strokeRect(65, 736 - doorH, doorW, doorH);
    g.fillStyle(0xe8b830, 1);
    g.fillRect(165, 736 - doorH, 15, doorH);
    g.fillStyle(0x1c2834, 1);
    for (let sy = 736 - doorH; sy < 736; sy += 24) {
      g.beginPath(); g.moveTo(165, sy); g.lineTo(180, sy + 12); g.lineTo(180, sy + 24); g.lineTo(165, sy + 12); g.closePath(); g.fillPath();
    }
    g.fillStyle(0x2a3a4a, 0.7);
    g.fillRect(15, 380, 12, 400);
    g.fillStyle(0x1a2530, 0.8);
    for (let py = 400; py < 760; py += 80) g.fillRect(11, py, 20, 10);
    
    // Light
    g.fillStyle(0xffa502, 1);
    g.fillCircle(190, 400, 8);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(190, 400, 8);
    this.add.pointlight(190, 400, 0xffa502, 60, 0.5).setDepth(-9);

    // Flame torches on factory wall
    for (let fy = 440; fy < 700; fy += 90) {
      const torchG = this.add.graphics().setDepth(-11);
      torchG.fillStyle(0x332211, 1);
      torchG.fillRect(206, fy - 8, 10, 24);
      torchG.fillStyle(0xff6600, 1);
      torchG.fillCircle(211, fy - 4, 5);
      torchG.fillStyle(0xffaa00, 0.6);
      torchG.fillCircle(211, fy - 6, 3);
      this.tweens.add({ targets: torchG, alpha: { from: 0.6, to: 1 }, duration: Phaser.Math.Between(400, 700), yoyo: true, repeat: -1 });
      this.add.pointlight(211, fy, 0xff4400, 30, 0.3).setDepth(-10);
    }

    // Cliff edge background structure
    const cliffEdgeX = W - 300;
    g.fillStyle(0x0a080c, 1);
    g.fillRect(cliffEdgeX, 600, W - cliffEdgeX, 200);
    g.fillStyle(0x12101a, 0.6);
    g.fillRect(cliffEdgeX, 600, W - cliffEdgeX, 6);
    g.fillStyle(0x08060a, 1);
    for (let cx = cliffEdgeX; cx < W; cx += 35) {
      g.fillRect(cx, 790, 25, Phaser.Math.Between(10, 30));
    }
    g.fillStyle(0x12101a, 0.5);
    g.fillCircle(cliffEdgeX + 30, 610, 8);
    g.fillCircle(cliffEdgeX + 80, 620, 6);
    g.fillCircle(cliffEdgeX + 50, 640, 10);
  }

  update(time: number, delta: number): void {
    const cliffEdgeX = 1920 - 300;
    if (this.player?.active) {
      this.gameAudio?.update(this.player.x);
      this.playerShadow.setAlpha(this.player.x < cliffEdgeX ? 0.5 : 0);
      if (this.player.x < cliffEdgeX) {
        this.playerShadow.x = this.player.x;
        this.playerShadow.y = this.player.y + 24;
        this.playerShadow.setScale(this.player.scaleX);
      }
      if (this.player.y > 1080 && this.player.alive) this.player.takeDamage(100, 0);
    }
    if (this.saveAltar?.active) this.saveAltar.updatePrompt(this.player);
    if (this.player.active && this.player.alive && !this.hasTransitioned) {
      if (this.player.x <= 40) this.transitionToLevel2();
      if (this.player.x >= 1800 && this.player.formMachine.state === FormState.DRAGON) this.transitionToLevel3();
    }
  }

  private transitionToLevel2(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('SMELTING REFINERY', '#ff6622', () => {
      this.scene.start('GameScene2', { startPos: { x: 7800, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: this.player.formMachine.isMechaUnlocked(), dragonUnlocked: this.player.formMachine.isDragonUnlocked() });
    });
  }

  private transitionToLevel3(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('ASHEN GORGE', '#9933cc', () => {
      this.scene.start('GameScene3', { startPos: { x: 150, y: 400 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    });
  }

  private showZoneTransition(zoneName: string, color: string, onComplete: () => void): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const text = this.add.text(cx, cy, zoneName, { fontSize: '28px', fontFamily: 'Georgia, serif', color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5).setAlpha(0).setDepth(300).setScrollFactor(0);
    this.tweens.add({ targets: text, alpha: { from: 0, to: 0.9 }, duration: 300, yoyo: true, hold: 600 });
    const maxR = Math.sqrt((this.scale.width / 2) ** 2 + (this.scale.height / 2) ** 2);
    this.tweens.addCounter({ from: 0, to: maxR, duration: 900, ease: 'Power3', onUpdate: (tween) => {
      const r = tween.getValue(); if (r == null) return;
      const g2 = this.add.graphics().setDepth(500).setScrollFactor(0);
      g2.fillStyle(0x000000, 1); g2.fillCircle(this.scale.width / 2, this.scale.height / 2, r);
      this.time.delayedCall(50, () => g2.destroy());
    }});
    this.time.delayedCall(900, onComplete);
  }

  private drawRefineryFurnaceGlow(W: number, H: number): void {
    // Large furnace glow behind the scene — animated
    const furnaces = [
      { x: W * 0.15, y: H * 0.55, r: 200, color: 0xff3300, int: 0.8 },
      { x: W * 0.55, y: H * 0.52, r: 250, color: 0xff4400, int: 0.9 },
      { x: W * 0.85, y: H * 0.58, r: 180, color: 0xff2200, int: 0.7 },
    ];
    for (const f of furnaces) {
      const light = this.add.pointlight(f.x, f.y, f.color, f.r, f.int).setDepth(-12);
      this.tweens.add({
        targets: light,
        intensity: { from: f.int * 0.6, to: f.int * 1.3 },
        radius: { from: f.r * 0.7, to: f.r * 1.2 },
        duration: Phaser.Math.Between(1800, 3000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  private startRefineryEmbers(W: number, H: number): void {
    this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(50, W + 150);
        const ember = this.add.rectangle(x, -10, Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5),
          Phaser.Utils.Array.GetRandom([0xff4400, 0xff6600, 0xffaa00, 0xcc2200]), 0.7);
        ember.setBlendMode(Phaser.BlendModes.ADD).setDepth(20).setScrollFactor(0);
        this.tweens.add({
          targets: ember, x: x + Phaser.Math.Between(-100, 100), y: H + 20,
          alpha: 0, duration: Phaser.Math.Between(2000, 5000),
          onComplete: () => ember.destroy()
        });
      }
    });
  }
}
