import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { t } from '../i18n';

export class TransitionScene12 extends Phaser.Scene {
  public gameAudio!: GameAudio;
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
    const W = 1000;
    this.physics.world.setBounds(0, 0, W, 800);
    this.cameras.main.setBackgroundColor('#080610');

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(1);
    this.events.once('shutdown', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene12' }); });

    // ── Parallax Background ──
    this.add.tileSprite(0, 0, W, 800, 'bg-sky').setOrigin(0, 0).setDepth(-30);
    this.add.tileSprite(0, 420, W, 380, 'bg-mountains').setOrigin(0, 0).setDepth(-20).setAlpha(0.6).setTint(0x553344);
    const mist = this.add.tileSprite(0, 320, W, 200, 'bg-mist').setOrigin(0, 0).setDepth(-18).setAlpha(0.3);
    this.tweens.add({ targets: mist, tilePositionX: 800, duration: 40000, loop: -1 });
    this.add.tileSprite(0, 380, W, 380, 'bg-forest').setOrigin(0, 0).setDepth(-15).setAlpha(0.55).setTint(0x332233);

    // ── Moon ──
    const moon = this.add.image(180, 140, 'bg-moon').setOrigin(0.5).setDepth(-25).setAlpha(0.85);
    this.tweens.add({ targets: moon, y: 135, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Organic Ground ──
    this.platforms = this.physics.add.staticGroup();
    for (let tx = 0; tx < W; tx += 128) {
      const isRefinery = tx >= 750;
      const tex = isRefinery ? 'tile-refinery' : 'tile-ground';
      const b1 = this.platforms.create(tx + 64, 752, tex) as Phaser.Physics.Arcade.Sprite;
      b1.setDisplaySize(128, 48); b1.refreshBody(); b1.setDepth(3);
      const b2 = this.platforms.create(tx + 64, 784, tex) as Phaser.Physics.Arcade.Sprite;
      b2.setDisplaySize(128, 32); b2.refreshBody(); b2.setDepth(3);
      if (!isRefinery) {
        const g = this.platforms.create(tx + 64, 740, 'tile-grass') as Phaser.Physics.Arcade.Sprite;
        g.setDisplaySize(128, 12); g.refreshBody(); g.setDepth(3);
      }
    }

    // ── Factory Entrance (right side, detailed) ──
    this.drawFactoryEntrance(W);

    // ── Tarot ──
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null as any));

    // ── Player ──
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // ── Altar — center of the screen ──
    this.saveAltar = new SaveAltar(this, 500, 736, 'TransitionScene12');

    // ── Colliders ──
    this.physics.add.collider(this.player, this.platforms);

    // ── Camera — centered on altar area, closer zoom ──
    this.cameras.main.setBounds(0, 0, W, 800);
    this.cameras.main.setZoom(1.6);
    this.cameras.main.scrollX = 300;
    this.cameras.main.scrollY = 100;

    // ── Vignette ──
    const vig = this.add.graphics().setDepth(100);
    vig.fillStyle(0x000000, 0.35);
    vig.fillRect(0, 0, W, 800);
    vig.setScrollFactor(0);
  }

