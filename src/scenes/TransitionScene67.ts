import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_LERP } from '../utils/constants';
import { t } from '../i18n';

/**
 * TransitionScene67 — hub between Zone 6 (The Reforging) and Zone 7 (Arc 2, coming soon).
 *
 * The reforged Warden emerges from the ancient ruins, the Core attuned. The
 * Resistance bids them onward toward the Empire's heart. Zone 7 is not yet built,
 * so the forward gate returns to the title for now (stub).
 */
export class TransitionScene67 extends Phaser.Scene {
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

  constructor() { super({ key: 'TransitionScene67' }); }

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
    this.cameras.main.setBackgroundColor('#0a1a14');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'amazon';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: 'TransitionScene67' });
    });

    // ── Amazon ruins threshold backgrounds ──
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-amazon-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30);
    this.add.tileSprite(0, H * 0.25, W * 1.5, H * 0.60, 'bg-amazon-canopy').setOrigin(0, 0).setScrollFactor(0.07).setDepth(-22).setAlpha(0.7).setTint(0x557766);
    const mist = this.add.tileSprite(0, H * 0.40, W * 1.5, H * 0.30, 'bg-amazon-mist').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-20).setAlpha(0.45);
    this.tweens.add({ targets: mist, tilePositionX: 200, duration: 20000, loop: -1 });

    // Ruin columns flanking the path (threshold into Arc 2).
    for (let i = 0; i < 6; i++) {
      this.add.image(140 + i * 320, 736, 'fg-column').setOrigin(0.5, 1).setDepth(50).setAlpha(0.5).setScrollFactor(0.95).setTint(0x99bb99);
    }

    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, W, 'amazon', 40);

    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null));

    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    this.player.formMachine.unlockTransform();
    this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene67');

    this.physics.add.collider(this.player, this.platforms);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x2a4a36);
      this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
      this.player.setLighting(true);
      this.saveAltar.setLighting(true);
      const altarLight = this.lights.addLight(W / 2, groundY - 180, 200, 0x88ddaa, 1.8);
      this.tweens.add({ targets: altarLight, intensity: { from: 1.2, to: 2.2 }, radius: { from: 160, to: 220 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);

    // Closing the tutorial arc — the Warden emerges reforged.
    const greeting = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, t('story.cinematicReforging3'), {
      fontSize: '14px', fontFamily: 'Georgia, serif', color: '#aaffcc', stroke: '#000000', strokeThickness: 4, align: 'center', wordWrap: { width: this.scale.width - 120 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
    this.tweens.add({ targets: greeting, alpha: { from: 0, to: 0.95 }, duration: 800, yoyo: true, hold: 2400, onComplete: () => greeting.destroy() });
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
      if (this.player.x <= 40) this.transitionToLevel6();
      if (this.player.x >= 1880) this.transitionToZone7();
    }
  }

  private transitionToLevel6(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition(t('zones.theReforging'), '#66ccaa', () => {
      this.scene.start('GameScene6', { startPos: { x: 13500, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    });
  }

  private transitionToZone7(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    // Zone 7 (Arc 2) not yet implemented — return to title for now (stub).
    this.showZoneTransition('ZONE 7 — COMING SOON', '#88ffcc', () => {
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
}