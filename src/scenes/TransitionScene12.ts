import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';

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
    const W = 800, H = 800;
    const vw = this.scale.width;
    const vh = this.scale.height;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#080610');

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(1);
    this.events.once('shutdown', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.events.once('destroy', () => { this.gameAudio.stopBGM(); this.gameAudio.stopChoirSave(); });
    this.input.keyboard?.on('keydown-ESC', () => { this.physics.world.pause(); this.scene.pause(); this.scene.launch('PauseScene', { gameScene: 'TransitionScene12' }); });

    // Full-viewport backgrounds (scrollFactor 0 = always fill screen)
    this.add.tileSprite(0, 0, vw, vh, 'bg-sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-30);
    this.add.tileSprite(0, vh * 0.55, vw, vh * 0.45, 'bg-mountains').setOrigin(0, 0).setScrollFactor(0).setDepth(-20).setAlpha(0.5).setTint(0x553344);
    const mist = this.add.tileSprite(0, vh * 0.45, vw, vh * 0.3, 'bg-mist').setOrigin(0, 0).setScrollFactor(0).setDepth(-18).setAlpha(0.25);
    this.tweens.add({ targets: mist, tilePositionX: 800, duration: 40000, loop: -1 });
    this.add.tileSprite(0, vh * 0.5, vw, vh * 0.45, 'bg-forest').setOrigin(0, 0).setScrollFactor(0).setDepth(-15).setAlpha(0.45).setTint(0x332233);
    const moon = this.add.image(vw * 0.15, vh * 0.15, 'bg-moon').setOrigin(0.5).setScrollFactor(0).setDepth(-25).setAlpha(0.85);
    this.tweens.add({ targets: moon, y: moon.y - 5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Ground
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    for (let tx = 0; tx < W; tx += 128) {
      const isRefinery = tx >= 600;
      const tex = isRefinery ? 'tile-refinery' : 'tile-ground';
      const b1 = this.platforms.create(tx + 64, groundY + 16, tex) as Phaser.Physics.Arcade.Sprite;
      b1.setDisplaySize(128, 48); b1.refreshBody(); b1.setDepth(3);
      const b2 = this.platforms.create(tx + 64, groundY + 48, tex) as Phaser.Physics.Arcade.Sprite;
      b2.setDisplaySize(128, 32); b2.refreshBody(); b2.setDepth(3);
      if (!isRefinery) {
        const g2 = this.platforms.create(tx + 64, groundY + 4, 'tile-grass') as Phaser.Physics.Arcade.Sprite;
        g2.setDisplaySize(128, 12); g2.refreshBody(); g2.setDepth(3);
      }
    }

    this.drawFactoryEntrance(W, groundY);

    // Tarot
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null as any));

    // Player
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // Altar
    this.saveAltar = new SaveAltar(this, 400, groundY, 'TransitionScene12');

    this.physics.add.collider(this.player, this.platforms);

    // Camera bounds to match world
    this.cameras.main.setBounds(0, 0, W, H);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;
  }

  private drawFactoryEntrance(W: number, groundY: number): void {
    const g = this.add.graphics().setDepth(-10);
    const gateX = 580;
    g.fillStyle(0x151d25, 1);
    g.fillRect(gateX, 400, W - gateX, 400);
    g.fillStyle(0x1c2834, 0.6);
    g.fillRect(gateX + 10, 410, W - gateX - 20, 380);
    g.fillStyle(0x0d1218, 0.5);
    for (let sy = 440; sy < 780; sy += 40) g.fillRect(gateX, sy, W - gateX, 2);
    g.fillRect(gateX + 100, 400, 2, 400);

    const doorW = 120, doorH = 240, doorX = gateX + 25, doorY = 520;
    g.fillStyle(0x0a0e13, 1);
    g.fillRect(doorX, doorY, doorW, doorH);
    g.lineStyle(3, 0x3a4a5a, 1);
    g.strokeRect(doorX, doorY, doorW, doorH);
    g.fillStyle(0xe8b830, 1);
    g.fillRect(doorX - 10, doorY, 10, doorH);
    g.fillStyle(0x1c2834, 1);
    for (let sy = doorY; sy < doorY + doorH; sy += 16) {
      g.beginPath(); g.moveTo(doorX - 10, sy); g.lineTo(doorX, sy + 8); g.lineTo(doorX, sy + 16); g.lineTo(doorX - 10, sy + 8); g.closePath(); g.fillPath();
    }
    g.fillStyle(0x2a3a4a, 0.7);
    g.fillRect(gateX + 155, 440, 12, 340);
    g.fillStyle(0x1a2530, 0.8);
    for (let py = 470; py < 760; py += 80) g.fillRect(gateX + 151, py, 20, 8);
    g.fillStyle(0x2a3540, 0.6);
    g.fillRect(gateX + 180, 480, 8, 300);

    const lightX = gateX + 135;
    g.fillStyle(0x1a1010, 1);
    g.fillCircle(lightX, 450, 8);
    g.fillStyle(0xff3322, 1);
    g.fillCircle(lightX, 450, 5);
    g.lineStyle(2, 0xff5566, 0.5);
    g.strokeCircle(lightX, 450, 8);
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
      if (this.player.x >= 760) this.transitionToLevel2();
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