  private drawFactoryEntrance(W: number): void {
    const g = this.add.graphics().setDepth(-10);
    const gateX = 750;

    // Main factory wall — dark industrial steel
    g.fillStyle(0x151d25, 1);
    g.fillRect(gateX, 420, W - gateX, 380);
    // Lighter panel inset
    g.fillStyle(0x1c2834, 0.6);
    g.fillRect(gateX + 10, 430, W - gateX - 20, 360);

    // Horizontal rivet seams
    g.fillStyle(0x0d1218, 0.5);
    for (let sy = 440; sy < 780; sy += 40) {
      g.fillRect(gateX, sy, W - gateX, 2);
    }
    // Vertical seam
    g.fillRect(gateX + 125, 420, 2, 380);

    // Arched doorway
    g.fillStyle(0x0a0e13, 1);
    g.fillRect(gateX + 30, 520, 140, 260);
    // Arch top
    g.fillStyle(0x0a0e13, 1);
    const archCX = gateX + 100;
    const archCY = 520;
    g.fillCircle(archCX, archCY, 70);
    g.fillStyle(0x151d25, 1); // cut top off circle
    g.fillRect(gateX + 25, 400, 150, 120);

    // Door frame
    g.lineStyle(3, 0x3a4a5a, 1);
    g.strokeRect(gateX + 30, 520, 140, 260);
    // Arch frame
    g.lineStyle(3, 0x3a4a5a, 1);
    g.beginPath(); g.arc(archCX, archCY, 70, Math.PI, 0); g.strokePath();

    // Hazard stripes beside door
    g.fillStyle(0xe8b830, 1);
    g.fillRect(gateX + 20, 520, 10, 260);
    g.fillStyle(0x1c2834, 1);
    for (let sy = 520; sy < 780; sy += 16) {
      g.beginPath(); g.moveTo(gateX + 20, sy); g.lineTo(gateX + 30, sy + 8); g.lineTo(gateX + 30, sy + 16); g.lineTo(gateX + 20, sy + 8); g.closePath(); g.fillPath();
    }

    // Pipes on wall
    g.fillStyle(0x2a3a4a, 0.7);
    g.fillRect(gateX + 180, 460, 12, 320);
    g.fillStyle(0x3a5060, 0.5);
    g.fillRect(gateX + 182, 460, 4, 320);
    // Pipe joints
    g.fillStyle(0x1a2530, 0.8);
    for (let py = 480; py < 760; py += 80) {
      g.fillRect(gateX + 176, py, 20, 8);
    }

    // Small pipe
    g.fillStyle(0x2a3540, 0.6);
    g.fillRect(gateX + 205, 500, 8, 280);

    // Glowing warning light
    const lightX = gateX + 150;
    g.fillStyle(0x1a1010, 1);
    g.fillCircle(lightX, 460, 8);
    g.fillStyle(0xff3322, 1);
    g.fillCircle(lightX, 460, 5);
    g.lineStyle(2, 0xff5566, 0.5);
    g.strokeCircle(lightX, 460, 8);

    // Steam exhaust at top
    g.fillStyle(0x1c2834, 1);
    g.fillRect(gateX + 235, 430, 12, 40);
    g.fillStyle(0x0d1218, 0.5);
    g.fillRect(gateX + 237, 425, 8, 6);
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
      if (this.player.x <= 60) this.transitionToLevel1();
      if (this.player.x >= 940) this.transitionToLevel2();
    }
  }

  private transitionToLevel1(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('ASHEN WOODS', '#886644', () => {
      this.scene.start('GameScene', { startPos: { x: 7800, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: this.player.formMachine.isMechaUnlocked(), dragonUnlocked: this.player.formMachine.isDragonUnlocked() });
    });
  }

  private transitionToLevel2(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition('SMELTING REFINERY', '#ff6622', () => {
      this.scene.start('GameScene2', { startPos: { x: 150, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: this.player.formMachine.isMechaUnlocked(), dragonUnlocked: this.player.formMachine.isDragonUnlocked() });
    });
  }

  private showZoneTransition(zoneName: string, color: string, onComplete: () => void): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const text = this.add.text(cx, cy, zoneName, { fontSize: '28px', fontFamily: 'Georgia, serif', color, stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5).setAlpha(0).setDepth(300).setScrollFactor(0);
    this.tweens.add({ targets: text, alpha: { from: 0, to: 0.9 }, duration: 300, yoyo: true, hold: 600 });

    const { width, height } = this.scale;
    const maxR = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
    this.tweens.addCounter({ from: 0, to: maxR, duration: 900, ease: 'Power3', onUpdate: (tween) => {
      const r = tween.getValue(); if (r == null) return;
      const g2 = this.add.graphics().setDepth(500).setScrollFactor(0);
      g2.fillStyle(0x000000, 1); g2.fillCircle(width / 2, height / 2, r);
      this.time.delayedCall(50, () => g2.destroy());
    }});
    this.time.delayedCall(900, onComplete);
  }
}
