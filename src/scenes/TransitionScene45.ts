import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_LERP } from '../utils/constants';

export class TransitionScene45 extends Phaser.Scene {
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

  constructor() { super({ key: 'TransitionScene45' }); }

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
    this.cameras.main.setBackgroundColor('#08060c');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'foundry';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene45' }); });

    // Backgrounds — foundry atmosphere
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-refinery-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30).setTint(0x662222, 0x662222, 0x331111, 0x331111);
    this.add.tileSprite(0, H * 0.35, W * 1.5, H * 0.55, 'bg-refinery-furnaces').setOrigin(0, 0).setScrollFactor(0.08).setDepth(-20).setAlpha(0.4).setTint(0x664444, 0x663344, 0x331122, 0x442233);
    const smog = this.add.tileSprite(0, H * 0.4, W * 1.5, H * 0.3, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.2).setDepth(-18).setAlpha(0.28).setTint(0xff4422);
    this.tweens.add({ targets: smog, tilePositionX: 400, duration: 18000, loop: -1 });
    const smog2 = this.add.tileSprite(0, H * 0.55, W * 1.5, H * 0.2, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-17).setAlpha(0.2).setTint(0xaa5522);
    this.tweens.add({ targets: smog2, tilePositionX: -300, duration: 25000, loop: -1 });
    // Dark forest silhouette at base
    this.add.tileSprite(0, H * 0.55, W * 1.5, H * 0.3, 'bg-forest').setOrigin(0, 0).setScrollFactor(0.28).setDepth(-14).setAlpha(0.35).setTint(0x331100);

    this.drawFoundryGate(W, H);

    // Organic ground
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, W, 'forest', 40);

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
    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene45');
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
      if (this.player.x <= 40) this.transitionToLevel34();
      if (this.player.x >= 1880) this.transitionToLevel4();
    }
  }

  private transitionToLevel34(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('FOUNDRY GATES', '#ff6622', () => {
      this.scene.start('GameScene4', { startPos: { x: 14800, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    });
  }

  private transitionToLevel4(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('ZONE 5 — COMING SOON', '#ffaa44', () => {
      // Zone 5 not yet implemented — return to title for now
      this.scene.start('BootScene');
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

  private drawFoundryGate(W: number, H: number): void {
    const gateX = W - 280;
    const groundY = 736;
    const g = this.add.graphics().setDepth(-10);

    // Main wall
    g.fillStyle(0x150f0c, 1);
    g.fillRect(gateX, 280, W - gateX, 470);
    g.fillStyle(0x1c1410, 0.6);
    g.fillRect(gateX + 8, 290, W - gateX - 16, 450);
    // Girder lines
    g.fillStyle(0x0a0604, 0.6);
    for (let sy = 320; sy < 740; sy += 45) g.fillRect(gateX, sy, W - gateX, 3);
    // Vertical pillars
    g.fillRect(gateX + 70, 280, 5, 470);
    g.fillRect(gateX + 180, 280, 5, 470);
    // Rivets
    for (let py = 300; py < 700; py += 18) {
      g.fillStyle(0x2a1a10, 0.8);
      g.fillCircle(gateX + 75, py, 3);
      g.fillCircle(gateX + 185, py, 3);
    }

    // Gate door
    const doorW = 100, doorH = 240;
    g.fillStyle(0x080503, 1);
    g.fillRect(gateX + 15, groundY - doorH, doorW, doorH);
    g.lineStyle(4, 0x3a2010, 1);
    g.strokeRect(gateX + 15, groundY - doorH, doorW, doorH);
    g.fillStyle(0xd4a030, 1);
    g.fillRect(gateX + 15 + doorW, groundY - doorH, 15, doorH);
    for (let sy = groundY - doorH; sy < groundY; sy += 24) {
      g.beginPath(); g.moveTo(gateX + 15 + doorW, sy); g.lineTo(gateX + 15 + doorW + 15, sy + 12); g.lineTo(gateX + 15 + doorW + 15, sy + 24); g.lineTo(gateX + 15 + doorW, sy + 12); g.closePath(); g.fillPath();
    }

    // Forge glow
    g.fillStyle(0xff4400, 1);
    g.fillCircle(gateX + 140, 360, 8);
    g.lineStyle(2, 0xff6622, 0.7);
    g.strokeCircle(gateX + 140, 360, 12);
    this.add.pointlight(gateX + 140, 360, 0xff3300, 70, 0.55).setDepth(-9);

    // Smoke vents
    g.fillStyle(0x1a1008, 1);
    for (let vx = gateX + 50; vx < W - 20; vx += 70) {
      g.fillRect(vx, 290, 12, 16);
      g.fillStyle(0x0d0804, 0.5);
      g.fillRect(vx + 2, 280, 8, 12);
    }
  }
}
