import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { FormState } from '../systems/FormStateMachine';
import { t } from '../i18n';

export class TransitionScene23 extends Phaser.Scene {
  public gameAudio!: GameAudio;
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
    const W = 1000;
    this.physics.world.setBounds(0, 0, W, 800);
    this.cameras.main.setBackgroundColor('#0a080c');

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(2);
    this.events.once('shutdown', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene23' }); });

    // ── Background ──
    this.add.tileSprite(0, 0, W, 800, 'bg-sky').setOrigin(0, 0).setDepth(-30).setTint(0x331133);
    this.add.tileSprite(0, 350, W, 450, 'bg-mountains').setOrigin(0, 0).setDepth(-20).setAlpha(0.5).setTint(0x332244);
    const smog = this.add.tileSprite(0, 280, W, 250, 'bg-mist').setOrigin(0, 0).setDepth(-18).setAlpha(0.35).setTint(0xff6622);
    this.tweens.add({ targets: smog, tilePositionX: 600, duration: 25000, loop: -1 });

    // ── Refinery backdrop (left side) ──
    this.drawRefineryBackdrop(W);

    // ── Ground — refinery metal ──
    this.platforms = this.physics.add.staticGroup();
    for (let tx = 0; tx < W; tx += 128) {
      const tex = tx < 700 ? 'tile-refinery' : 'tile-lava-ground';
      const b1 = this.platforms.create(tx + 64, 752, tex) as Phaser.Physics.Arcade.Sprite;
      b1.setDisplaySize(128, 48); b1.refreshBody(); b1.setDepth(3);
      if (tx < 700) {
        const b2 = this.platforms.create(tx + 64, 784, 'tile-refinery') as Phaser.Physics.Arcade.Sprite;
        b2.setDisplaySize(128, 32); b2.refreshBody(); b2.setDepth(3);
      }
    }

    // ── Tarot ──
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null as any));

    // ── Player ──
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // ── Altar — centered ──
    this.saveAltar = new SaveAltar(this, 350, 736, 'TransitionScene23');

    // ── Colliders ──
    this.physics.add.collider(this.player, this.platforms);

    // ── Camera ──
    this.cameras.main.setBounds(0, 0, W, 800);
    this.cameras.main.setZoom(1.6);
    this.cameras.main.scrollX = 200;
    this.cameras.main.scrollY = 100;

    const vig = this.add.graphics().setDepth(100);
    vig.fillStyle(0x000000, 0.35);
    vig.fillRect(0, 0, W, 800);
    vig.setScrollFactor(0);
  }

  private drawRefineryBackdrop(W: number): void {
    const g = this.add.graphics().setDepth(-10);

    // Factory wall left side
    g.fillStyle(0x151d25, 1);
    g.fillRect(0, 400, 180, 400);
    g.fillStyle(0x1c2834, 0.6);
    g.fillRect(10, 410, 160, 380);

    // Seams
    g.fillStyle(0x0d1218, 0.5);
    g.fillRect(0, 450, 180, 2);
    g.fillRect(0, 520, 180, 2);
    g.fillRect(0, 590, 180, 2);
    g.fillRect(0, 660, 180, 2);

    // Doorway
    g.fillStyle(0x0a0e13, 1);
    g.fillRect(50, 540, 80, 240);
    g.lineStyle(3, 0x3a4a5a, 1);
    g.strokeRect(50, 540, 80, 240);

    // Hazard stripes
    g.fillStyle(0xe8b830, 1);
    g.fillRect(130, 540, 10, 240);
    g.fillStyle(0x1c2834, 1);
    for (let sy = 540; sy < 780; sy += 16) {
      g.beginPath(); g.moveTo(130, sy); g.lineTo(140, sy + 8); g.lineTo(140, sy + 16); g.lineTo(130, sy + 8); g.closePath(); g.fillPath();
    }

    // Pipes
    g.fillStyle(0x2a3a4a, 0.7);
    g.fillRect(15, 440, 14, 340);
    g.fillStyle(0x1a2530, 0.8);
    for (let py = 470; py < 750; py += 80) g.fillRect(11, py, 22, 8);

    // Warning light
    g.fillStyle(0xffa502, 1);
    g.fillCircle(160, 460, 6);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeCircle(160, 460, 6);

    // Chimney
    g.fillStyle(0x1c2834, 1);
    g.fillRect(145, 390, 20, 50);
    g.fillStyle(0x0d1218, 0.5);
    g.fillRect(147, 385, 16, 6);

    // Cliff edge drop-off (right side)
    g.fillStyle(0x0a080c, 1);
    g.fillRect(700, 580, W - 700, 220);
    g.fillStyle(0x12101a, 0.6);
    g.fillRect(700, 580, W - 700, 4);
    // Jagged cliff bottom
    g.fillStyle(0x08060a, 1);
    for (let cx = 700; cx < W; cx += 30) {
      const ch = Phaser.Math.Between(6, 20);
      g.fillRect(cx, 790, 24, ch);
    }
    // Floating rock fragments near cliff edge
    g.fillStyle(0x12101a, 0.5);
    g.fillCircle(720, 610, 8);
    g.fillCircle(780, 620, 6);
    g.fillCircle(750, 640, 10);
  }

  update(time: number, delta: number): void {
    if (this.player?.active) {
      this.gameAudio?.update(this.player.x);
      this.playerShadow.setAlpha(this.player.x < 700 ? 0.5 : 0);
      if (this.player.x < 700) {
        this.playerShadow.x = this.player.x;
        this.playerShadow.y = this.player.y + 24;
        this.playerShadow.setScale(this.player.scaleX);
      }
      if (this.player.y > 800 && this.player.alive) this.player.takeDamage(100, 0);
    }
    if (this.saveAltar?.active) this.saveAltar.updatePrompt(this.player);

    if (this.player.active && this.player.alive && !this.hasTransitioned) {
      if (this.player.x <= 50) this.transitionToLevel2();
      if (this.player.x >= 940 && this.player.formMachine.state === FormState.DRAGON) this.transitionToLevel3();
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
