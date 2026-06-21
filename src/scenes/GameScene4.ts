import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { MechaEnemy } from '../entities/enemies/MechaEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { LeaperEnemy } from '../entities/enemies/LeaperEnemy';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { Boss } from '../entities/enemies/Boss';
import { Barricade } from '../entities/Barricade';
import { TarotCard } from '../entities/TarotCard';
import { CrumblingPlatform } from '../entities/CrumblingPlatform';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { EchoFragment } from '../entities/EchoFragment';
import { spawnHitParticles, spawnDeathExplosion, spawnProjectileImpact } from '../effects/Particles';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { BaseLevelScene, getSceneAudio } from './BaseLevelScene';
import { applyBiomePostFX, setVignetteFromPlayer } from '../effects/CameraFilters';
import { WeatherSystem } from '../systems/WeatherSystem';
import { CAMERA_LERP, CAMERA_ZOOM_HUMAN, CAMERA_ZOOM_DRAGON, ENEMY_SEARCHLIGHT } from '../utils/constants';
import { t } from '../i18n';
import { spawnImmuneText } from '../effects/DamageNumbers';

class Gatekeeper extends Boss {
  public gatePhase: 'armor' | 'flight' | 'duel' = 'armor';
  private gateFireTimer = 0;
  private spotlight: Phaser.GameObjects.Light | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, player);
    this.health = 900;
    this.maxHealth = 900;
    this.setScale(2.5);
    this.setTint(0x886644);
    this.setAlpha(1);
    this.setDepth(15);

    if (scene.lights && scene.lights.active) {
      this.spotlight = scene.lights.addConeLight(
        x, y - 40, ENEMY_SEARCHLIGHT.RADIUS * 1.4, 0xff3322, ENEMY_SEARCHLIGHT.INTENSITY * 1.3,
        0, ENEMY_SEARCHLIGHT.INNER_ANGLE, ENEMY_SEARCHLIGHT.OUTER_ANGLE * 0.8, ENEMY_SEARCHLIGHT.Z + 10
      );
    }

    // Health bar
    const barBg = scene.add.rectangle(x, y - 100, 200, 8, 0x000000, 0.8).setDepth(20);
    const barFill = scene.add.rectangle(x - 100, y - 100, 200, 8, 0xff4400).setOrigin(0, 0.5).setDepth(21);
    this.setData('barBg', barBg);
    this.setData('barFill', barFill);
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.spotlight) {
      this.spotlight.x = this.x;
      this.spotlight.y = this.y - 40;
      const sdx = this.player.x - this.x;
      const sdy = this.player.y - this.y;
      this.spotlight.setConeRotation(Math.atan2(sdy, sdx));
    }

    if (this.gatePhase === 'armor') {
      body.setVelocityX(Math.sin(time * 0.001) * 40);
      if (time - this.gateFireTimer > 1800) { this.gateFireTimer = time; this.fireSpread(3, 180); }
    } else if (this.gatePhase === 'flight') {
      body.allowGravity = false;
      body.setVelocityY(Math.sin(time * 0.003) * 50);
      body.setVelocityX(Math.sin(time * 0.0015) * 60);
      if (time - this.gateFireTimer > 1200) { this.gateFireTimer = time; this.fireSpread(5, 250); }
    } else {
      body.allowGravity = true;
      body.setVelocityX(Math.sin(time * 0.002) * 30);
      if (time - this.gateFireTimer > 2200) { this.gateFireTimer = time; this.fireSpread(2, 140); }
    }

    // Update health bar
    const barBg = this.getData('barBg') as Phaser.GameObjects.Rectangle;
    const barFill = this.getData('barFill') as Phaser.GameObjects.Rectangle;
    if (barBg && barFill) {
      barBg.setPosition(this.x, this.y - 100);
      barFill.setPosition(this.x - 100, this.y - 100);
      barFill.width = 200 * Math.max(0, this.health / this.maxHealth);
    }
  }

  private fireSpread(count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + this.scene.time.now * 0.001;
      const bullet = this.scene.physics.add.sprite(this.x, this.y, 'bullet-fire');
      bullet.setTint(0xff5500); bullet.setScale(0.7); bullet.setBlendMode(Phaser.BlendModes.ADD);
      (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.scene.physics.add.overlap(this.player, bullet, () => {
        if (!bullet.active) return;
        bullet.destroy();
        this.player.takeDamage(this.attackDamage * 0.6, -1);
      });
      this.scene.time.delayedCall(2500, () => { if (bullet.active) bullet.destroy(); });
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;
    const ps = this.player.formMachine.state;

    // Phase immunity checks
    let isImmune = false;
    if (this.gatePhase === 'armor' && ps !== FormState.MECHA) isImmune = true;
    else if (this.gatePhase === 'flight' && ps !== FormState.DRAGON) isImmune = true;
    else if (this.gatePhase === 'duel' && ps !== FormState.HUMAN) isImmune = true;

    if (isImmune) {
      spawnImmuneText(this.scene, this.x, this.y - 40);
      getSceneAudio(this.scene)?.playEnemyHit();
      return;
    }

    this.health -= amount;
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.restoreTint(); });

    if (this.health <= 600 && this.gatePhase === 'armor') {
      this.gatePhase = 'flight';
      this.setTint(0x4488cc);
      this.scene.cameras.main.shake(600, 0.01);
      this.scene.cameras.main.flash(300, 100, 150, 255);
      this.showPhaseText(t('boss.foundryP2'));
      this.y = 350; // Fly up!
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
    } else if (this.health <= 300 && this.gatePhase === 'flight') {
      this.gatePhase = 'duel';
      this.setTint(0xcc4444);
      this.scene.cameras.main.shake(400, 0.015);
      this.scene.cameras.main.flash(300, 255, 100, 50);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = true;
      body.setVelocityY(-100);
      this.showPhaseText(t('boss.foundryP3'));
    }

    if (this.health <= 0) this.die();
  }

  private restoreTint(): void {
    if (this.gatePhase === 'armor') this.setTint(0x886644);
    else if (this.gatePhase === 'flight') this.setTint(0x4488cc);
    else this.setTint(0xcc4444);
  }

  private showPhaseText(msg: string): void {
    const cam = this.scene.cameras.main;
    const t = this.scene.add.text(cam.width / 2, cam.height * 0.25, msg, {
      fontSize: '18px', fontFamily: 'monospace', color: '#ff6600', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: { from: 0, to: 1 }, duration: 200, yoyo: true, hold: 1500, onComplete: () => t.destroy() });
  }

  protected die(): void {
    if (this.spotlight && this.scene.lights) {
      this.scene.lights.removeLight(this.spotlight);
      this.spotlight = null;
    }
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    const barBg = this.getData('barBg') as Phaser.GameObjects.Rectangle;
    const barFill = this.getData('barFill') as Phaser.GameObjects.Rectangle;
    if (barBg) barBg.destroy();
    if (barFill) barFill.destroy();
    this.scene.cameras.main.shake(1200, 0.02);
    this.scene.cameras.main.flash(800, 255, 200, 0);
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        spawnDeathExplosion(this.scene, this.x + Phaser.Math.Between(-60, 60), this.y + Phaser.Math.Between(-60, 60));
      });
    }
    this.scene.tweens.add({ targets: this, alpha: 0, scaleX: 3, scaleY: 3, duration: 2000, onComplete: () => this.destroy() });
  }
}

