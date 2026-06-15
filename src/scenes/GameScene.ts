import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { DragonCore } from '../entities/DragonCore';
import { TarotCard } from '../entities/TarotCard';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { LeaperEnemy } from '../entities/enemies/LeaperEnemy';
import { Barricade } from '../entities/Barricade';
import { FormState } from '../systems/FormStateMachine';
import { ShmupSystem } from '../systems/ShmupSystem';
import { TarotSystem } from '../systems/TarotSystem';
import { saveGame, loadGame } from '../systems/SaveSystem';
import { CrumblingPlatform } from '../entities/CrumblingPlatform';
import { SaveAltar } from '../entities/SaveAltar';
import {
  spawnHitParticles,
  spawnTransformParticles,
  spawnDeathExplosion,
} from '../effects/Particles';
import { BloomSystem } from '../effects/BloomSystem';
import {
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  CAMERA_LERP,
  CAMERA_ZOOM_HUMAN,
} from '../utils/constants';
import { t } from '../i18n';

interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  texture?: string;
}

export class GameScene extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private destructibles!: Phaser.Physics.Arcade.StaticGroup;
  private solidDestructibles!: Phaser.Physics.Arcade.StaticGroup;
  private dragonCore!: DragonCore;
  private shmupSystem!: ShmupSystem;
  private tarotSystem!: TarotSystem;

  private bgSky!: Phaser.GameObjects.TileSprite;
  private bgMist1!: Phaser.GameObjects.TileSprite;
  private bgMist2!: Phaser.GameObjects.TileSprite;
  private bgMountains!: Phaser.GameObjects.TileSprite;
  private bgForest!: Phaser.GameObjects.TileSprite;
  private bgRuins!: Phaser.GameObjects.TileSprite;
  private bgMoon!: Phaser.GameObjects.Image;
  private bgMoonGlow1!: Phaser.GameObjects.Image;
  private bgMoonGlow2!: Phaser.GameObjects.Image;
  private bgCastle!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private bgTwinkleStars!: Phaser.GameObjects.Group;
  private bgMoonBeamsBack!: Phaser.GameObjects.Graphics;
  private bgMoonBeamsFront!: Phaser.GameObjects.Graphics;
  private moonBeams: Array<{
    baseAngle: number;
    angleOscSpeed: number;
    angleOscAmp: number;
    anglePhase: number;
    baseAlpha: number;
    alphaOscSpeed: number;
    alphaOscAmp: number;
    alphaPhase: number;
    length: number;
    width0: number;
    width1: number;
  }> = [];
  private nextMeteorTime = 0;
  private emberTimer = 0;

  private shmupZoneActive = false;
  private crumblingPlatforms: CrumblingPlatform[] = [];
  private fogWall: Phaser.GameObjects.Graphics | null = null;
  private ashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bloom!: BloomSystem;

  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;
  private pendingSpawnX = 100;
  private pendingSpawnY = 650;
  private pendingCardsToCollect: string[] = [];
  private demoEnded = false;
  public isCutsceneActive = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { startPos?: { x: number; y: number }; cardsCollected?: string[]; mechaUnlocked?: boolean; dragonUnlocked?: boolean }): void {
    if (data) {
      if (data.startPos) {
        this.pendingSpawnX = data.startPos.x;
        this.pendingSpawnY = data.startPos.y;
      }
      if (data.cardsCollected) {
        this.pendingCardsToCollect = data.cardsCollected;
      }
      if (data.mechaUnlocked !== undefined) {
        this.pendingMechaUnlock = data.mechaUnlocked;
      }
      if (data.dragonUnlocked !== undefined) {
        this.pendingDragonUnlock = data.dragonUnlocked;
      }
    }
  }

  create(): void {
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    // Initialize Game Audio system
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM();
    this.gameAudio.playAmbientZone(1);

    // Cleanup BGM when transitioning/destroying scene
    this.events.once('shutdown', () => {
      this.gameAudio.stopBGM();
      this.gameAudio.stopAmbient();
      this.bloom?.destroy();
    });
    this.events.once('destroy', () => {
      this.gameAudio.stopBGM();
      this.gameAudio.stopAmbient();
      this.bloom?.destroy();
    });

    this.bloom = new BloomSystem(this);

    this.createParallax();
    this.createLevel();
    this.createCrumblingPlatforms();
    this.createForeground();
    this.createDestructibles();
    this.createDecorations();
    this.createFogWall();
    this.createAshParticles();
    this.tarotSystem = new TarotSystem();
    if (this.pendingCardsToCollect && this.pendingCardsToCollect.length > 0) {
      this.pendingCardsToCollect.forEach((cardId) => {
        this.tarotSystem.collect(cardId, null as any);
      });
    }

    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();

    this.createEnemies();
    this.createDragonCore();
    this.createBarricades();
    this.createShmup();
    this.createTarotCards();
    this.setupCamera();
    this.setupCollisions();
    this.showIntroText();
    this.createVignette();

    this.scene.launch('UIScene', {
      player: this.player,
      tarotSystem: this.tarotSystem,
    });
  }

  private createParallax(): void {
    this.cameras.main.setBackgroundColor('#080610');

    // 1. Sky Gradient and stars
    this.bgSky = this.add.tileSprite(0, 0, LEVEL_WIDTH, 1200, 'bg-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.05, 0)
      .setDepth(-30);

    // 2. Red Moon (Unique, stays static vertically, very slow horizontal scroll, scaled down slightly to fit)
    this.bgMoon = this.add.image(0, 0, 'bg-moon')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(-28);

    // 3. Castle Silhouette (Unique, stays static vertically, slow horizontal scroll, integrated deeper)
    this.bgCastle = this.add.image(0, 0, 'bg-castle')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(-25)
      .setAlpha(0.92);
    // Apply a dual-tone gradient tint: silver-gray on the left, warm crimson on the right
    this.bgCastle.setTint(0xccd5e0, 0xff8899, 0x384452, 0x602030);

    // 3.3 Moon Glow Layer 1 (behind castle, subtle corona)
    this.bgMoonGlow1 = this.add.image(0, 0, 'moon-glow')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(-24)
      .setBlendMode(Phaser.BlendModes.ADD);

    // 3.5 Mist Layer 1 (behind mountains, very slow drift)
    this.bgMist1 = this.add.tileSprite(0, 210, this.scale.width * 1.5, 128, 'bg-mist')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-22)
      .setAlpha(0.5);

    // 4. Parallax Mountains
    this.bgMountains = this.add
      .tileSprite(0, 240, this.scale.width * 1.5, 800, 'bg-mountains')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-20);
    this.bgMountains.setTint(0xcc4455, 0xff8899, 0x4d1622, 0x992c3f);

    // 5. Parallax Forest
    this.bgForest = this.add
      .tileSprite(0, 280, this.scale.width * 1.5, 800, 'bg-forest')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-15);
    this.bgForest.setTint(0xbb3344, 0xff6677, 0x401018, 0x882233);

    // 5.5 Mist Layer 2 (in front of forest, behind ruins, faster drift)
    this.bgMist2 = this.add.tileSprite(0, 270, this.scale.width * 1.5, 128, 'bg-mist')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-12)
      .setAlpha(0.4);

    // 6. Parallax Ruins
    this.bgRuins = this.add
      .tileSprite(0, 310, this.scale.width * 1.5, 800, 'bg-ruins')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);
    this.bgRuins.setTint(0xdd5566, 0xff8899, 0x662c38, 0xbb4455);

    // 6.5 Moon Glow Layer 2 (large volumetric atmospheric bloom overlaying backgrounds)
    this.bgMoonGlow2 = this.add.image(0, 0, 'moon-glow')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(-8)
      .setBlendMode(Phaser.BlendModes.ADD);

    // 6.8 Volumetric Moon Beams (God Rays)
    this.bgMoonBeamsBack = this.add.graphics()
      .setDepth(-23)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.bgMoonBeamsFront = this.add.graphics()
      .setDepth(45)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Configured crimson moon beams fan-out (angles pointing down-left, softened alphas)
    this.moonBeams = [
      { baseAngle: 118, angleOscSpeed: 0.0005, angleOscAmp: 1.8, anglePhase: 0,   baseAlpha: 0.012, alphaOscSpeed: 0.0010, alphaOscAmp: 0.004, alphaPhase: 1.0, length: 1200, width0: 6, width1: 140 },
      { baseAngle: 130, angleOscSpeed: 0.0004, angleOscAmp: 2.5, anglePhase: 1.5, baseAlpha: 0.015, alphaOscSpeed: 0.0008, alphaOscAmp: 0.005, alphaPhase: 2.5, length: 1400, width0: 8, width1: 180 },
      { baseAngle: 141, angleOscSpeed: 0.0006, angleOscAmp: 2.1, anglePhase: 3.1, baseAlpha: 0.018, alphaOscSpeed: 0.0012, alphaOscAmp: 0.006, alphaPhase: 0.5, length: 1300, width0: 5, width1: 160 },
      { baseAngle: 152, angleOscSpeed: 0.0005, angleOscAmp: 1.5, anglePhase: 4.5, baseAlpha: 0.016, alphaOscSpeed: 0.0009, alphaOscAmp: 0.005, alphaPhase: 3.8, length: 1500, width0: 7, width1: 200 },
      { baseAngle: 163, angleOscSpeed: 0.0003, angleOscAmp: 2.0, anglePhase: 0.8, baseAlpha: 0.014, alphaOscSpeed: 0.0007, alphaOscAmp: 0.004, alphaPhase: 1.9, length: 1250, width0: 6, width1: 130 },
      { baseAngle: 175, angleOscSpeed: 0.0004, angleOscAmp: 2.5, anglePhase: 2.2, baseAlpha: 0.010, alphaOscSpeed: 0.0011, alphaOscAmp: 0.003, alphaPhase: 4.8, length: 1100, width0: 4, width1: 110 },
    ];

    // 7. Twinkling Stars
    this.bgTwinkleStars = this.add.group();
    for (let i = 0; i < 30; i++) {
      const sx = Phaser.Math.Between(0, this.scale.width);
      const sy = Phaser.Math.Between(10, 320); // upper sky area
      const star = this.add.image(sx, sy, 'star-twinkle')
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(-29)
        .setAlpha(Phaser.Math.FloatBetween(0.1, 0.95));
      
      star.setData('screenX', sx);
      star.setData('screenY', sy);
      
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.02, 0.15) },
        duration: Phaser.Math.Between(1200, 3000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1500),
        ease: 'Sine.easeInOut'
      });
      this.bgTwinkleStars.add(star);
    }
  }

  private createVignette(): void {
    const { width, height } = this.cameras.main;
    const g = this.add.graphics();

    for (let y = 0; y < height; y++) {
      const t = Math.abs((y / height - 0.5) * 2);
      const alpha = 0.4 * t * t * t;
      g.fillStyle(0x000000, alpha);
      g.fillRect(0, y, width, 1);
    }

    for (let x = 0; x < width; x++) {
      const t = Math.abs((x / width - 0.5) * 2);
      const a = 0.25 * t * t * t;
      g.fillStyle(0x000000, a);
      g.fillRect(x, 0, 1, height);
    }

    g.setDepth(100);
    g.setScrollFactor(0);
  }

  private createPlayer(): void {
    this.player = new Player(this, 100, 650);

    this.playerShadow = this.add
      .image(this.player.x, this.player.y + 32, 'shadow')
      .setDepth(-5)
      .setAlpha(0.5);
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    const platforms: PlatformDef[] = [
      // === SECTION 1: The Wakening (0-2000) ===
      { x: 0, y: 768, width: 2000, height: 32, texture: 'tile-ground' },
      { x: 300, y: 640, width: 160, height: 16, texture: 'tile-grass' },
      { x: 550, y: 540, width: 128, height: 16, texture: 'tile-grass' },
      { x: 750, y: 620, width: 192, height: 16, texture: 'tile-grass' },
      { x: 1050, y: 520, width: 160, height: 16, texture: 'tile-grass' },
      { x: 1350, y: 640, width: 160, height: 16, texture: 'tile-grass' },
      { x: 1650, y: 520, width: 192, height: 16, texture: 'tile-grass' },

      // === SECTION 2: The Petrified Ascent & Thorn Chasms (2000-4500) ===
      { x: 2000, y: 768, width: 300, height: 32, texture: 'tile-ground' },
      // Gap 1 (2300-2800) has thorns
      { x: 2800, y: 768, width: 300, height: 32, texture: 'tile-ground' },
      // Gap 2 (3100-3700) has thorns
      { x: 3700, y: 768, width: 300, height: 32, texture: 'tile-ground' },
      // Gap 3 (4000-4500) has thorns

      { x: 1950, y: 650, width: 96, height: 16, texture: 'tile-stump' },
      { x: 2350, y: 650, width: 64, height: 16, texture: 'tile-stump' },
      { x: 2680, y: 620, width: 64, height: 16, texture: 'tile-stump' },

      { x: 2850, y: 650, width: 96, height: 16, texture: 'tile-stump' },
      { x: 3440, y: 520, width: 64, height: 16, texture: 'tile-stump' },
      { x: 3750, y: 650, width: 96, height: 16, texture: 'tile-stump' },

      { x: 4080, y: 640, width: 64, height: 16, texture: 'tile-stump' },
      { x: 4360, y: 620, width: 64, height: 16, texture: 'tile-stump' },

      // === SECTION 3: The Sunken Ruins (4500-6800) ===
      { x: 4500, y: 768, width: 2300, height: 32, texture: 'tile-ground' },
      { x: 4600, y: 640, width: 160, height: 128, texture: 'tile-ruins' },
      { x: 4850, y: 520, width: 192, height: 248, texture: 'tile-ruins' },
      { x: 5150, y: 400, width: 160, height: 368, texture: 'tile-ruins' },
      { x: 5400, y: 550, width: 224, height: 218, texture: 'tile-ruins' },
      { x: 5750, y: 600, width: 160, height: 168, texture: 'tile-ruins' },
      { x: 6050, y: 480, width: 192, height: 288, texture: 'tile-ruins' },
      { x: 6350, y: 580, width: 160, height: 188, texture: 'tile-ruins' },

      // === SECTION 4: The Altar of the Core (6800-8000) ===
      { x: 6800, y: 768, width: 1200, height: 32, texture: 'tile-ground' },
      { x: 6900, y: 660, width: 128, height: 16, texture: 'tile-altar' },
      { x: 7100, y: 560, width: 128, height: 16, texture: 'tile-altar' },
      { x: 7320, y: 460, width: 256, height: 308, texture: 'tile-altar' },
    ];

    platforms.forEach((p) => {
      const textureKey = p.texture || 'tile-platform';
      const isGround = textureKey === 'tile-ground' || textureKey === 'ground-cave';
      const isThorns = textureKey === 'tile-thorns';
      
      const tileW = 32;
      const tileH = (isGround || isThorns) ? 32 : 16;

      for (let tx = p.x; tx < p.x + p.width; tx += tileW) {
        for (let ty = p.y; ty < p.y + p.height; ty += tileH) {
          const tile = this.platforms.create(tx + tileW / 2, ty + tileH / 2, textureKey);
          
          if (!isGround && !isThorns && textureKey !== 'tile-ruins' && textureKey !== 'tile-altar') {
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.left = false;
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.right = false;
          }
        }
      }
    });

    // Spawn thorns in Section 2 gaps
    for (let tx = 2300; tx < 2800; tx += 32) {
      this.hazards.create(tx + 16, 784, 'tile-thorns');
    }
    for (let tx = 3100; tx < 3700; tx += 32) {
      this.hazards.create(tx + 16, 784, 'tile-thorns');
    }
    for (let tx = 4000; tx < 4500; tx += 32) {
      this.hazards.create(tx + 16, 784, 'tile-thorns');
    }

    // Spawn thorns on top of ruins for Hollow Knight challenge
    // Ruin 2 (4850 to 5042) thorns at 4900 to 4964, y = 520 (sitting on top: center y = 504)
    for (let tx = 4900; tx < 4964; tx += 32) {
      this.hazards.create(tx + 16, 504, 'tile-thorns');
    }
    // Ruin 4 (5400 to 5624) thorns at 5480 to 5544, y = 550 (sitting on top: center y = 534)
    for (let tx = 5480; tx < 5544; tx += 32) {
      this.hazards.create(tx + 16, 534, 'tile-thorns');
    }
    // Ruin 6 (6050 to 6242) thorns at 6100 to 6164, y = 480 (sitting on top: center y = 464)
    for (let tx = 6100; tx < 6164; tx += 32) {
      this.hazards.create(tx + 16, 464, 'tile-thorns');
    }
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();

    // Section 1: The Wakening (6 enemies)
    const e1 = new BaseEnemy(this, 600, 738, 'enemy-sentry', this.player, {
      patrolMinX: 450,
      patrolMaxX: 900,
      speed: 60,
    });
    const e2 = new LeaperEnemy(this, 600, 510, this.player, {
      patrolMinX: 560,
      patrolMaxX: 660,
      speed: 70,
    });
    const e3 = new SpitterEnemy(this, 840, 590, this.player, {
      patrolMinX: 760,
      patrolMaxX: 920,
      speed: 50,
    });
    const e4 = new ShieldEnemy(this, 1130, 490, this.player, {
      patrolMinX: 1060,
      patrolMaxX: 1180,
      speed: 45,
    });
    const e5 = new LeaperEnemy(this, 1420, 610, this.player, {
      patrolMinX: 1360,
      patrolMaxX: 1480,
      speed: 75,
    });
    const e6 = new SpitterEnemy(this, 1740, 490, this.player, {
      patrolMinX: 1660,
      patrolMaxX: 1820,
      speed: 50,
    });

    // Section 2: Petrified Ascent (3 enemies)
    const e7 = new ShieldEnemy(this, 2150, 738, this.player, {
      patrolMinX: 2020,
      patrolMaxX: 2280,
      speed: 45,
    });
    const e8 = new LeaperEnemy(this, 2950, 738, this.player, {
      health: 50,
      damage: 12,
      speed: 95, // Fast Leaper
      patrolMinX: 2820,
      patrolMaxX: 3080,
    });
    const e9 = new ShieldEnemy(this, 3850, 738, this.player, {
      health: 60,
      damage: 15, // Tough Shield Guard
      speed: 45,
      patrolMinX: 3720,
      patrolMaxX: 3980,
    });

    // Section 3: Sunken Ruins (7 enemies guarding ruin roofs)
    const e10 = new SpitterEnemy(this, 4680, 608, this.player, {
      health: 55,
      damage: 15,
      speed: 50,
      patrolMinX: 4610,
      patrolMaxX: 4740,
    });
    const e11 = new ShieldEnemy(this, 4950, 488, this.player, {
      health: 60,
      damage: 15,
      speed: 45,
      patrolMinX: 4860,
      patrolMaxX: 5020,
    });
    const e12 = new LeaperEnemy(this, 5230, 368, this.player, {
      health: 70,
      damage: 18, // Elite Leaper
      speed: 95,
      patrolMinX: 5160,
      patrolMaxX: 5290,
    });
    const e13 = new BaseEnemy(this, 5510, 518, 'enemy-sentry', this.player, {
      health: 60,
      damage: 15,
      speed: 80,
      patrolMinX: 5410,
      patrolMaxX: 5600,
    });
    const e14 = new SpitterEnemy(this, 5830, 568, this.player, {
      health: 60,
      damage: 15,
      speed: 55,
      patrolMinX: 5760,
      patrolMaxX: 5890,
    });
    const e15 = new ShieldEnemy(this, 6140, 448, this.player, {
      health: 70,
      damage: 18, // Elite Shield
      speed: 50,
      patrolMinX: 6060,
      patrolMaxX: 6220,
    });
    const e16 = new LeaperEnemy(this, 6430, 548, this.player, {
      health: 60,
      damage: 15,
      speed: 80,
      patrolMinX: 6360,
      patrolMaxX: 6490,
    });

    // Section 4: Altar of the Core (2 enemies)
    const e17 = new ShieldEnemy(this, 6960, 628, this.player, {
      health: 70,
      damage: 18,
      speed: 50,
      patrolMinX: 6910,
      patrolMaxX: 7010,
    });

    const giantSentry = new ShieldEnemy(this, 7450, 428, this.player, {
      health: 90,
      damage: 20, // Giant Shield Guardian
      speed: 50,
      patrolMinX: 7360,
      patrolMaxX: 7560,
      detectRange: 260
    });
    giantSentry.setScale(1.4);
    giantSentry.refreshBody();

    this.enemies.addMultiple([e1, e2, e3, e4, e5, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15, e16, e17, giantSentry]);
  }

  private createDragonCore(): void {
    this.dragonCore = new DragonCore(this, 7478, 400);
  }

  private createCrumblingPlatforms(): void {
    const crumblingDefs = [
      // Gap 1
      { x: 2480, y: 580 },
      { x: 2512, y: 580 },
      { x: 2544, y: 580 },
      // Gap 2
      { x: 3180, y: 600 },
      { x: 3212, y: 600 },
      { x: 3244, y: 600 },
      { x: 3276, y: 600 },
      { x: 3308, y: 600 },
      { x: 3340, y: 600 },
      // Gap 2 second set
      { x: 3550, y: 560 },
      { x: 3582, y: 560 },
      { x: 3614, y: 560 },
      // Gap 3
      { x: 4180, y: 580 },
      { x: 4212, y: 580 },
      { x: 4244, y: 580 },
      // Section 4 Altars
      { x: 7040, y: 610 },
      { x: 7072, y: 610 },
      { x: 7240, y: 510 },
      { x: 7272, y: 510 }
    ];

    crumblingDefs.forEach((def) => {
      const cp = new CrumblingPlatform(this, this.platforms, def.x, def.y);
      this.crumblingPlatforms.push(cp);
    });
  }

  private checkCrumblingPlatforms(): void {
    this.crumblingPlatforms.forEach((cp) => {
      if (!cp.active) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body && body.blocked.down && this.player.y < cp.body.y - 10) {
        if (Math.abs(this.player.x - cp.body.x) < 24) {
          cp.trigger();
        }
      }
    });
  }

  private addDestructible(x: number, y: number, type: 'bush' | 'bush-large' | 'rock-destructible' | 'rock-large'): void {
    const isRock = type.indexOf('rock') !== -1;
    const yOffset = type === 'bush' ? -10 : (type === 'bush-large' ? -14 : (type === 'rock-destructible' ? -12 : -16));
    const group = isRock ? this.solidDestructibles : this.destructibles;
    const sprite = group.create(x, y + yOffset, type) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(5);

    // Randomize visuals for organic variety
    sprite.setFlipX(Phaser.Math.Between(0, 1) === 1);
    
    // Scale randomization (85% to 115%)
    const scale = Phaser.Math.Between(85, 115) / 100;
    sprite.setScale(scale);
    sprite.refreshBody(); // resize static body boundaries

    if (isRock) {
      // Subtle tilt rotation for rocks
      sprite.setAngle(Phaser.Math.Between(-15, 15));
    }
  }

  private createDestructibles(): void {
    this.destructibles = this.physics.add.staticGroup();
    this.solidDestructibles = this.physics.add.staticGroup();

    // === SECTION 1 (0 to 2000) ===
    const sec1Grounds = [120, 150, 220, 260, 410, 440, 620, 680, 880, 930, 1020, 1220, 1310, 1390, 1420, 1510, 1580, 1850, 1920];
    const sec1GroundTypes: ('bush' | 'bush-large' | 'rock-destructible' | 'rock-large')[] = 
      ['bush', 'bush-large', 'rock-destructible', 'bush', 'rock-large', 'bush', 'bush-large', 'rock-destructible', 'bush', 'rock-large', 'bush-large', 'bush', 'rock-destructible', 'bush-large', 'bush', 'rock-large', 'bush', 'rock-destructible', 'bush-large'];
    sec1Grounds.forEach((x, idx) => {
      this.addDestructible(x, 768, sec1GroundTypes[idx % sec1GroundTypes.length]);
    });

    // Platforms in Section 1
    this.addDestructible(380, 640, 'bush');
    this.addDestructible(420, 640, 'rock-destructible');
    this.addDestructible(580, 540, 'bush-large');
    this.addDestructible(820, 620, 'bush-large');
    this.addDestructible(860, 620, 'rock-destructible');
    this.addDestructible(1130, 520, 'rock-large');
    this.addDestructible(1160, 520, 'bush');
    this.addDestructible(1400, 640, 'bush-large');
    this.addDestructible(1720, 520, 'rock-destructible');

    // === SECTION 2 (2000 to 4500) ===
    const sec2Grounds = [2050, 2120, 2200, 2260, 2850, 2900, 3000, 3060, 3750, 3820, 3900, 3960];
    const sec2GroundTypes: ('bush' | 'bush-large' | 'rock-destructible' | 'rock-large')[] = 
      ['rock-large', 'bush-large', 'rock-destructible', 'bush', 'rock-destructible', 'bush-large', 'rock-large', 'bush', 'bush', 'rock-large', 'bush-large', 'rock-destructible'];
    sec2Grounds.forEach((x, idx) => {
      this.addDestructible(x, 768, sec2GroundTypes[idx % sec2GroundTypes.length]);
    });

    // Platforms/Stumps in Section 2
    this.addDestructible(1980, 650, 'bush');
    this.addDestructible(2370, 650, 'bush-large');
    this.addDestructible(2700, 620, 'rock-destructible');
    this.addDestructible(2880, 650, 'rock-large');
    this.addDestructible(3460, 520, 'bush');
    this.addDestructible(3780, 650, 'bush-large');
    this.addDestructible(4100, 640, 'rock-destructible');
    this.addDestructible(4380, 620, 'bush');

    // === SECTION 3 (4500 to 6800) ===
    const sec3Grounds = [4550, 4780, 4820, 5080, 5120, 5360, 5650, 5700, 5950, 6000, 6260, 6300, 6560, 6600, 6720];
    sec3Grounds.forEach((x, idx) => {
      const type = idx % 4 === 0 ? 'rock-large' : (idx % 4 === 1 ? 'bush-large' : (idx % 4 === 2 ? 'rock-destructible' : 'bush'));
      this.addDestructible(x, 768, type);
    });

    // Ruin Roofs
    this.addDestructible(4650, 640, 'rock-destructible');
    this.addDestructible(4710, 640, 'bush');
    this.addDestructible(4950, 520, 'rock-large');
    this.addDestructible(5010, 520, 'bush-large');
    this.addDestructible(5200, 400, 'rock-destructible');
    this.addDestructible(5260, 400, 'bush');
    this.addDestructible(5480, 550, 'rock-large');
    this.addDestructible(5580, 550, 'bush-large');
    this.addDestructible(5830, 600, 'rock-destructible');
    this.addDestructible(6120, 480, 'rock-large');
    this.addDestructible(6190, 480, 'bush-large');
    this.addDestructible(6410, 580, 'rock-destructible');
    this.addDestructible(6470, 580, 'bush');

    // === SECTION 4 (6800 to 8000) ===
    const sec4Grounds = [6850, 6950, 7050, 7150, 7250, 7550, 7650, 7750, 7820];
    sec4Grounds.forEach((x, idx) => {
      const type = idx % 3 === 0 ? 'bush-large' : (idx % 3 === 1 ? 'rock-large' : 'bush');
      this.addDestructible(x, 768, type);
    });

    // Altars
    this.addDestructible(6940, 660, 'bush');
    this.addDestructible(6980, 660, 'rock-destructible');
    this.addDestructible(7140, 560, 'bush-large');
    this.addDestructible(7180, 560, 'rock-large');
    this.addDestructible(7360, 460, 'bush-large');
    this.addDestructible(7420, 460, 'rock-large');
    this.addDestructible(7500, 460, 'bush');
    this.addDestructible(7540, 460, 'rock-destructible');
  }

  private createDecorations(): void {
    // Spawn glowing crystals on solid ground/platforms
    const crystalSpots = [
      { x: 300, y: 736 },
      { x: 550, y: 736 },
      { x: 920, y: 640 },
      { x: 1250, y: 520 },
      { x: 1550, y: 736 },
      { x: 2150, y: 650 },
      { x: 2500, y: 736 },
      { x: 2900, y: 620 },
      { x: 3450, y: 520 },
      { x: 3800, y: 736 },
      { x: 4200, y: 640 },
      { x: 4650, y: 640 },
      { x: 5150, y: 736 },
      { x: 5500, y: 550 },
      { x: 6050, y: 480 },
      { x: 6500, y: 736 },
      { x: 7000, y: 660 },
      { x: 7420, y: 460 },
    ];

    crystalSpots.forEach((spot) => {
      const crystal = this.add.image(spot.x, spot.y, 'prop-crystal');
      crystal.setOrigin(0.5, 1);
      crystal.setDepth(-1);
      crystal.setScale(Phaser.Math.FloatBetween(0.85, 1.15));
      if (Math.random() > 0.5) crystal.setFlipX(true);

      this.tweens.add({
        targets: crystal,
        alpha: { from: 0.75, to: 1.0 },
        scaleY: crystal.scaleY * 1.06,
        duration: Phaser.Math.Between(1600, 2600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Spawn hanging chains from ceilings/under platforms
    const chainSpots = [
      { x: 240, y: 96, length: 3 },
      { x: 450, y: 96, length: 4 },
      { x: 850, y: 96, length: 3 },
      { x: 1200, y: 96, length: 5 },
      { x: 1750, y: 96, length: 4 },
      { x: 2300, y: 96, length: 3 },
      { x: 2750, y: 220, length: 2 },
      { x: 3100, y: 220, length: 3 },
      { x: 3600, y: 96, length: 4 },
      { x: 4100, y: 96, length: 5 },
      { x: 4800, y: 96, length: 3 },
      { x: 5350, y: 96, length: 4 },
      { x: 5900, y: 96, length: 4 },
      { x: 6450, y: 96, length: 3 },
      { x: 7100, y: 96, length: 5 },
    ];

    chainSpots.forEach((spot) => {
      for (let i = 0; i < spot.length; i++) {
        const link = this.add.image(spot.x, spot.y + i * 20, 'prop-chain');
        link.setOrigin(0.5, 0);
        link.setDepth(-2);
        link.setAngle(Math.sin(i * 0.5) * 4);
      }
    });
  }

  private checkBushDestruction(): void {
    if (!this.player.combatSystem.isSwordActive()) return;
    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;

    this.destructibles.getChildren().forEach((b) => {
      const sprite = b as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, sprite.getBounds())) {
        this.destroyDestructible(sprite);
      }
    });

    this.solidDestructibles.getChildren().forEach((b) => {
      const sprite = b as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) return;
      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, sprite.getBounds())) {
        this.destroyDestructible(sprite);
      }
    });
  }

  private destroyDestructible(sprite: Phaser.Physics.Arcade.Sprite): void {
    const x = sprite.x;
    const y = sprite.y;
    const key = sprite.texture.key;
    sprite.destroy();

    if (key === 'rock-destructible' || key === 'rock-large') {
      this.gameAudio?.playDestruction();
      const isLarge = key === 'rock-large';
      const particleCount = isLarge ? 12 : 8;
      const shakeForce = isLarge ? 0.004 : 0.002;
      const maxDist = isLarge ? 60 : 40;
      
      for (let i = 0; i < particleCount; i++) {
        const shard = this.add.rectangle(
          x + Phaser.Math.Between(-12, 12), y + Phaser.Math.Between(-12, 12),
          Phaser.Math.Between(3, isLarge ? 8 : 6), Phaser.Math.Between(3, isLarge ? 8 : 6),
          Phaser.Math.Between(0, 1) ? 0x2e2d35 : 0xaa2211
        );
        this.tweens.add({
          targets: shard,
          x: shard.x + Phaser.Math.Between(-maxDist, maxDist),
          y: shard.y - Phaser.Math.Between(10, 40),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(300, 700),
          onComplete: () => shard.destroy(),
        });
      }
      this.cameras.main.shake(80, shakeForce);
    } else {
      this.gameAudio?.playBushRustle();
      const isLarge = key === 'bush-large';
      const leafColor = isLarge ? 0x1e3314 : 0x2a4018;
      const particleCount = isLarge ? 12 : 8;
      const maxDist = isLarge ? 50 : 30;

      for (let i = 0; i < particleCount; i++) {
        const leaf = this.add.rectangle(
          x + Phaser.Math.Between(-10, 10), y + Phaser.Math.Between(-10, 10),
          Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4),
          Phaser.Math.Between(0, 1) ? leafColor : 0x111e0a
        );
        this.tweens.add({
          targets: leaf,
          x: leaf.x + Phaser.Math.Between(-maxDist, maxDist),
          y: leaf.y - Phaser.Math.Between(15, 45),
          alpha: 0,
          angle: Phaser.Math.Between(-180, 180),
          duration: Phaser.Math.Between(400, 850),
          onComplete: () => leaf.destroy(),
        });
      }
    }
  }

  private createForeground(): void {
    // Burnt trees resting on ground (y=768)
    [1050, 1400, 1750, 2050, 3500, 4300, 5000, 5800, 6600, 7400].forEach((fx) => {
      this.add.image(fx, 768, 'fg-tree')
        .setOrigin(0.5, 1).setDepth(60).setAlpha(0.6).setScrollFactor(0.95);
    });
    // Broken columns resting on ground (y=768)
    [3400, 3700, 4200, 4800, 5500, 6200, 7000].forEach((fx) => {
      this.add.image(fx, 768, 'fg-column')
        .setOrigin(0.5, 1).setDepth(60).setAlpha(0.5).setScrollFactor(0.95);
    });
    // Hanging vines
    [2100, 2300, 2600, 2900, 4700, 5200, 5900, 6400].forEach((fx) => {
      this.add.image(fx, 420, 'fg-vine')
        .setOrigin(0.5, 0).setDepth(60).setAlpha(0.4).setScrollFactor(0.95);
    });
  }

  private createFogWall(): void {
    this.fogWall = this.add.graphics()
      .setDepth(90)
      .setScrollFactor(1);

    this.fogWall.fillStyle(0x000000, 0.95);
    this.fogWall.fillRect(7900, 0, 400, LEVEL_HEIGHT);
  }

  private createAshParticles(): void {
    this.ashEmitter = this.add.particles(0, 0, 'particle-ember', {
      x: { min: 0, max: 8000 },
      y: -10,
      lifespan: 6000,
      speedY: { min: 15, max: 40 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.3, end: 0 },
      frequency: 200,
      quantity: 1,
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: true,
    });
    this.ashEmitter.setDepth(40);
  }

  private createShmup(): void {
    this.shmupSystem = new ShmupSystem(this, this.player);
  }

  private restoreSave(data: ReturnType<typeof loadGame>): void {
    if (!data) return;
    data.cardsCollected.forEach((cardId) => {
      this.tarotSystem.collect(cardId, null as any);
    });
    if (data.mechaUnlocked) {
      this.pendingMechaUnlock = true;
    }
    // Always start player at the beginning for the overhauled level
    this.pendingSpawnX = 100;
    this.pendingSpawnY = 650;
  }

  private requestSave(): void {
    saveGame({
      cardsCollected: this.tarotSystem.collectedCards,
      mechaUnlocked: this.player.formMachine.hasTransform(),
      dragonUnlocked: false,
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private createTarotCards(): void {
    const magicianCard = new TarotCard(this, 680, 720, 'magician');
    magicianCard.setDepth(1);

    this.physics.add.overlap(this.player, magicianCard, () => {
      magicianCard.collect(this.player);
      this.tarotSystem.collect('magician', this.player);
      this.gameAudio?.playCardCollect();
      this.requestSave();
    });
  }

  private createBarricades(): void {
    this.barricades = this.physics.add.staticGroup();

    // Secret wall at start blocking alcove
    const b1 = new Barricade(this, 650, 736);
    // Final wall blocking path past altar
    const b2 = new Barricade(this, 7700, 736);

    this.barricades.addMultiple([b1, b2]);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(
      this.player,
      this.enemies,
      (_player, _enemy) => {
        const player = _player as Player;
        const enemy = _enemy as BaseEnemy;
        if (!enemy.active || enemy.health <= 0) return;

        // Knockback player away from enemy's center
        const knockDir = player.x < enemy.x ? -1 : 1;
        player.takeDamage(enemy.attackDamage, knockDir);
      }
    );
    this.physics.add.collider(this.player, this.barricades);
    this.physics.add.collider(this.enemies, this.barricades);
    this.physics.add.collider(this.player, this.solidDestructibles);
    this.physics.add.collider(this.enemies, this.solidDestructibles);

    this.physics.add.overlap(
      this.player,
      this.dragonCore,
      (_player, core) => {
        (core as DragonCore).collect(_player as Player);
        this.gameAudio?.playCoreCollect();
        this.triggerCoreCutscene();
      }
    );

    this.physics.add.overlap(
      this.player,
      this.hazards,
      (_player, _hazard) => {
        const knockDir = this.player.x < (_hazard as Phaser.GameObjects.Sprite).x ? -1 : 1;
        this.player.takeDamage(15, knockDir);
      }
    );

    this.physics.add.collider(
      this.player.combatSystem.bullets,
      this.platforms,
      (_bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        b.disableBody(true, true);
      }
    );

    this.physics.add.overlap(
      this.player.combatSystem.bullets,
      this.enemies,
      (_bullet, _enemy) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        b.disableBody(true, true);
        (_enemy as BaseEnemy).takeDamage(this.player.combatSystem.getFireDamage());
        spawnHitParticles(this, (_enemy as BaseEnemy).x, (_enemy as BaseEnemy).y);
      }
    );
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setDeadzone(50, 50);
    this.cameras.main.setZoom(CAMERA_ZOOM_HUMAN);
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
  }

  private showIntroText(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2 - 40;
    const scale = this.cameras.main.width / 800;

    const intro1 = this.add
      .text(cx, cy, t('story.intro1'), {
        fontSize: `${Math.round(8 * scale)}px`,
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    const intro2 = this.add
      .text(cx, cy + 24 * scale, t('story.intro2'), {
        fontSize: `${Math.round(7 * scale)}px`,
        fontFamily: 'monospace',
        color: '#ff6600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    const controls = this.add
      .text(cx, cy + 60 * scale, t('story.controls'), {
        fontSize: `${Math.round(5.5 * scale)}px`,
        fontFamily: 'monospace',
        color: '#998866',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    this.tweens.add({ targets: intro1, alpha: 1, duration: 800, delay: 200 });
    this.tweens.add({ targets: intro2, alpha: 1, duration: 800, delay: 600 });
    this.tweens.add({ targets: controls, alpha: 1, duration: 800, delay: 1000 });

    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: [intro1, intro2],
        alpha: 0,
        duration: 800,
      });
    });

    this.time.delayedCall(9000, () => {
      this.tweens.add({
        targets: controls,
        alpha: 0,
        duration: 800,
      });
    });
  }

  private triggerCoreCutscene(): void {
    if (this.isCutsceneActive) return;
    this.isCutsceneActive = true;

    // Save current camera zoom and set to 1.0 for the cutscene
    const originalZoom = this.cameras.main.zoom;
    this.cameras.main.setZoom(1.0);

    // 1. Pause gameplay physics and disable player inputs
    this.physics.world.pause();
    this.player.setInputEnabled(false);

    // 2. Disable all enemies and freeze them in place
    const disabledEnemies: BaseEnemy[] = [];
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (e.active && e.isActive) {
        e.isActive = false;
        if (e.body) {
          e.body.velocity.x = 0;
          e.body.velocity.y = 0;
        }
        disabledEnemies.push(e);
      }
    });

    // 3. Hide HUD (UIScene)
    this.scene.setVisible(false, 'UIScene');

    // 4. Create Cutscene Overlays and cinematic widescreen black bars
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;

    // Dark backdrop overlay to dim the scene behind the cinematic
    const backdrop = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(498)
      .setAlpha(0);

    // Widescreen cinematic bars (top and bottom)
    const barHeight = 85 * scale;
    const topBar = this.add.rectangle(cx, barHeight / 2, cam.width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(500);

    const bottomBar = this.add.rectangle(cx, cam.height - barHeight / 2, cam.width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(500);

    // Add gold/bronze decorative rules to separate the bars from the game/artwork
    const topBorder = this.add.rectangle(cx, barHeight, cam.width, 2 * scale, 0x996633)
      .setScrollFactor(0)
      .setDepth(501);

    const bottomBorder = this.add.rectangle(cx, cam.height - barHeight, cam.width, 2 * scale, 0x996633)
      .setScrollFactor(0)
      .setDepth(501);

    // Slide images: we will center the illustration in the screen
    const slideSprite = this.add.image(cx, cy, 'cinematic-gem-1')
      .setScrollFactor(0)
      .setDepth(499)
      .setAlpha(0);

    // scale the image to fit nicely within the widescreen letterbox
    const targetHeight = cam.height - barHeight * 2 - 10 * scale;
    const aspect = slideSprite.width / slideSprite.height;
    slideSprite.setDisplaySize(targetHeight * aspect, targetHeight);

    // Subtitle text in bottom bar
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

    // "Skip" or "Next" hint text
    const hintText = this.add.text(cam.width - 25 * scale, cam.height - 15 * scale, t('story.introSkip') || 'ENTER / CLICK to continue', {
      fontSize: `${Math.round(8 * scale)}px`,
      fontFamily: 'monospace',
      color: '#665544'
    })
    .setOrigin(1, 0.5)
    .setScrollFactor(0)
    .setDepth(502);

    // Fade backdrop and first slide in
    this.tweens.add({
      targets: [backdrop, slideSprite],
      alpha: 1,
      duration: 600
    });

    // Slideshow control state
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
        delay: 25, // typing speed
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
      subtitle.setText(fullText);
    };

    // Load initial slide text
    startTypewriter(t(`story.cinematicSlide1`));

    // Cleanup and end cutscene function
    const endCutscene = () => {
      this.tweens.add({
        targets: [backdrop, topBar, bottomBar, topBorder, bottomBorder, slideSprite, subtitle, hintText],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          // Destroy all objects
          backdrop.destroy();
          topBar.destroy();
          bottomBar.destroy();
          topBorder.destroy();
          bottomBorder.destroy();
          slideSprite.destroy();
          subtitle.destroy();
          hintText.destroy();

          // Restore normal state
          this.isCutsceneActive = false;
          this.physics.world.resume();
          this.player.setInputEnabled(true);
          this.cameras.main.setZoom(originalZoom);
          
          // Re-enable disabled enemies
          disabledEnemies.forEach((e) => {
            if (e.active) {
              e.isActive = true;
            }
          });

          // Show UIScene overlay again
          this.scene.setVisible(true, 'UIScene');

          // Save game progress
          this.requestSave();

          // Show mecha tutorial prompt banner
          this.showCoreUnlockedPrompt();
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
        // Unbind events first
        this.input.keyboard?.off('keydown-ENTER', handleInteraction);
        this.input.off('pointerdown', handleInteraction);
        endCutscene();
      } else {
        // Crossfade to the next slide
        this.tweens.add({
          targets: slideSprite,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            slideSprite.setTexture(`cinematic-gem-${currentSlide}`);
            this.tweens.add({
              targets: slideSprite,
              alpha: 1,
              duration: 300
            });
            startTypewriter(t(`story.cinematicSlide${currentSlide}`));
          }
        });
      }
    };

    const handleInteraction = () => {
      advanceSlide();
    };

    // Bind keyboard and mouse/touch inputs
    this.input.keyboard?.on('keydown-ENTER', handleInteraction);
    this.input.on('pointerdown', handleInteraction);
  }

  private showCoreUnlockedPrompt(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const scale = this.cameras.main.width / 800;

    const bannerBg = this.add.rectangle(cx, cy, this.cameras.main.width, 140 * scale, 0x000000, 0.8)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500)
      .setAlpha(0);

    const borderTop = this.add.rectangle(cx, cy - 70 * scale, this.cameras.main.width, 2 * scale, 0xff6600)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500)
      .setAlpha(0);

    const borderBottom = this.add.rectangle(cx, cy + 70 * scale, this.cameras.main.width, 2 * scale, 0xff6600)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500)
      .setAlpha(0);

    const unlockText = this.add.text(cx, cy, t('story.coreFoundPrompt'), {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ffaa00',
      align: 'center',
      lineSpacing: 8 * scale,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(501)
    .setAlpha(0);

    this.tweens.add({
      targets: [bannerBg, borderTop, borderBottom, unlockText],
      alpha: 1,
      duration: 600,
    });

    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: [bannerBg, borderTop, borderBottom, unlockText],
        alpha: 0,
        duration: 600,
        onComplete: () => {
          bannerBg.destroy();
          borderTop.destroy();
          borderBottom.destroy();
          unlockText.destroy();
        }
      });
    });
  }

  private transitionToLevel2(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.cameras.main.fade(1000, 0, 0, 0);

    this.time.delayedCall(1000, () => {
      this.scene.start('TransitionScene12', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private triggerDemoEnd(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.cameras.main.fade(1500, 0, 0, 0);

    this.time.delayedCall(1500, () => {
      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;
      const scale = this.cameras.main.width / 800;

      this.add.rectangle(0, 0, this.cameras.main.width * 2, this.cameras.main.height * 2, 0x000000)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);

      const titleText = this.add.text(cx, cy, t('story.demoEndPrompt'), {
        fontSize: `${Math.round(18 * scale)}px`,
        fontFamily: 'monospace',
        color: '#cc2222',
        align: 'center',
        lineSpacing: 12 * scale,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0);

      this.tweens.add({
        targets: titleText,
        alpha: 1,
        duration: 2000,
        ease: 'Power2',
      });
    });
  }

  update(time: number, delta: number): void {
    if (this.isCutsceneActive) return;

    if (this.player && this.player.active) {
      this.gameAudio?.update(this.player.x);
    }
    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.checkBushDestruction();
    this.updateBulletCleanup();
    this.checkCrumblingPlatforms();
    this.updateEmbers(delta);
    this.updateBloom();
    this.updateShmupZone(delta, time);

    if (this.player.active) {
      if (this.player.y > LEVEL_HEIGHT + 60) {
        this.player.takeDamage(100, 0);
      }
      if (this.player.x >= 7950) {
        this.transitionToLevel2();
      }
    }
  }

  private updateShmupZone(delta: number, time: number): void {
    const inShmupZone = this.player.x > 2900 && this.player.x < 4500;
    const isDragon = this.player.formMachine.state === FormState.DRAGON;

    if (inShmupZone && isDragon && !this.shmupZoneActive) {
      this.shmupZoneActive = true;
      this.shmupSystem.activate(2900, 4500);
    } else if ((!inShmupZone || !isDragon) && this.shmupZoneActive) {
      this.shmupZoneActive = false;
      this.shmupSystem.deactivate();
    }

    if (this.shmupZoneActive) {
      this.shmupSystem.update(delta);
      this.shmupSystem.updateShmupEnemies(time, delta);
    }
  }

  resumeNormalCamera(): void {
    this.cameras.main.stopFollow();
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setDeadzone(50, 50);
    this.cameras.main.zoomTo(CAMERA_ZOOM_HUMAN, 500);
  }

  private updateShadows(): void {
    const onGround = this.player.body ? (this.player.body.blocked.down || this.player.body.touching.down) : false;
    const shadowYOffset = (this.player.height * this.player.scaleY) / 2 - 2 * this.player.scaleY;
    this.playerShadow.setPosition(this.player.x, this.player.y + shadowYOffset);

    if (onGround) {
      this.playerShadow.setAlpha(0.5);
      this.playerShadow.setScale(this.player.scaleX);
    } else {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const falling = body.velocity.y > 0;
      if (falling) {
        this.playerShadow.setAlpha(0.15);
        this.playerShadow.setScale(
          this.player.scaleX * (1 - Math.min(Math.abs(body.velocity.y) / 600, 0.8))
        );
      } else {
        this.playerShadow.setAlpha(0.3);
        this.playerShadow.setScale(this.player.scaleX * 0.7);
      }
    }
  }

  private updateParallax(): void {
    const cam = this.cameras.main;
    const camX = cam.scrollX;
    this.bgMountains.tilePositionX = camX * 0.08;
    this.bgForest.tilePositionX = camX * 0.2;
    this.bgRuins.tilePositionX = camX * 0.35;

    const w = this.scale.width;
    const h = this.scale.height;

    // Dynamically adjust tile width/height to ensure 100% viewport coverage
    const desiredWidth = w * cam.zoom * 2.0;
    const desiredHeight = h * cam.zoom;

    if (this.bgSky) {
      this.bgSky.width = desiredWidth;
      this.bgSky.height = desiredHeight;
      this.bgSky.setScale(1.0 / cam.zoom);
      this.bgSky.y = (0 - cam.centerY) / cam.zoom + cam.centerY;
    }

    const time = this.time.now;
    if (this.bgMist1) {
      this.bgMist1.tilePositionX = camX * 0.05 + time * 0.008;
      this.bgMist1.width = desiredWidth;
      this.bgMist1.height = desiredHeight;
      this.bgMist1.setScale(1.0 / cam.zoom);
      this.bgMist1.y = (210 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgMountains) {
      this.bgMountains.width = desiredWidth;
      this.bgMountains.height = desiredHeight;
      this.bgMountains.setScale(1.0 / cam.zoom);
      this.bgMountains.y = (240 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgForest) {
      this.bgForest.width = desiredWidth;
      this.bgForest.height = desiredHeight;
      this.bgForest.setScale(1.0 / cam.zoom);
      this.bgForest.y = (280 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgMist2) {
      this.bgMist2.tilePositionX = camX * 0.15 + time * 0.015;
      this.bgMist2.width = desiredWidth;
      this.bgMist2.height = desiredHeight;
      this.bgMist2.setScale(1.0 / cam.zoom);
      this.bgMist2.y = (270 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgRuins) {
      this.bgRuins.width = desiredWidth;
      this.bgRuins.height = desiredHeight;
      this.bgRuins.setScale(1.0 / cam.zoom);
      this.bgRuins.y = (310 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgTwinkleStars) {
      this.bgTwinkleStars.getChildren().forEach(child => {
        const star = child as Phaser.GameObjects.Image;
        const sx = star.getData('screenX');
        const sy = star.getData('screenY');
        const scrolledX = sx - (cam.scrollX * 0.02); // very slow horizontal scroll
        star.x = (scrolledX - cam.centerX) / cam.zoom + cam.centerX;
        star.y = (sy - cam.centerY) / cam.zoom + cam.centerY;
        star.setScale(1.0 / cam.zoom);
      });
    }

    if (time > this.nextMeteorTime) {
      this.spawnShootingStar();
      this.nextMeteorTime = time + Phaser.Math.Between(4000, 9000);
    }

    // Calculate end of Zone 1 graphic transition values past x = 6500
    let overflow = 0;
    let bgAlphaMultiplier = 1;
    if (cam.scrollX > 6500) {
      overflow = cam.scrollX - 6500;
      bgAlphaMultiplier = Math.max(0, 1 - overflow / 700);
    }

    if (this.bgMoon) {
      const targetScreenX = w * 0.78 - overflow; // slides left to scroll off screen
      const targetScreenY = h * 0.20;
      this.bgMoon.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.bgMoon.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.bgMoon.setScale(1.2 / cam.zoom);
      this.bgMoon.setAlpha(bgAlphaMultiplier);

      const glowPulse = Math.sin(time * 0.001) * 0.05; // gentle 5% scale pulse
      const glowAlphaPulse = Math.sin(time * 0.0015) * 0.03; // gentle alpha pulse

      if (this.bgMoonGlow1) {
        this.bgMoonGlow1.x = this.bgMoon.x;
        this.bgMoonGlow1.y = this.bgMoon.y;
        this.bgMoonGlow1.setScale((1.5 + glowPulse) / cam.zoom);
        this.bgMoonGlow1.setAlpha((0.85 + glowAlphaPulse) * bgAlphaMultiplier);
      }

      if (this.bgMoonGlow2) {
        this.bgMoonGlow2.x = this.bgMoon.x;
        this.bgMoonGlow2.y = this.bgMoon.y;
        this.bgMoonGlow2.setScale((3.2 + glowPulse * 2.0) / cam.zoom);
        this.bgMoonGlow2.setAlpha((0.7 + glowAlphaPulse) * bgAlphaMultiplier);
      }

      // Draw volumetric moonlight beams with fade multiplier
      this.updateMoonBeams(time, cam, w, h, overflow, bgAlphaMultiplier);
    }

    if (this.bgCastle) {
      // Parallax scroll the castle horizontally at 0.03 relative to camera scroll, then slide off past x = 6500
      const castleScrollX = Math.min(cam.scrollX, 6500);
      const targetScreenX = w * 0.45 - (castleScrollX * 0.03) - overflow;
      const targetScreenY = h * 0.49;
      this.bgCastle.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.bgCastle.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.bgCastle.setScale(1.1 / cam.zoom);
      this.bgCastle.setAlpha(0.92 * bgAlphaMultiplier);
    }
  }

  private updateMoonBeams(time: number, cam: Phaser.Cameras.Scene2D.Camera, w: number, h: number, overflow = 0, bgAlphaMultiplier = 1): void {
    if (!this.bgMoonBeamsBack || !this.bgMoonBeamsFront) return;

    this.bgMoonBeamsBack.clear();
    this.bgMoonBeamsFront.clear();

    const startScreenX = w * 0.78 - overflow;
    const startScreenY = h * 0.20;

    const steps = 8;
    const crimsonColor = 0xff3344;

    this.moonBeams.forEach((beam) => {
      // Animate angle and alpha with smooth sine oscillations
      const currentAngleDeg = beam.baseAngle + Math.sin(time * beam.angleOscSpeed + beam.anglePhase) * beam.angleOscAmp;
      const A = currentAngleDeg * Math.PI / 180;
      const currentAlpha = Math.max(0, beam.baseAlpha + Math.sin(time * beam.alphaOscSpeed + beam.alphaPhase) * beam.alphaOscAmp) * bgAlphaMultiplier;

      // Draw beam in segments to create the volumetric fade-out along its length
      for (let s = 0; s < steps; s++) {
        const t1 = s / steps;
        const t2 = (s + 1) / steps;

        const dist1 = t1 * beam.length;
        const dist2 = t2 * beam.length;

        const w1 = beam.width0 + (beam.width1 - beam.width0) * t1;
        const w2 = beam.width0 + (beam.width1 - beam.width0) * t2;

        const cx1 = startScreenX + Math.cos(A) * dist1;
        const cy1 = startScreenY + Math.sin(A) * dist1;
        const cx2 = startScreenX + Math.cos(A) * dist2;
        const cy2 = startScreenY + Math.sin(A) * dist2;

        const perp = A + Math.PI / 2;
        const dx1 = Math.cos(perp) * (w1 / 2);
        const dy1 = Math.sin(perp) * (w1 / 2);
        const dx2 = Math.cos(perp) * (w2 / 2);
        const dy2 = Math.sin(perp) * (w2 / 2);

        // Vertices at step s
        const x1_l = cx1 + dx1;
        const y1_l = cy1 + dy1;
        const x1_r = cx1 - dx1;
        const y1_r = cy1 - dy1;

        // Vertices at step s+1
        const x2_l = cx2 + dx2;
        const y2_l = cy2 + dy2;
        const x2_r = cx2 - dx2;
        const y2_r = cy2 - dy2;

        // Apply camera zoom and center compensation so they stay fixed on the screen relative to the moon
        const rx1_l = (x1_l - cam.centerX) / cam.zoom + cam.centerX;
        const ry1_l = (y1_l - cam.centerY) / cam.zoom + cam.centerY;
        const rx1_r = (x1_r - cam.centerX) / cam.zoom + cam.centerX;
        const ry1_r = (y1_r - cam.centerY) / cam.zoom + cam.centerY;

        const rx2_l = (x2_l - cam.centerX) / cam.zoom + cam.centerX;
        const ry2_l = (y2_l - cam.centerY) / cam.zoom + cam.centerY;
        const rx2_r = (x2_r - cam.centerX) / cam.zoom + cam.centerX;
        const ry2_r = (y2_r - cam.centerY) / cam.zoom + cam.centerY;

        // Linear fading of alpha along the beam's length
        const stepAlpha = currentAlpha * (1 - t1);

        // Draw in both the back and front graphics layers
        // Back layer is slightly dimmer and behind parallax mountains to blend with background
        this.bgMoonBeamsBack.fillStyle(crimsonColor, stepAlpha * 0.45);
        this.bgMoonBeamsBack.beginPath();
        this.bgMoonBeamsBack.moveTo(rx1_l, ry1_l);
        this.bgMoonBeamsBack.lineTo(rx1_r, ry1_r);
        this.bgMoonBeamsBack.lineTo(rx2_r, ry2_r);
        this.bgMoonBeamsBack.lineTo(rx2_l, ry2_l);
        this.bgMoonBeamsBack.closePath();
        this.bgMoonBeamsBack.fillPath();

        // Front layer sweeps over the player/terrain at full intensity (scaled for sublte look)
        this.bgMoonBeamsFront.fillStyle(crimsonColor, stepAlpha * 0.25);
        this.bgMoonBeamsFront.beginPath();
        this.bgMoonBeamsFront.moveTo(rx1_l, ry1_l);
        this.bgMoonBeamsFront.lineTo(rx1_r, ry1_r);
        this.bgMoonBeamsFront.lineTo(rx2_r, ry2_r);
        this.bgMoonBeamsFront.lineTo(rx2_l, ry2_l);
        this.bgMoonBeamsFront.closePath();
        this.bgMoonBeamsFront.fillPath();
      }
    });
  }

  private updateEmbers(delta: number): void {
    this.emberTimer += delta;
    if (this.emberTimer < 120) return;
    this.emberTimer = 0;

    const cam = this.cameras.main;
    const x = cam.scrollX + Phaser.Math.Between(0, cam.width);
    const y = cam.scrollY + cam.height + 10;

    for (let i = 0; i < 3; i++) {
      const ember = this.add.rectangle(
        x + Phaser.Math.Between(-10, 10),
        y + Phaser.Math.Between(0, 20),
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(0, 1) ? 0xff6600 : 0xff4400,
        0.6
      );
      ember.setDepth(50);

      this.tweens.add({
        targets: ember,
        x: ember.x + Phaser.Math.Between(-40, 40),
        y: ember.y - Phaser.Math.Between(80, 200),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(1500, 3500),
        ease: 'Sine.easeOut',
        onComplete: () => ember.destroy(),
      });
    }
  }

  private updateBloom(): void {
    // Dragon Core glow
    if (this.dragonCore && this.dragonCore.active) {
      this.bloom.add(this.dragonCore.x, this.dragonCore.y, 18, 0xff6600, 1.2);
    }

    // Player fire bullets glow
    this.player.combatSystem.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        this.bloom.add(bullet.x, bullet.y, 8, 0xff4400, 0.6);
      }
    });

    // Player energy glow (subtle, only when mecha/dragon)
    const state = this.player.formMachine.state;
    if (state === FormState.MECHA || state === FormState.DRAGON) {
      this.bloom.add(this.player.x, this.player.y - 10, 10, state === FormState.DRAGON ? 0xff0066 : 0xff5ea2, 0.3);
    }

    this.bloom.update();
  }

  private updateSwordVsEnemies(): void {
    if (!this.player.combatSystem.isSwordActive()) return;

    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;

    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        e.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, e.x, e.y);
      }
    });

    this.barricades.getChildren().forEach((barricade) => {
      const b = barricade as Barricade;
      if (!b.active || !b.alive) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, b.getBounds())) {
        b.takeDamage(this.player.combatSystem.getSwordDamage());
      }
    });
  }

  private updateBulletCleanup(): void {
    const cam = this.cameras.main;

    this.player.combatSystem.bullets.getChildren().forEach((bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      if (
        b.x < cam.scrollX - 100 ||
        b.x > cam.scrollX + cam.width + 100 ||
        b.y < cam.scrollY - 100 ||
        b.y > cam.scrollY + cam.height + 100
      ) {
        b.setActive(false);
        b.setVisible(false);
      }
    });
  }

  private spawnShootingStar(): void {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;

    // Spawn coordinate in screen space (upper sky area)
    const startScreenX = Phaser.Math.Between(w * 0.1, w * 0.8);
    const startScreenY = Phaser.Math.Between(h * 0.05, h * 0.25);

    // Angle: streaking down and left
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(135, 155));
    const length = Phaser.Math.Between(120, 240);

    const meteor = this.add.graphics();
    meteor.setDepth(-29);

    const path = { progress: 0 };
    
    this.tweens.add({
      targets: path,
      progress: 1,
      duration: Phaser.Math.Between(600, 1000),
      ease: 'Power2.easeOut',
      onUpdate: () => {
        meteor.clear();
        
        const currentLen = path.progress * length;
        const tipX = startScreenX - Math.cos(angle) * currentLen;
        const tipY = startScreenY + Math.sin(angle) * currentLen;

        const tailLen = Math.max(0, currentLen - 45);
        const tailX = startScreenX - Math.cos(angle) * tailLen;
        const tailY = startScreenY + Math.sin(angle) * tailLen;

        const tipWorldX = (tipX - cam.centerX) / cam.zoom + cam.centerX;
        const tipWorldY = (tipY - cam.centerY) / cam.zoom + cam.centerY;
        const tailWorldX = (tailX - cam.centerX) / cam.zoom + cam.centerX;
        const tailWorldY = (tailY - cam.centerY) / cam.zoom + cam.centerY;

        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps;
          const t2 = (s + 1) / steps;
          const x1 = tailWorldX + (tipWorldX - tailWorldX) * t1;
          const y1 = tailWorldY + (tipWorldY - tailWorldY) * t1;
          const x2 = tailWorldX + (tipWorldX - tailWorldX) * t2;
          const y2 = tailWorldY + (tipWorldY - tailWorldY) * t2;

          meteor.lineStyle(1.5 / cam.zoom, 0xffffff, t1 * (1 - path.progress * 0.8));
          meteor.beginPath();
          meteor.moveTo(x1, y1);
          meteor.lineTo(x2, y2);
          meteor.strokePath();
        }
      },
      onComplete: () => {
        meteor.destroy();
      }
    });
  }

  triggerDramaticDeath(player: Player): void {
    // 1. Stop all normal BGM and play tragic death theme
    this.gameAudio?.stopBGM();
    this.gameAudio?.playDeathTheme();

    const isMecha = player.formMachine.state === 'MECHA' || player.formMachine.state === 'DRAGON';
    
    // 2. Play chest core shatter explosion
    this.gameAudio?.playCoreShatter();
    
    // Lock character position and set kneeling posture
    player.setTexture(isMecha ? 'm-kneeling' : 'h-kneeling');
    player.setScale(isMecha ? 1.4 : 0.8);

    // Spawn mecha-core shatter particles using native emitter
    spawnDeathExplosion(this, player.x, player.y - 12);

    // 3. Lightning Strike (400ms delay)
    this.time.delayedCall(400, () => {
      if (!player.active) return;

      this.gameAudio?.playLightningStrike();
      this.cameras.main.flash(450, 220, 240, 255);
      this.cameras.main.shake(600, 0.015);

      const lightning = this.add.graphics();
      lightning.setDepth(player.depth + 10);

      const startX = player.x + Phaser.Math.Between(-60, 60);
      const startY = this.cameras.main.scrollY;
      const endX = player.x;
      const endY = player.y - 10;

      const drawBolt = (g: Phaser.GameObjects.Graphics, styleColor: number, width: number, alpha: number) => {
        g.lineStyle(width, styleColor, alpha);
        g.beginPath();
        g.moveTo(startX, startY);

        let currentX = startX;
        let currentY = startY;
        const steps = 12;
        const distY = (endY - startY) / steps;

        for (let j = 1; j < steps; j++) {
          const targetY = startY + j * distY;
          const targetX = currentX + Phaser.Math.Between(-35, 35) + (endX - currentX) * 0.15;
          g.lineTo(targetX, targetY);
          currentX = targetX;
          currentY = targetY;
        }

        g.lineTo(endX, endY);
        g.strokePath();
      };

      const style = { color1: 0xffffff, color2: 0x90d0ff };
      drawBolt(lightning, style.color2, 10, 0.45);
      drawBolt(lightning, style.color1, 4, 1.0);

      // Ground blast smoke
      for (let i = 0; i < 15; i++) {
        const smX = player.x + Phaser.Math.Between(-25, 25);
        const smY = player.y + 25 + Phaser.Math.Between(-5, 5);
        const size = Phaser.Math.Between(8, 20);
        const smoke = this.add.rectangle(smX, smY, size, size, 0xaaaaaa);
        smoke.setAlpha(0.6);
        this.tweens.add({
          targets: smoke,
          x: smX + Phaser.Math.Between(-40, 40),
          y: smY - Phaser.Math.Between(10, 40),
          alpha: 0,
          scale: 1.5,
          duration: Phaser.Math.Between(800, 1400),
          ease: 'Sine.easeOut',
          onComplete: () => smoke.destroy()
        });
      }

      this.tweens.add({
        targets: lightning,
        alpha: 0,
        duration: 350,
        onComplete: () => lightning.destroy()
      });
    });

    // 4. Ash Disintegration (900ms delay)
    this.time.delayedCall(900, () => {
      if (!player.active) return;

      this.tweens.add({
        targets: player,
        alpha: 0,
        duration: 3000,
        ease: 'Linear',
        onComplete: () => {
          player.setVisible(false);
        }
      });

      // Spawn ash particles stream over 3 seconds
      this.time.addEvent({
        delay: 50,
        repeat: 60,
        callback: () => {
          if (!player.active) return;

          const px = player.x + Phaser.Math.Between(-24, 24);
          const py = player.y + Phaser.Math.Between(-35, 35);

          const targetX = px + Phaser.Math.Between(20, 90);
          const targetY = py - Phaser.Math.Between(60, 150);

          const isEmber = Math.random() < 0.25;
          const color = isEmber ? 0xff4411 : 0x2e2e30;
          const size = Phaser.Math.Between(3, 8);

          const particle = this.add.rectangle(px, py, size, size, color);
          if (isEmber) {
            particle.setBlendMode(Phaser.BlendModes.ADD);
          }

          this.tweens.add({
            targets: particle,
            x: targetX,
            y: targetY,
            alpha: 0,
            scale: 0.1,
            angle: Phaser.Math.Between(-90, 90),
            duration: Phaser.Math.Between(1200, 2200),
            ease: 'Sine.easeOut',
            onComplete: () => particle.destroy()
          });
        }
      });
    });

    // 5. Final Fade out and Restart (4.5s total delay)
    this.time.delayedCall(4500, () => {
      this.cameras.main.fade(1000, 6, 4, 12);
      this.time.delayedCall(1000, () => {
        const saveData = loadGame();
        if (saveData && saveData.currentScene && saveData.currentScene !== this.scene.key) {
          this.scene.start(saveData.currentScene, {
            startPos: { x: saveData.playerX, y: saveData.playerY },
            cardsCollected: saveData.cardsCollected,
            mechaUnlocked: saveData.mechaUnlocked,
            dragonUnlocked: saveData.dragonUnlocked
          });
        } else {
          this.scene.restart({
            startPos: saveData ? { x: saveData.playerX, y: saveData.playerY } : undefined,
            cardsCollected: saveData?.cardsCollected || [],
            mechaUnlocked: saveData?.mechaUnlocked || false,
            dragonUnlocked: saveData?.dragonUnlocked || false
          });
        }
      });
    });
  }
}
