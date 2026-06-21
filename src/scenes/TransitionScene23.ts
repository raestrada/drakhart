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

    // Full-viewport backgrounds
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.05).setDepth(-30).setTint(0x331133);
    this.add.tileSprite(0, H * 0.45, W * 1.5, H * 0.5, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.1).setDepth(-20).setAlpha(0.4).setTint(0x332244);
    const smog = this.add.tileSprite(0, H * 0.4, W * 1.5, H * 0.35, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.2).setDepth(-18).setAlpha(0.3).setTint(0xff6622);
    this.tweens.add({ targets: smog, tilePositionX: 600, duration: 25000, loop: -1 });

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
}
