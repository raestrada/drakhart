import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_LERP } from '../utils/constants';
import { t } from '../i18n';

/**
 * TransitionScene56 — hub between Zone 5 (The Hunt) and Zone 6 (coming soon).
 *
 * The camp of the jungle Resistance clans. Amazon biome. The player rests here
 * before pressing deeper toward the Empire's heart. Zone 6 is not yet built,
 * so the forward gate returns to the title for now (stub).
 */
export class TransitionScene56 extends Phaser.Scene {
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
  private pendingShowResistanceCinematic = false;
  private isCutsceneActive = false;

  constructor() { super({ key: 'TransitionScene56' }); }

  init(data?: any): void {
    this.hasTransitioned = false;
    this.frameCount = 0;
    this.isCutsceneActive = false;
    this.pendingShowResistanceCinematic = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.showResistanceCinematic !== undefined) this.pendingShowResistanceCinematic = data.showResistanceCinematic;
    }
  }

  create(): void {
    const W = 1920, H = 1080;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBackgroundColor('#0a140c');

    this.gameAudio = new GameAudio();
    this.terrainGen = new TerrainGenerator(this);
    this.gameAudio.playSacredAltarBGM();
    this.currentBiome = 'amazon';
    this.events.once('shutdown', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.events.once('destroy', () => { this.gameAudio.stopSacredAltarBGM(); this.gameAudio.stopBGM(); });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isCutsceneActive) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: 'TransitionScene56' });
    });

    // ── Amazon camp backgrounds ──
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-amazon-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30);
    this.add.tileSprite(0, H * 0.25, W * 1.5, H * 0.60, 'bg-amazon-canopy').setOrigin(0, 0).setScrollFactor(0.07).setDepth(-22).setAlpha(0.7);
    const mist = this.add.tileSprite(0, H * 0.40, W * 1.5, H * 0.30, 'bg-amazon-mist').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-20).setAlpha(0.5);
    this.tweens.add({ targets: mist, tilePositionX: 220, duration: 20000, loop: -1 });

    // Bioluminescent canopy motes.
    this.time.addEvent({
      delay: 120,
      loop: true,
      callback: () => {
        const mote = this.add.rectangle(Phaser.Math.Between(50, W + 150), -10, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4), 0x33ffcc, 0.6);
        mote.setBlendMode(Phaser.BlendModes.ADD).setDepth(25).setScrollFactor(0);
        this.tweens.add({ targets: mote, x: mote.x + Phaser.Math.Between(-80, 80), y: H + 20, alpha: 0, scale: 0.2, duration: Phaser.Math.Between(3000, 6000), onComplete: () => mote.destroy() });
      },
    });

    this.drawResistanceCamp(W, H);

    // Organic amazon ground.
    const groundY = 736;
    this.platforms = this.physics.add.staticGroup();
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, W, 'amazon', 40);

    // Tarot state persistence.
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null));

    // Player (arrives on foot from the jungle escape).
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.player.tarotSystem = this.tarotSystem;
    this.player.formMachine.unlockTransform();
    this.player.formMachine.unlockDragon();
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.5);

    // Save altar — the elders' fire.
    this.saveAltar = new SaveAltar(this, W / 2, groundY, 'TransitionScene56');

    this.physics.add.collider(this.player, this.platforms);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x2a4a36);
      this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
      this.player.setLighting(true);
      this.saveAltar.setLighting(true);
      const altarLight = this.lights.addLight(W / 2, groundY - 180, 200, 0xffaa44, 1.8);
      this.tweens.add({ targets: altarLight, intensity: { from: 1.2, to: 2.2 }, radius: { from: 160, to: 220 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setBounds(0, 0, W, H);

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Trigger Cinematic Cutscene if coming from the intense Zone 5 pursuit escape
    if (this.pendingShowResistanceCinematic) {
      this.pendingShowResistanceCinematic = false;
      this.isCutsceneActive = true;
      this.player.setInputEnabled(false);
      this.player.setVelocity(0, 0);
      this.time.delayedCall(200, () => {
        this.showResistanceCinematicSequence();
      });
    } else {
      // Welcome message — only show if cutscene isn't active (so it doesn't overlap)
      const greeting = this.add.text(cx, cy - 40, t('story.cinematicResistance3'), {
        fontSize: '14px', fontFamily: 'Georgia, serif', color: '#aaffcc', stroke: '#000000', strokeThickness: 4, align: 'center', wordWrap: { width: this.scale.width - 120 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
      this.tweens.add({ targets: greeting, alpha: { from: 0, to: 0.95 }, duration: 800, yoyo: true, hold: 2600, onComplete: () => greeting.destroy() });
    }
  }

  update(time: number, delta: number): void {
    this.frameCount++;
    if (this.player?.active) {
      if (!this.isCutsceneActive) {
        this.player.update(time, delta);
      }
      this.saveAltar.updatePrompt(this.player);
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }
    if (!this.hasTransitioned && this.frameCount > 30 && !this.isCutsceneActive) {
      if (this.player.x <= 40) this.transitionToLevel5();
      if (this.player.x >= 1880) this.transitionToZone6();
    }
  }

  private transitionToLevel5(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition(t('zones.theHunt'), '#66cc88', () => {
      this.scene.start('GameScene5', { startPos: { x: 15300, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    });
  }

  private transitionToZone6(): void {
    this.hasTransitioned = true;
    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.showZoneTransition(t('zones.theReforging'), '#66ffaa', () => {
      this.scene.start('GameScene6', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: true,
        dragonUnlocked: true,
      });
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

  // ── Cinematic Cutscene for escaping the pursuit ──

  private showResistanceCinematicSequence(): void {
    this.gameAudio.stopSacredAltarBGM();
    this.gameAudio.stopBGM();
    
    this.scene.setVisible(false, 'UIScene');

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;

    const originalZoom = cam.zoom;
    cam.setZoom(1.0);

    const backdrop = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(498)
      .setAlpha(0);

    const barHeight = 85 * scale;
    const topBar = this.add.rectangle(cx, barHeight / 2, cam.width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(500);

    const bottomBar = this.add.rectangle(cx, cam.height - barHeight / 2, cam.width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(500);

    const topBorder = this.add.rectangle(cx, barHeight, cam.width, 2 * scale, 0x339966) // Green tribal border instead of gold
      .setScrollFactor(0)
      .setDepth(501);

    const bottomBorder = this.add.rectangle(cx, cam.height - barHeight, cam.width, 2 * scale, 0x339966)
      .setScrollFactor(0)
      .setDepth(501);

    const slideSprite = this.add.image(cx, cy, 'cinematic-resistance-1')
      .setScrollFactor(0)
      .setDepth(499)
      .setAlpha(0);

    const targetHeight = cam.height - barHeight * 2 - 10 * scale;
    const aspect = slideSprite.width / slideSprite.height;
    slideSprite.setDisplaySize(targetHeight * aspect, targetHeight);

    const subtitle = this.add.text(cx, cam.height - barHeight / 2, '', {
      fontSize: `${Math.round(11 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ddccbb',
      align: 'center',
      wordWrap: { width: cam.width - 60 * scale },
      lineSpacing: 4 * scale
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(502);

    const hintText = this.add.text(cam.width - 25 * scale, cam.height - 15 * scale, t('story.introSkip') || 'ENTER / CLICK TO CONTINUE', {
      fontSize: `${Math.round(8 * scale)}px`,
      fontFamily: 'monospace',
      color: '#446655'
    })
    .setOrigin(1, 0.5)
    .setScrollFactor(0)
    .setDepth(502);

    this.tweens.add({
      targets: [backdrop, slideSprite],
      alpha: 1,
      duration: 600
    });

    let currentSlide = 1;
    const totalSlides = 3;
    let typingTimer: Phaser.Time.TimerEvent | null = null;
    let isTyping = false;
    let fullText = '';
    let currentTypedText = '';

    const startTypewriter = (text: string) => {
      if (typingTimer) {
        typingTimer.destroy();
      }
      isTyping = true;
      fullText = text;
      currentTypedText = '';
      subtitle.setText('');
      
      let charIndex = 0;
      typingTimer = this.time.addEvent({
        delay: 25,
        repeat: text.length - 1,
        callback: () => {
          if (!isTyping) return;
          currentTypedText += text[charIndex];
          subtitle.setText(currentTypedText);
          charIndex++;
          if (charIndex >= text.length) {
            isTyping = false;
          }
        }
      });
    };

    const skipTyping = () => {
      isTyping = false;
      if (typingTimer) {
        typingTimer.destroy();
        typingTimer = null;
      }
      subtitle.setText(t(`story.cinematicResistance${currentSlide}`));
    };

    startTypewriter(t(`story.cinematicResistance1`));

    const endCutscene = () => {
      this.tweens.add({
        targets: [backdrop, topBar, bottomBar, topBorder, bottomBorder, slideSprite, subtitle, hintText],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          backdrop.destroy();
          topBar.destroy();
          bottomBar.destroy();
          topBorder.destroy();
          bottomBorder.destroy();
          slideSprite.destroy();
          subtitle.destroy();
          hintText.destroy();

          this.isCutsceneActive = false;
          this.player.setInputEnabled(true);
          this.cameras.main.setZoom(originalZoom);
          
          this.scene.setVisible(true, 'UIScene');
          this.gameAudio.playSacredAltarBGM();
        }
      });
    };

    const advanceSlide = () => {
      if (isTyping) {
        skipTyping();
        return;
      }

      currentSlide++;
      if (currentSlide > totalSlides) {
        this.input.keyboard?.off('keydown-ENTER', handleInteraction);
        this.input.off('pointerdown', handleInteraction);
        endCutscene();
      } else {
        this.tweens.add({
          targets: slideSprite,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            slideSprite.setTexture(`cinematic-resistance-${currentSlide}`);
            this.tweens.add({
              targets: slideSprite,
              alpha: 1,
              duration: 300
            });
            startTypewriter(t(`story.cinematicResistance${currentSlide}`));
          }
        });
      }
    };

    const handleInteraction = () => {
      advanceSlide();
    };

    this.input.keyboard?.on('keydown-ENTER', handleInteraction);
    this.input.on('pointerdown', handleInteraction);
  }

  private drawResistanceCamp(W: number, H: number): void {
    const g = this.add.graphics().setDepth(-10);
    const groundY = 736;
    // Central fire pit.
    g.fillStyle(0x0a1208, 1);
    g.fillCircle(W / 2, groundY, 30);
    g.fillStyle(0xff6622, 0.9);
    g.fillCircle(W / 2, groundY - 6, 12);
    g.fillStyle(0xffcc44, 0.7);
    g.fillCircle(W / 2, groundY - 10, 6);

    // Totem poles flanking the altar (bone-and-vine).
    for (const px of [W / 2 - 120, W / 2 + 120]) {
      g.fillStyle(0x1a2410, 1);
      g.fillRect(px - 4, groundY - 90, 8, 90);
      g.fillStyle(0x2a4a22, 0.7);
      g.fillRect(px - 3, groundY - 88, 6, 88);
      // Bone skull cap.
      g.fillStyle(0xc8b89a, 0.85);
      g.fillCircle(px, groundY - 94, 5);
      g.fillStyle(0x0a0a06, 0.8);
      g.fillRect(px - 2, groundY - 95, 1.5, 2);
      g.fillRect(px + 1, groundY - 95, 1.5, 2);
      // Hanging vines.
      g.fillStyle(0x1f3a22, 0.6);
      g.fillRect(px - 1, groundY - 60, 1, 40);
      g.fillRect(px + 2, groundY - 50, 1, 30);
    }

    // Back tents (rough hide lean-tos).
    for (let i = 0; i < 3; i++) {
      const tx = W / 2 - 220 + i * 220;
      g.fillStyle(0x12201a, 1);
      g.beginPath();
      g.moveTo(tx, groundY);
      g.lineTo(tx + 40, groundY - 50);
      g.lineTo(tx + 80, groundY);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x1a2e22, 0.7);
      g.beginPath();
      g.moveTo(tx + 6, groundY);
      g.lineTo(tx + 40, groundY - 44);
      g.lineTo(tx + 74, groundY);
      g.closePath();
      g.fillPath();
    }
  }
}