import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_ZOOM_HUMAN, CAMERA_LERP } from '../utils/constants';
import { t } from '../i18n';

export class TransitionScene12 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  public currentBiome: string | undefined;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;
  private terrainGen!: TerrainGenerator;

  constructor() { super({ key: 'TransitionScene12' }); }

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
    this.cameras.main.setBackgroundColor('#080610');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'forest';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene12' }); });

    // Full-viewport backgrounds (scrollFactor to allow slight parallax)
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.05).setDepth(-30);
    this.add.tileSprite(0, H * 0.45, W * 1.5, H * 0.55, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.1).setDepth(-20).setAlpha(0.5).setTint(0x553344);
    const mist = this.add.tileSprite(0, H * 0.45, W * 1.5, H * 0.3, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.15).setDepth(-18).setAlpha(0.25);
    this.tweens.add({ targets: mist, tilePositionX: 800, duration: 40000, loop: -1 });
    this.add.tileSprite(0, H * 0.5, W * 1.5, H * 0.5, 'bg-forest').setOrigin(0, 0).setScrollFactor(0.2).setDepth(-15).setAlpha(0.45).setTint(0x332233);
    const moon = this.add.image(W * 0.15, H * 0.15, 'bg-moon').setOrigin(0.5).setScrollFactor(0.02).setDepth(-25).setAlpha(0.85);
    this.tweens.add({ targets: moon, y: moon.y - 5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Ground
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, W - 260, 'forest', 10);
    this.terrainGen.generateGroundSegment(this.platforms, W - 260, groundY, 260, 'refinery', 11);

    this.drawWastelandEntrance(W, groundY);

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
    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene12');
    const altarGlow = this.add.pointlight(W / 2, groundY - 180, 0xff0044, 80, 0.4).setDepth(-1);
    this.tweens.add({ targets: altarGlow, radius: 100, intensity: 0.6, duration: 1500, yoyo: true, repeat: -1 });

    this.physics.add.collider(this.player, this.platforms);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x88809c);
      this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
      if (this.player && this.player.active) this.player.setLighting(true);
      this.saveAltar.setLighting(true);
      
      const altarLight = this.lights.addLight(W / 2, groundY - 180, 180, 0xff0044, 1.8);
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

    // Camera bounds to match world and player follow
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  private drawWastelandEntrance(W: number, groundY: number): void {
    const gateX = W - 350;
    const g = this.add.graphics().setDepth(-10);
    
    // Draw rusted background piping and scaffolding
    g.lineStyle(8, 0x221a15, 1); // Thick pipe
    g.beginPath();
    g.moveTo(gateX - 50, 480);
    g.lineTo(W, 420);
    g.strokePath();

    g.lineStyle(6, 0x1c1512, 1); // Rusted structural support beams
    g.beginPath();
    g.moveTo(gateX + 50, groundY);
    g.lineTo(gateX + 50, 320);
    g.lineTo(W, 300);
    g.strokePath();

    // Cross trusses
    g.lineStyle(3, 0x2a1d17, 0.8);
    for (let y = 350; y < groundY; y += 80) {
      g.beginPath();
      g.moveTo(gateX + 50, y);
      g.lineTo(W, y + 40);
      g.moveTo(W, y);
      g.lineTo(gateX + 50, y + 40);
      g.strokePath();
    }

    // Broken chain-link fence
    g.lineStyle(1.5, 0x2e201a, 0.7);
    const fenceY = groundY - 180;
    for (let fx = gateX - 40; fx < gateX + 120; fx += 16) {
      g.beginPath();
      g.moveTo(fx, groundY);
      g.lineTo(fx + 24, fenceY);
      g.moveTo(fx + 24, groundY);
      g.lineTo(fx, fenceY);
      g.strokePath();
    }

    // Rusted warning hazard sign (slightly crooked)
    const signX = gateX - 80, signY = groundY - 140;
    g.fillStyle(0x4a1a0c, 1); // Sign border/back
    g.fillRect(signX - 2, signY - 2, 64, 44);
    g.fillStyle(0xd49b25, 1); // Yellowed rusted face
    g.fillRect(signX, signY, 60, 40);
    
    // Hazard stripes
    g.fillStyle(0x1d1510, 0.85);
    for (let sx = 0; sx < 60; sx += 15) {
      g.beginPath();
      g.moveTo(signX + sx, signY);
      g.lineTo(signX + sx + 10, signY);
      g.lineTo(signX + sx, signY + 40);
      g.lineTo(signX + sx - 10, signY + 40);
      g.closePath();
      g.fillPath();
    }

    // Blinking warning light on a rusted post
    const lightX = gateX - 50, lightY = groundY - 220;
    g.lineStyle(4, 0x221a15, 1); // Post
    g.beginPath(); g.moveTo(lightX, groundY); g.lineTo(lightX, lightY); g.strokePath();
    
    g.fillStyle(0x1a1210, 1);
    g.fillCircle(lightX, lightY, 10);
    g.fillStyle(0xff7700, 1); // Orange warning light
    g.fillCircle(lightX, lightY, 6);
    this.add.pointlight(lightX, lightY, 0xff8800, 60, 0.5).setDepth(-9);
  }

  update(time: number, delta: number): void {
    if (this.player?.active) {
      this.gameAudio?.update(this.player.x);
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }
    if (this.saveAltar?.active) this.saveAltar.updatePrompt(this.player);
    if (this.player.active && !this.hasTransitioned) {
      if (this.player.x <= 40) this.transitionToLevel1();
      if (this.player.x >= 1880) this.transitionToLevel2();
    }
  }

  private transitionToLevel1(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition(t('zones.ashenWoods'), '#886644', () => {
      this.scene.start('GameScene', { startPos: { x: 7800, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: this.player.formMachine.isMechaUnlocked(), dragonUnlocked: this.player.formMachine.isDragonUnlocked() });
    });
  }

  private transitionToLevel2(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition(t('zones.industrialWasteland'), '#ff6622', () => {
      this.scene.start('GameScene2', { startPos: { x: 150, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: this.player.formMachine.isMechaUnlocked(), dragonUnlocked: this.player.formMachine.isDragonUnlocked() });
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
}
