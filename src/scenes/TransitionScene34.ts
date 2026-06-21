import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_LERP } from '../utils/constants';

export class TransitionScene34 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  public currentBiome: string | undefined;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private saveAltar!: SaveAltar;
  private tarotSystem!: TarotSystem;
  private playerShadow!: Phaser.GameObjects.Image;
  private terrainGen!: TerrainGenerator;

  private pendingSpawnX = 150;
  private pendingSpawnY = 650;
  private pendingCardsToCollect: string[] = [];
  private hasTransitioned = false;
  private frameCount = 0;

  constructor() { super({ key: 'TransitionScene34' }); }

  init(data?: any): void {
    this.hasTransitioned = false;
    this.frameCount = 0;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
    }
  }

  create(): void {
    const W = 1920, H = 1080;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#0a080c');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'foundry';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene34' }); });

    // Backgrounds — gorge into foundry
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30).setTint(0x221133);
    this.add.tileSprite(0, H * 0.3, W * 1.5, H * 0.6, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0.08).setDepth(-20).setAlpha(0.4).setTint(0x443355);
    const mist = this.add.tileSprite(0, H * 0.4, W * 1.5, H * 0.3, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.15).setDepth(-18).setAlpha(0.25).setTint(0x9944aa);
    this.tweens.add({ targets: mist, tilePositionX: 500, duration: 20000, loop: -1 });
    const mist2 = this.add.tileSprite(0, H * 0.55, W * 1.5, H * 0.25, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.1).setDepth(-17).setAlpha(0.18).setTint(0xff6622);
    this.tweens.add({ targets: mist2, tilePositionX: -300, duration: 28000, loop: -1 });

    // Floating gorge rocks (silhouettes)
    this.drawGorgeFloatingRocks(W, H);
    // Foundry wall on the right side
    this.drawFoundryWall(W, H);

    // Organic ground
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, W, 'forest', 30);

    // Tarot
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null));

    // Player
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    this.player.formMachine.unlockTransform();
    this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // Altar
    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene34');
    const altarGlow = this.add.pointlight(W / 2, groundY - 180, 0xff0044, 80, 0.4).setDepth(-1);
    this.tweens.add({ targets: altarGlow, radius: 100, intensity: 0.6, duration: 1500, yoyo: true, repeat: -1 });

    this.physics.add.collider(this.player, this.platforms);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x665544);
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

    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);
  }

  update(time: number, delta: number): void {
    this.frameCount++;
    if (this.player?.active) {
      this.player.update(time, delta);
      this.saveAltar.updatePrompt(this.player);
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }
    if (!this.hasTransitioned && this.frameCount > 30) {
      if (this.player.x <= 40) this.transitionToLevel3();
      if (this.player.x >= 1880) this.transitionToLevel4();
    }
  }

  private transitionToLevel3(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('ASHEN GORGE', '#9933cc', () => {
      this.scene.start('GameScene3', { startPos: { x: 7800, y: 400 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    });
  }

  private transitionToLevel4(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('THE FOUNDRY GATES', '#ff6622', () => {
      this.scene.start('GameScene4', { startPos: { x: 150, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
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

  private drawGorgeFloatingRocks(W: number, H: number): void {
    const g = this.add.graphics().setDepth(-12);
    const rocks = [
      { x: W * 0.25, y: H * 0.25, w: 60, h: 20 },
      { x: W * 0.45, y: H * 0.2, w: 80, h: 24 },
      { x: W * 0.7, y: H * 0.28, w: 50, h: 16 },
      { x: W * 0.55, y: H * 0.32, w: 70, h: 18 },
    ];
    for (const r of rocks) {
      g.fillStyle(0x1a1520, 1);
      g.fillRect(r.x, r.y, r.w, r.h);
      g.fillStyle(0x221d28, 0.6);
      g.fillRect(r.x + 4, r.y - 4, r.w - 8, r.h + 6);
      g.fillStyle(0x0d0a12, 0.8);
      g.fillRect(r.x, r.y + r.h - 4, r.w, 6);
    }
  }

  private drawFoundryWall(W: number, H: number): void {
    const gateX = W - 300;
    const groundY = 736;
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x151210, 1);
    g.fillRect(gateX, 300, W - gateX, 450);
    g.fillStyle(0x1c1814, 0.6);
    g.fillRect(gateX + 10, 310, W - gateX - 20, 430);
    g.fillStyle(0x0d0a08, 0.5);
    for (let sy = 340; sy < 760; sy += 40) g.fillRect(gateX, sy, W - gateX, 3);
    g.fillRect(gateX + 80, 300, 6, 460);
    g.fillRect(gateX + 200, 300, 6, 460);

    const doorW = 120, doorH = 240;
    g.fillStyle(0x0a0705, 1);
    g.fillRect(gateX + 10, groundY - doorH, doorW, doorH);
    g.lineStyle(4, 0x3a2a1a, 1);
    g.strokeRect(gateX + 10, groundY - doorH, doorW, doorH);
    g.fillStyle(0xd4a030, 1);
    g.fillRect(gateX + 10 + doorW, groundY - doorH, 15, doorH);
    g.fillStyle(0x1c1814, 1);
    for (let sy = groundY - doorH; sy < groundY; sy += 24) {
      g.beginPath(); g.moveTo(gateX + 10 + doorW, sy); g.lineTo(gateX + 10 + doorW + 15, sy + 12); g.lineTo(gateX + 10 + doorW + 15, sy + 24); g.lineTo(gateX + 10 + doorW, sy + 12); g.closePath(); g.fillPath();
    }

    g.fillStyle(0xff4400, 1);
    g.fillCircle(gateX + 150, 370, 8);
    g.lineStyle(2, 0xff6622, 0.6);
    g.strokeCircle(gateX + 150, 370, 10);
    this.add.pointlight(gateX + 150, 370, 0xff3300, 70, 0.5).setDepth(-9);
  }
}