export class GameScene4 extends BaseLevelScene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private lavaHazards!: Phaser.Physics.Arcade.StaticGroup;
  private tarotSystem!: TarotSystem;
  private weatherSystem!: WeatherSystem;
  private terrainGen!: TerrainGenerator;
  private boss: Gatekeeper | null = null;
  private bossActive = false;
  private playerShadow!: Phaser.GameObjects.Image;
  private echoFragments: EchoFragment[] = [];
  private bulletLights: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Light> = new Map();

  private refinerySunImages: Phaser.GameObjects.Image[] = [];
  private furnaceImages: Phaser.GameObjects.Image[] = [];
  private reactorImages: Phaser.GameObjects.Image[] = [];

  private pendingSpawnX = 150;
  private pendingSpawnY = 400;
  private pendingCardsToCollect: string[] = [];
  private pendingMechaUnlock = true;
  private pendingDragonUnlock = true;
  private demoEnded = false;

  private readonly WORLD_W = 15000;
  private readonly WORLD_H = 1000;

  constructor() { super('GameScene4'); }

  init(data?: any): void {
    this.demoEnded = false;
    this.bossActive = false;
    if (data) {
      if (data.startPos) { this.pendingSpawnX = data.startPos.x; this.pendingSpawnY = data.startPos.y; }
      if (data.cardsCollected) this.pendingCardsToCollect = data.cardsCollected;
      if (data.mechaUnlocked !== undefined) this.pendingMechaUnlock = data.mechaUnlocked;
      if (data.dragonUnlocked !== undefined) this.pendingDragonUnlock = data.dragonUnlocked;
    }
  }

  create(): void {
    super.create();
    this.physics.world.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.cameras.main.setBackgroundColor('#0a0608');

    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.lights.enable();
      this.lights.setAmbientColor(0x332222);
    }

    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(5);
    this.gameAudio.playAmbientZone(4);
    this.events.once('shutdown', () => { this.gameAudio?.stopBGM(); });
    this.events.once('destroy', () => { this.gameAudio?.stopBGM(); });

    this.echoFragments = [];
    this.bulletLights.clear();
    this.refinerySunImages = [];
    this.furnaceImages = [];
    this.reactorImages = [];
    this.terrainGen = new TerrainGenerator(this);
    this.currentBiome = 'foundry';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.createParallax();
    this.weatherSystem = new WeatherSystem(this, 'refinery', this.WORLD_W);
    applyBiomePostFX(this, 'foundry');
    this.createLevel();
    this.createDecorations();
    this.createEchoFragments();
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect?.length) this.pendingCardsToCollect.forEach(id => this.tarotSystem.collect(id, null));
    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();

    // Start as human — player can transform manually
    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);

    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow').setDepth(-5).setAlpha(0.6);
    this.createEnemies();
    this.createTarotCards();
    this.setupCamera();
    this.setupCollisions();
    this.setupLighting();
    this.showIntroText();

    this.scene.launch('UIScene', { player: this.player, tarotSystem: this.tarotSystem });
  }

  private createParallax(): void {
    this.add.tileSprite(0, 0, this.WORLD_W, 1200, 'bg-refinery-sky').setOrigin(0, 0).setScrollFactor(0.02, 0).setDepth(-30).setTint(0x442222, 0x442222, 0x221111, 0x221111);
    this.add.tileSprite(0, 180, this.WORLD_W, 800, 'bg-refinery-furnaces').setOrigin(0, 0).setScrollFactor(0.06, 0).setDepth(-20).setTint(0x553333, 0x442222, 0x221111, 0x331111);
    this.add.tileSprite(0, 240, this.WORLD_W, 800, 'bg-refinery-structures').setOrigin(0, 0).setScrollFactor(0.14, 0).setDepth(-10).setTint(0x332211, 0x332211, 0x110808, 0x221111);

    const mist = this.add.tileSprite(0, 500, this.WORLD_W, 200, 'bg-mist').setOrigin(0, 0).setScrollFactor(0.1, 0).setDepth(-8).setAlpha(0.15).setTint(0xff4422);
    this.tweens.add({ targets: mist, tilePositionX: 300, duration: 15000, loop: -1 });

    this.refinerySunImages = [];
    if (this.textures.exists('image-refinery-sun')) {
      [800, 2400, 3800].forEach(x => {
        const frame = this.add.rectangle(0, 0, 130, 100, 0x0a0505, 0.85)
          .setDepth(-29).setStrokeStyle(3, 0x4a2a2a);
        frame.setData('anchorX', x);

        const img = this.add.image(0, 0, 'image-refinery-sun')
          .setOrigin(0.5, 0.5)
          .setDepth(-28)
          .setScale(0.55)
          .setAlpha(0.65)
          .setTint(0xff5533);
        img.setData('anchorX', x);
        img.setData('frame', frame);
        this.refinerySunImages.push(img);
      });
    }

    this.furnaceImages = [];
    if (this.textures.exists('image-furnace')) {
      [5200, 6800, 8200].forEach(x => {
        const frame = this.add.rectangle(0, 0, 160, 120, 0x0a0505, 0.85)
          .setDepth(-19).setStrokeStyle(3, 0x4a2a2a);
        frame.setData('anchorX', x);

        const img = this.add.image(0, 0, 'image-furnace')
          .setOrigin(0.5, 0.5)
          .setDepth(-18)
          .setScale(0.5)
          .setAlpha(0.6)
          .setTint(0xff4422);
        img.setData('anchorX', x);
        img.setData('frame', frame);
        this.furnaceImages.push(img);
      });
    }

    this.reactorImages = [];
    if (this.textures.exists('bg-gorge-reactor')) {
      [11000, 13500].forEach(x => {
        const frame = this.add.rectangle(0, 0, 200, 200, 0x070308, 0.9)
          .setDepth(-19).setStrokeStyle(4, 0x662244);
        frame.setData('anchorX', x);

        const img = this.add.image(0, 0, 'bg-gorge-reactor')
          .setOrigin(0.5, 0.5)
          .setDepth(-18)
          .setScale(0.45)
          .setAlpha(0.7)
          .setTint(0xff2266);
        img.setData('anchorX', x);
        img.setData('frame', frame);
        this.reactorImages.push(img);

        if (this.lights) {
          const l = this.lights.addLight(x, 500, 220, 0xff0066, 0.9);
          this.tweens.add({
            targets: l,
            intensity: { from: 0.6, to: 1.4 },
            radius: { from: 180, to: 260 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });
    }
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.barricades = this.physics.add.staticGroup();
    this.lavaHazards = this.physics.add.staticGroup();
    const groundY = 768;

    // ── Section A: Sky Gate / Molten Gorge (0-4500) ──
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, 600, 'refinery', 1);
    this.terrainGen.generateGroundSegment(this.platforms, 1000, groundY, 500, 'refinery', 2);
    this.terrainGen.generateGroundSegment(this.platforms, 1900, groundY, 400, 'refinery', 3);
    this.terrainGen.generateGroundSegment(this.platforms, 2700, groundY, 600, 'refinery', 4);
    this.terrainGen.generateGroundSegment(this.platforms, 3700, groundY, 500, 'refinery', 5);
    this.terrainGen.generateGroundSegment(this.platforms, 4600, groundY, 400, 'refinery', 6);

    const gaps = [
      { start: 600, end: 1000 },
      { start: 1500, end: 1900 },
      { start: 2300, end: 2700 },
      { start: 3300, end: 3700 },
      { start: 4200, end: 4600 }
    ];
    gaps.forEach(gap => {
      const w = gap.end - gap.start;
      const lava = this.lavaHazards.create(gap.start + w / 2, groundY + 16, 'tile-refinery-lava') as Phaser.Physics.Arcade.Sprite;
      lava.setDisplaySize(w, 32);
      (lava.body as Phaser.Physics.Arcade.StaticBody).setSize(w, 250);
      lava.refreshBody();
      lava.setDepth(4);
      lava.setTint(0xff6622);

      if (this.lights) {
        const l = this.lights.addLight(gap.start + w / 2, groundY - 10, w * 0.8, 0xff3300, 0.85);
        this.tweens.add({
          targets: l,
          intensity: { from: 0.6, to: 1.1 },
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      if (!this.textures.exists('px-lava-bubble')) {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(3, 3, 3);
        g.generateTexture('px-lava-bubble', 6, 6);
        g.destroy();
      }

      this.add.particles(gap.start + w / 2, groundY + 10, 'px-lava-bubble', {
        x: { min: -w / 2, max: w / 2 },
        y: 0,
        speedY: { min: -140, max: -40 },
        speedX: { min: -25, max: 25 },
        scale: { start: 1.6, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xff3300, 0xffaa00, 0xff6600, 0xff2200],
        lifespan: { min: 700, max: 1400 },
        frequency: 100,
      }).setDepth(5);
    });

    [400, 800, 1300, 1700, 2200, 2500, 3100, 3400, 4000, 4400].forEach((x, i) => {
      this.terrainGen.generatePlatform(this.platforms, x, 450 + Math.sin(i * 1.3) * 60, 64, 'refinery');
    });

    // ── Section B: Smelting Refinery (4500-9000) ──
    this.terrainGen.generateGroundSegment(this.platforms, 4600, groundY, 4400, 'refinery', 8);

    for (let cx = 4500; cx < 9000; cx += 256) {
      const ceil = this.platforms.create(cx + 128, 480, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      ceil.setDisplaySize(256, 32);
      ceil.refreshBody();
      ceil.setDepth(3);
      ceil.setTint(0x2a1a1a);
    }

    [5200, 7000, 8800].forEach(x => {
      const b = new Barricade(this, x, 624);
      b.setScale(1.2, 3.8);
      (b.body as Phaser.Physics.Arcade.StaticBody).setSize(38, 244);
      b.refreshBody();
      b.setDepth(4);
      this.barricades.add(b);
    });

    [5600, 6000, 6400, 7400, 7800, 8200].forEach((x, i) => {
      this.terrainGen.generatePlatform(this.platforms, x, 620 + Math.sin(i * 0.5) * 40, 80, 'refinery');
    });

    // ── Section C: Warrior Tunnels (9000-12000) ──
    this.terrainGen.generateGroundSegment(this.platforms, 9000, groundY, 3000, 'refinery', 9);

    for (let cx = 9000; cx < 9460; cx += 32) {
      const ceil = this.platforms.create(cx + 16, 706 - 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      ceil.setDisplaySize(32, 32); ceil.refreshBody(); ceil.setDepth(3); ceil.setTint(0x1a1a1a);
    }

    for (let cy = 520; cy < 706; cy += 32) {
      const p = this.platforms.create(9460 - 16, cy + 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      p.setDisplaySize(32, 32); p.refreshBody(); p.setDepth(3); p.setTint(0x1a1a1a);
    }
    for (let cy = 520; cy < 768; cy += 32) {
      const p = this.platforms.create(9540 + 16, cy + 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      p.setDisplaySize(32, 32); p.refreshBody(); p.setDepth(3); p.setTint(0x1a1a1a);
    }

    for (let cx = 9500; cx < 10500; cx += 32) {
      const fl = this.platforms.create(cx + 16, 520 + 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      fl.setDisplaySize(32, 32); fl.refreshBody(); fl.setDepth(3); fl.setTint(0x1a1a1a);
      const cl = this.platforms.create(cx + 16, 458 - 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      cl.setDisplaySize(32, 32); cl.refreshBody(); cl.setDepth(3); cl.setTint(0x1a1a1a);
    }

    this.terrainGen.generateThornPatch(this.platforms, 9750, 520, 160, 88);

    for (let cy = 520; cy < 768; cy += 32) {
      const p = this.platforms.create(10460 - 16, cy + 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      p.setDisplaySize(32, 32); p.refreshBody(); p.setDepth(3); p.setTint(0x1a1a1a);
    }
    for (let cy = 520; cy < 706; cy += 32) {
      const p = this.platforms.create(10540 + 16, cy + 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      p.setDisplaySize(32, 32); p.refreshBody(); p.setDepth(3); p.setTint(0x1a1a1a);
    }

    for (let cx = 10540; cx < 12000; cx += 32) {
      const ceil = this.platforms.create(cx + 16, 706 - 16, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      ceil.setDisplaySize(32, 32); ceil.refreshBody(); ceil.setDepth(3); ceil.setTint(0x1a1a1a);
    }

    // ── Section C: Altar / Boss Arena (12000-15000) ──
    this.terrainGen.generateGroundSegment(this.platforms, 12000, groundY, 3000, 'gorge', 10);

    [12400, 12800, 13200, 13600, 14000].forEach(x => {
      this.terrainGen.generatePlatform(this.platforms, x, 520, 80, 'gorge');
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();

    // ── Section A: Sky Gate (0-5000) ──
    const a: BaseEnemy[] = [
      new FlyingEnemy(this, 500, 350, this.player),
      new FlyingEnemy(this, 900, 300, this.player),
      new FlyingEnemy(this, 1400, 380, this.player),
      new FlyingEnemy(this, 2000, 320, this.player),
      new FlyingEnemy(this, 2400, 400, this.player),
      new FlyingEnemy(this, 3000, 350, this.player),
      new FlyingEnemy(this, 3500, 300, this.player),
      new FlyingEnemy(this, 4100, 380, this.player),
      new FlyingEnemy(this, 4500, 340, this.player),
      new LeaperEnemy(this, 2800, 738, this.player, { health: 60, damage: 15, speed: 80, patrolMinX: 2750, patrolMaxX: 2900 }),
    ];

    // ── Section B: Smelting Refinery (5000-9000) ──
    const b: BaseEnemy[] = [
      new MechaEnemy(this, 5400, 700, this.player, { health: 380, speed: 65, patrolMinX: 5100, patrolMaxX: 5700 }),
      new MechaEnemy(this, 6200, 700, this.player, { health: 400, speed: 70, patrolMinX: 5900, patrolMaxX: 6500 }),
      new ShieldEnemy(this, 6800, 700, this.player, { health: 70, damage: 16, speed: 50, patrolMinX: 6700, patrolMaxX: 6900 }),
      new MechaEnemy(this, 7300, 700, this.player, { health: 420, speed: 70, patrolMinX: 7100, patrolMaxX: 7500 }),
      new SpitterEnemy(this, 7800, 650, this.player, { health: 50, damage: 14, patrolMinX: 7700, patrolMaxX: 7900 }),
      new ShieldEnemy(this, 8200, 700, this.player, { health: 75, damage: 18, speed: 55, patrolMinX: 8100, patrolMaxX: 8300 }),
      new MechaEnemy(this, 8600, 700, this.player, { health: 420, speed: 70, patrolMinX: 8500, patrolMaxX: 8800 }),
    ];

    // ── Section C: Warrior Tunnels (9000-12000) ──
    const c: BaseEnemy[] = [
      new SpitterEnemy(this, 9300, 676, this.player, { health: 40, damage: 12, patrolMinX: 9100, patrolMaxX: 9400 }),
      new LeaperEnemy(this, 10000, 490, this.player, { health: 50, damage: 15, speed: 70, patrolMinX: 9800, patrolMaxX: 10300 }),
      new SpitterEnemy(this, 10800, 676, this.player, { health: 40, damage: 12, patrolMinX: 10600, patrolMaxX: 11000 }),
      new FlyingEnemy(this, 11500, 350, this.player),
    ];

    this.enemies.addMultiple([...a, ...b, ...c]);
  }

  private createTarotCards(): void {
    const strengthCard = new TarotCard(this, 5200, 738, 'strength');
    strengthCard.setDepth(1);
    const starCard = new TarotCard(this, 2600, 380, 'star');
    starCard.setDepth(1);

    this.physics.add.overlap(this.player, strengthCard, () => {
      strengthCard.collect(this.player);
      this.tarotSystem.collect('strength', this.player);
      this.gameAudio?.playCardCollect();
    });
    this.physics.add.overlap(this.player, starCard, () => {
      starCard.collect(this.player);
      this.tarotSystem.collect('star', this.player);
      this.gameAudio?.playCardCollect();
    });
  }

  private createDecorations(): void {
    // Torches with flickering lights
    [300, 1000, 1900, 2700, 3700, 4600, 5500, 6500, 7500, 8500, 9500, 10500, 11500, 12500].forEach(x => {
      this.add.rectangle(x, 660, 5, 14, 0x332211).setDepth(5);
      if (this.lights) {
        const flame = this.lights.addLight(x, 650, 35, 0xff6622, 0.25);
        flame.z = 15;
        this.tweens.add({ targets: flame, intensity: { from: 0.18, to: 0.32 }, radius: { from: 28, to: 42 }, duration: 200 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });

    // Foreground pillars
    [1500, 3500, 6000, 8000, 11000, 13000].forEach(x => {
      this.add.rectangle(x, 400, 20, 400, 0x1a1520, 0.5).setDepth(60).setScrollFactor(0.95);
    });
  }

  private createEchoFragments(): void {
    const e1 = new EchoFragment(this, 6000, 630, 0);
    const e2 = new EchoFragment(this, 12000, 600, 1);
    this.echoFragments.push(e1, e2);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.WORLD_W, this.WORLD_H);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setFollowOffset(0, -60);
    this.cameras.main.setDeadzone(80, 60);
    this.cameras.main.setZoom(CAMERA_ZOOM_DRAGON); // Start zoomed out for dragon flight
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.barricades);
    this.physics.add.collider(this.enemies, this.barricades);

    this.physics.add.collider(this.player, this.enemies, (_player, _enemy) => {
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0) return;
      const knockDir = this.player.x < enemy.x ? -1 : 1;
      this.player.takeDamage(enemy.attackDamage, knockDir);
    });

    // Player overlap with lava hazards -> instant death
    this.physics.add.overlap(this.player, this.lavaHazards, () => {
      if (this.player.alive) {
        this.player.takeDamage(100, 0);
      }
    });

    // Bullets vs platforms
    this.physics.add.collider(
      this.player.combatSystem.bullets,
      this.platforms,
      (_bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
        b.disableBody(true, true);
      }
    );

    // Bullets vs enemies
    this.physics.add.overlap(
      this.player.combatSystem.bullets,
      this.enemies,
      (_bullet, _enemy) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        const target = _enemy as BaseEnemy;
        if (target.health <= 0) return;

        let pierce = (b.getData('pierce') as number) ?? 2;
        pierce--;
        b.setData('pierce', pierce);
        if (pierce <= 0) b.disableBody(true, true);

        target.takeDamage(this.player.combatSystem.getFireDamage());
        spawnHitParticles(this, target.x, target.y);
      }
    );

    this.echoFragments.forEach((e) => {
      this.physics.add.overlap(this.player, e, () => { if (e.active) e.collect(); });
    });
  }

  private setupLighting(): void {
    if (!this.lights) return;
    this.platforms.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.barricades.getChildren().forEach(c => (c as Phaser.GameObjects.Sprite).setLighting(true));
    this.player.setLighting(true);
    (this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).forEach(c => { if (c.body) c.setLighting(true); });

    // 1. Ambient large foundry spots
    const l1 = this.lights.addLight(2000, 300, 1000, 0xff5500, 0.45);
    const l2 = this.lights.addLight(5000, 300, 1000, 0xff5500, 0.45);
    const l3 = this.lights.addLight(8000, 300, 1000, 0xff5500, 0.45);
    const l4 = this.lights.addLight(11000, 300, 1000, 0xff5500, 0.45);
    const l5 = this.lights.addLight(14000, 300, 1000, 0xff5500, 0.45);
    l1.z = 200;
    l2.z = 200;
    l3.z = 200;
    l4.z = 200;
    l5.z = 200;

    // 2. Tarot cards and crystals lights
    (this.children.list as Phaser.GameObjects.Sprite[]).forEach(child => {
      if (child.texture && child.texture.key === 'prop-crystal') {
        child.setLighting(true);
        const cLight = this.lights.addLight(child.x, child.y - 12, 110, 0x00ffcc, 1.25);
        cLight.z = 30;
        this.tweens.add({
          targets: cLight,
          intensity: { from: 0.85, to: 1.6 },
          duration: Phaser.Math.Between(1600, 2600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      if (child.texture && child.texture.key === 'prop-card') {
        child.setLighting(true);
        const cardLight = this.lights.addLight(child.x, child.y, 80, 0xff44aa, 1.4);
        cardLight.z = 25;
      }
    });
  }

  private showIntroText(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const text = this.add.text(cx, cy - 40, 'ZONE 4 — THE FOUNDRY GATES', {
      fontSize: '20px', fontFamily: 'Georgia, serif', color: '#ff6622', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);
    this.tweens.add({ targets: text, alpha: { from: 0, to: 1 }, duration: 600, yoyo: true, hold: 1500, onComplete: () => text.destroy() });
  }

  update(time: number, delta: number): void {
    if (!this.player?.active) return;

    this.player.update(time, delta);
    this.gameAudio?.update(this.player.x);
    if (this.playerShadow?.active) {
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }

    if (this.demoEnded) return;

    this.updateParallax();
    this.weatherSystem?.update(this.cameras.main.scrollX, time);
    this.updateSwordVsEnemies();
    this.updateVignettePulse();
    this.updateBulletLights();
    this.checkBossTrigger();
    this.checkTransition();
  }

  private updateParallax(): void {
    const cam = this.cameras.main;
    const camX = cam.scrollX;
    const w = this.scale.width;
    const h = this.scale.height;

    this.refinerySunImages.forEach(img => {
      if (!img || !img.active) return;
      const ax = img.getData('anchorX') as number;
      const targetScreenX = w * 0.70 - (camX * 0.02) + ax;
      const targetScreenY = h * 0.65;
      img.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      img.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      img.setScale(0.55 / cam.zoom);
      const frame = img.getData('frame') as Phaser.GameObjects.Rectangle;
      if (frame) {
        frame.x = img.x;
        frame.y = img.y;
        frame.setScale(1.0 / cam.zoom);
      }
    });

    this.furnaceImages.forEach(img => {
      if (!img || !img.active) return;
      const ax = img.getData('anchorX') as number;
      const targetScreenX = w * 0.50 - (camX * 0.06) + ax;
      const targetScreenY = h * 0.70;
      img.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      img.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      img.setScale(0.5 / cam.zoom);
      const frame = img.getData('frame') as Phaser.GameObjects.Rectangle;
      if (frame) {
        frame.x = img.x;
        frame.y = img.y;
        frame.setScale(1.0 / cam.zoom);
      }
    });

    this.reactorImages.forEach(img => {
      if (!img || !img.active) return;
      const ax = img.getData('anchorX') as number;
      const targetScreenX = w * 0.35 - (camX * 0.12) + ax;
      const targetScreenY = h * 0.55;
      img.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      img.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      img.setScale(0.45 / cam.zoom);
      const frame = img.getData('frame') as Phaser.GameObjects.Rectangle;
      if (frame) {
        frame.x = img.x;
        frame.y = img.y;
        frame.setScale(1.0 / cam.zoom);
      }
    });
  }

  private updateSwordVsEnemies(): void {
    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0 || !e.body) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        e.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, e.x, e.y);
      }
    });
    this.barricades.getChildren().forEach((b) => {
      const barricade = b as Barricade;
      if (!barricade.active || !barricade.alive) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, barricade.getBounds())) {
        barricade.takeDamage(this.player.combatSystem.getSwordDamage());
      }
    });
  }

  private updateVignettePulse(): void {
    if (!(this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
    const vignette = this.cameras.main.filters.internal.list.find((f: Phaser.Filters.Controller) => f.renderNode === 'FilterVignette') as Phaser.Filters.Vignette | undefined;
    if (!vignette) return;
    const hpRatio = this.player.health / this.player.maxHealth;
    const heatLevel = this.player.formMachine.heat.level;
    setVignetteFromPlayer(vignette, hpRatio, heatLevel, this.time.now);
  }

  private updateBulletLights(): void {
    this.player.combatSystem.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        bullet.setLighting(true);
        if (this.lights && this.lights.active) {
          let light = this.bulletLights.get(bullet);
          if (!light) {
            light = this.lights.addLight(bullet.x, bullet.y, 100, 0xff5500, 1.4);
            light.z = 25;
            this.bulletLights.set(bullet, light);
          } else {
            light.x = bullet.x;
            light.y = bullet.y;
            light.setIntensity(1.4);
          }
        }
      }
    });

    // Clean up inactive bullet lights
    this.bulletLights.forEach((light, bullet) => {
      if (!bullet.active) {
        if (this.lights && this.lights.active) {
          this.lights.removeLight(light);
        }
        this.bulletLights.delete(bullet);
      }
    });
  }

  private checkBossTrigger(): void {
    if (this.bossActive) return;
    if (this.player.x >= 12000) this.activateBoss();
  }

  private activateBoss(): void {
    this.bossActive = true;
    this.gameAudio?.playBossWarning();
    this.time.delayedCall(2400, () => this.gameAudio?.playBossBGM());
    this.cameras.main.flash(400, 200, 0, 0);

    const sw = this.scale.width, sh = this.scale.height;
    const warn = this.add.text(sw / 2, sh / 2 - 60, 'THE GATEKEEPER', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ff4400', stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);
    const sub = this.add.text(sw / 2, sh / 2 + 10, t('boss.foundryP1'), {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffaa44', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

    this.tweens.add({ targets: warn, alpha: { from: 0, to: 1 }, scaleX: { from: 0.5, to: 1.1 }, scaleY: { from: 0.5, to: 1.1 }, duration: 250, yoyo: true, hold: 800, repeat: 1, onComplete: () => warn.destroy() });
    this.tweens.add({ targets: sub, alpha: { from: 0, to: 1 }, duration: 300, delay: 200, yoyo: true, hold: 1500, onComplete: () => sub.destroy() });

    // Spawn boss immediately — no delay
    this.boss = new Gatekeeper(this, 13000, 500, this.player);
    this.enemies.add(this.boss);
    if (this.lights) this.boss.setLighting(true);
    this.cameras.main.zoomTo(1.3, 600, 'Cubic.easeInOut');
    this.cameras.main.shake(400, 0.005);

    const boss = this.boss;
    const origDie = (boss as any).die.bind(boss);
    (boss as any).die = () => { origDie(); this.time.delayedCall(500, () => this.triggerVictory()); };
  }

  private triggerVictory(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;
    this.player.setVelocity(0, 0);
    if (this.player.body) (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cameras.main.fade(2000, 0, 0, 0);
    this.time.delayedCall(2000, () => {
      this.scene.start('TransitionScene45', {
        startPos: { x: 960, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: true,
        dragonUnlocked: true,
        showBossCinematic: true,
      });
    });
  }

  private checkTransition(): void {
    if (this.player.x <= 40) {
      this.demoEnded = true;
      this.scene.start('TransitionScene34', { startPos: { x: 960, y: 650 }, cardsCollected: this.tarotSystem.collectedCards, mechaUnlocked: true, dragonUnlocked: true });
    }
  }
}
