import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SaveAltar } from '../entities/SaveAltar';
import { GameAudio } from '../systems/GameAudio';
import { TarotSystem } from '../systems/TarotSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { CAMERA_LERP } from '../utils/constants';
import { t } from '../i18n';

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
  private pendingShowBossCinematic = false;
  private isCutsceneActive = false;

  constructor() { super({ key: 'TransitionScene45' }); }

  init(data?: any): void {
    this.hasTransitioned = false;
    this.frameCount = 0;
    this.isCutsceneActive = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.showBossCinematic !== undefined) this.pendingShowBossCinematic = data.showBossCinematic;
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
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.isCutsceneActive) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: 'TransitionScene45' });
    });

    // Backgrounds — foundry atmosphere
    // Backgrounds — Forge fire finale
    // Layer 0: Sky — deep red-orange
    this.add.tileSprite(0, 0, W * 1.5, H, 'bg-refinery-sky').setOrigin(0, 0).setScrollFactor(0.03).setDepth(-30)
      .setTint(0x772222, 0x662222, 0x441111, 0x441111);
    // Layer 1: Furnaces backdrop — bright, animated
    this.add.tileSprite(0, H * 0.25, W * 1.5, H * 0.60, 'bg-refinery-furnaces').setOrigin(0, 0).setScrollFactor(0.07).setDepth(-22)
      .setAlpha(0.55).setTint(0x885544, 0x774444, 0x553322, 0x543322);
    // Layer 2: Far smog — slow, heavy
    const farsmog = this.add.tileSprite(0, H * 0.28, W * 1.5, H * 0.30, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-20).setAlpha(0.5).setTint(0xff4400);
    this.tweens.add({ targets: farsmog, tilePositionX: 300, duration: 22000, loop: -1 });
    // Layer 3: Mid smog — faster
    const midsmog = this.add.tileSprite(0, H * 0.38, W * 1.5, H * 0.25, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.20).setDepth(-19).setAlpha(0.45).setTint(0xff3300);
    this.tweens.add({ targets: midsmog, tilePositionX: -500, duration: 16000, loop: -1 });
    // Layer 4: Near smog
    const nearsmog = this.add.tileSprite(0, H * 0.48, W * 1.5, H * 0.20, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.28).setDepth(-18).setAlpha(0.4).setTint(0xcc2200);
    this.tweens.add({ targets: nearsmog, tilePositionX: 600, duration: 12000, loop: -1 });
    // Layer 5: Forest base — dark silhouette
    this.add.tileSprite(0, H * 0.48, W * 1.5, H * 0.38, 'bg-forest').setOrigin(0, 0).setScrollFactor(0.35).setDepth(-16).setAlpha(0.55).setTint(0x220800);

    // Forge fire glow — volcanic flame behind mountains (Mordor style)
    this.drawVolcanicFlames(W, H);
    // Foundry gate
    this.drawFoundryGate(W, H);
    // Ember storm
    this.startForgeEmbers(W, H);

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

    if (this.pendingShowBossCinematic) {
      this.pendingShowBossCinematic = false;
      this.isCutsceneActive = true;
      this.player.setInputEnabled(false);
      this.player.setVelocity(0, 0);
      this.time.delayedCall(1000, () => {
        this.showBossCinematicSequence();
      });
    }
  }

  update(time: number, delta: number): void {
    this.frameCount++;
    if (this.isCutsceneActive) {
      if (this.player?.active) {
        this.player.setVelocity(0, 0);
        this.playerShadow.x = this.player.x;
        this.playerShadow.y = this.player.y + 24;
      }
      return;
    }
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
    this.showZoneTransition('THE HUNT', '#ff8855', () => {
      // Zone 5 — The Hunt: dragon pursuit → amazon escape.
      this.scene.start('GameScene5', {
        startPos: { x: 150, y: 400 },
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

  private drawVolcanicFlames(W: number, H: number): void {
    const g = this.add.graphics().setDepth(-14).setScrollFactor(0.04);
    const cx = W * 0.45, baseY = H * 0.62;

    // Volcano cone
    g.fillStyle(0x0a0505, 1);
    g.beginPath();
    g.moveTo(cx - 160, baseY);
    g.lineTo(cx, baseY - 200);
    g.lineTo(cx + 180, baseY);
    g.closePath();
    g.fillPath();

    // Secondary cone
    g.fillStyle(0x0d0808, 1);
    g.beginPath();
    g.moveTo(cx - 100, baseY);
    g.lineTo(cx + 30, baseY - 160);
    g.lineTo(cx + 140, baseY);
    g.closePath();
    g.fillPath();

    // Crater glow — base orange
    const craterG = this.add.graphics().setDepth(-13).setScrollFactor(0.04);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const fx = cx + Math.cos(angle) * dist;
      const fy = baseY - 195 - Math.sin(angle) * (10 + Math.random() * 15);
      craterG.fillStyle(0xff5500, 0.7 + Math.random() * 0.3);
      craterG.fillCircle(fx, fy, 6 + Math.random() * 10);
    }

    // Lava veins down the cone
    g.fillStyle(0xff2200, 0.8);
    g.fillRect(cx - 8, baseY - 170, 6, 50);
    g.fillStyle(0xff4400, 0.6);
    g.fillRect(cx + 15, baseY - 130, 4, 35);
    g.fillRect(cx - 30, baseY - 140, 3, 28);

    // Crater pointlight — pulsing
    const craterLight = this.add.pointlight(cx, baseY - 200, 0xff3300, 180, 1.2).setDepth(-13).setScrollFactor(0.04);
    this.tweens.add({
      targets: craterLight,
      intensity: { from: 0.8, to: 1.6 },
      radius: { from: 150, to: 220 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Smaller flank cones
    const flanks = [
      { x: cx - 180, y: baseY - 60, r: 80 },
      { x: cx + 200, y: baseY - 50, r: 70 },
    ];
    for (const f of flanks) {
      g.fillStyle(0x080404, 1);
      g.fillTriangle(f.x - 40, baseY, f.x, f.y, f.x + 40, baseY);
      const fl = this.add.pointlight(f.x, f.y, 0xff2200, f.r, 0.5).setDepth(-13).setScrollFactor(0.04);
      this.tweens.add({
        targets: fl, intensity: { from: 0.3, to: 0.7 }, radius: { from: f.r * 0.7, to: f.r * 1.2 },
        duration: Phaser.Math.Between(2500, 4000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  private startForgeEmbers(W: number, H: number): void {
    this.time.addEvent({
      delay: 40,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(50, W + 150);
        const colors = [0xff4400, 0xff6600, 0xffaa00, 0xff8800, 0xcc2200];
        const ember = this.add.rectangle(x, -10, Phaser.Math.Between(2, 6), Phaser.Math.Between(2, 6),
          Phaser.Utils.Array.GetRandom(colors), 0.8);
        ember.setBlendMode(Phaser.BlendModes.ADD).setDepth(25).setScrollFactor(0);
        this.tweens.add({
          targets: ember, x: x + Phaser.Math.Between(-120, 120), y: H + 20,
          alpha: 0, scale: 0.2, duration: Phaser.Math.Between(1800, 4000),
          onComplete: () => ember.destroy()
        });
      }
    });
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

  private showBossCinematicSequence(): void {
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

    const topBorder = this.add.rectangle(cx, barHeight, cam.width, 2 * scale, 0x996633)
      .setScrollFactor(0)
      .setDepth(501);

    const bottomBorder = this.add.rectangle(cx, cam.height - barHeight, cam.width, 2 * scale, 0x996633)
      .setScrollFactor(0)
      .setDepth(501);

    const slideSprite = this.add.image(cx, cy, 'cinematic-boss-1')
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
      color: '#665544'
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
      subtitle.setText(t(`story.cinematicBoss${currentSlide}`));
    };

    startTypewriter(t(`story.cinematicBoss1`));

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
            slideSprite.setTexture(`cinematic-boss-${currentSlide}`);
            this.tweens.add({
              targets: slideSprite,
              alpha: 1,
              duration: 300
            });
            startTypewriter(t(`story.cinematicBoss${currentSlide}`));
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
}
