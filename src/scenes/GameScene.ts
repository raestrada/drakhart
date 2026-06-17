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
import { EchoFragment } from '../entities/EchoFragment';
import {
  spawnHitParticles,
  spawnTransformParticles,
  spawnDeathExplosion,
  spawnProjectileImpact,
} from '../effects/Particles';
import { BloomSystem } from '../effects/BloomSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { drawLightningBolt } from '../effects/LightningBolt';
import { applyBiomePostFX, setVignetteFromPlayer } from '../effects/PostFXPipelines';
import { WeatherSystem } from '../systems/WeatherSystem';
import { BaseLevelScene } from './BaseLevelScene';
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

export class GameScene extends BaseLevelScene {
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
  private bulletLights: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Light> = new Map();

  private shmupZoneActive = false;
  private crumblingPlatforms: CrumblingPlatform[] = [];
  private echoFragments: EchoFragment[] = [];
  private fogWall: Phaser.GameObjects.Graphics | null = null;
  private ashEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private bloom!: BloomSystem;
  private weatherSystem!: WeatherSystem;
  private terrainGen!: TerrainGenerator;

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
    super.create();
    this.bulletLights.clear();

    this.physics.world.setBounds(0, 0, 10000, LEVEL_HEIGHT);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x88809c); // Bright purple twilight
    }

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
    this.terrainGen = new TerrainGenerator(this);
    this.currentBiome = 'forest';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.createParallax();
    this.weatherSystem = new WeatherSystem(this, 'forest', LEVEL_WIDTH);
    applyBiomePostFX(this, 'forest');
    this.createTorches();
    this.createLevel();
    this.createCrumblingPlatforms();
    this.createForeground();
    this.createDestructibles();
    this.createDecorations();
    this.createFogWall();
    this.createAshParticles();
    this.createEchoFragments();
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
    this.setupLightingAndPipelines();

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

    // 3. Castle Silhouette — keyed out PNG, 2/3 scale, no tint
    this.bgCastle = this.add.image(0, 0, 'bg-castle')
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(-25)
      .setScale(0.75)
      .setAlpha(0.85);

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

    // 6.2 Organic mid-ground — breaks tile repetition between backgrounds and ground
    this.generateMidGroundForest();

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

    this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(299);
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

    // Organic ground segments (gaps left for thorn hazards)
    const groundY = 768;
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, 2000, 'forest', 1);
    // Gap: 2300-2800 with thorns below, floating platforms to cross
    this.terrainGen.generateGroundSegment(this.platforms, 2000, groundY, 300, 'forest', 2);
    this.terrainGen.generateGroundSegment(this.platforms, 2800, groundY, 300, 'forest', 3);
    // Gap: 3100-3700 with thorns below
    this.terrainGen.generateGroundSegment(this.platforms, 3700, groundY, 300, 'forest', 4);
    // Gap: 4000-4500 with thorns below
    this.terrainGen.generateGroundSegment(this.platforms, 4500, groundY, 2300, 'forest', 5);
    this.terrainGen.generateGroundSegment(this.platforms, 6800, groundY, 1200, 'forest', 6);
    // New Section 5 — The Descent (post-altar, 8000-10000)
    this.terrainGen.generateGroundSegment(this.platforms, 8000, groundY, 400, 'forest', 7);
    // Descending platforms (stairway down into darkness)
    this.terrainGen.generateGroundSegment(this.platforms, 8450, groundY + 48, 300, 'forest', 8);
    this.terrainGen.generateGroundSegment(this.platforms, 8800, groundY + 96, 350, 'forest', 9);
    this.terrainGen.generateGroundSegment(this.platforms, 9200, groundY + 64, 800, 'forest', 10);

    // Organic floating platforms
    const platDefs: { x: number; y: number; w: number }[] = [
      { x: 300, y: 640, w: 160 }, { x: 550, y: 540, w: 128 },
      { x: 750, y: 620, w: 192 }, { x: 1050, y: 520, w: 160 },
      { x: 1350, y: 640, w: 160 }, { x: 1650, y: 520, w: 192 },
      { x: 1950, y: 650, w: 96 },  { x: 2350, y: 650, w: 64 },
      { x: 2680, y: 620, w: 64 },  { x: 2850, y: 650, w: 96 },
      { x: 3440, y: 520, w: 64 },  { x: 3750, y: 650, w: 96 },
      { x: 4080, y: 640, w: 64 },  { x: 4360, y: 620, w: 64 },
      { x: 4600, y: 640, w: 160 }, { x: 4850, y: 520, w: 192 },
      { x: 5150, y: 400, w: 160 }, { x: 5400, y: 550, w: 224 },
      { x: 5750, y: 600, w: 160 }, { x: 6050, y: 480, w: 192 },
      { x: 6350, y: 580, w: 160 }, { x: 6900, y: 660, w: 128 },
      { x: 7100, y: 560, w: 128 }, { x: 7320, y: 460, w: 256 },
    ];
    platDefs.forEach(p => this.terrainGen.generatePlatform(this.platforms, p.x, p.y, p.w, 'forest'));

    // Organic thorn gaps — dangerous abyss between ground segments
    this.terrainGen.generateThornGap(this.hazards, 2300, 784, 500, 71);
    this.terrainGen.generateThornGap(this.hazards, 3100, 784, 600, 72);
    this.terrainGen.generateThornGap(this.hazards, 4000, 784, 500, 73);

    // Small thorn patches on ruin platforms
    this.terrainGen.generateThornPatch(this.hazards, 4900, 504, 64, 74);
    this.terrainGen.generateThornPatch(this.hazards, 5480, 534, 64, 75);
    this.terrainGen.generateThornPatch(this.hazards, 6100, 464, 64, 76);
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

    // Section 3 ground reinforcements (redensify the long runway)
    const eG1 = new BaseEnemy(this, 4700, 738, 'enemy-sentry', this.player, {
      health: 50, damage: 12, speed: 65, patrolMinX: 4550, patrolMaxX: 4850
    });
    const eG2 = new LeaperEnemy(this, 5100, 738, this.player, {
      health: 55, damage: 14, speed: 85, patrolMinX: 4950, patrolMaxX: 5250
    });
    const eG3 = new SpitterEnemy(this, 5600, 738, this.player, {
      health: 50, damage: 13, speed: 50, patrolMinX: 5450, patrolMaxX: 5750
    });

    // Mini-boss — Giant Leaper blocking the path in Section 3
    const eMiniBoss = new LeaperEnemy(this, 5950, 738, this.player, {
      health: 140, damage: 22, speed: 70, attackRange: 55, patrolMinX: 5800, patrolMaxX: 6100
    });
    eMiniBoss.setScale(1.3);
    (eMiniBoss.body as Phaser.Physics.Arcade.Body).setSize(48, 72);

    // Section 5 — The Descent (post-altar, 8000-10000)
    const e18 = new ShieldEnemy(this, 8100, 738, this.player, {
      health: 75, damage: 18, speed: 45, patrolMinX: 8050, patrolMaxX: 8350
    });
    const e19 = new SpitterEnemy(this, 8600, 776, this.player, {
      health: 65, damage: 16, speed: 55, patrolMinX: 8500, patrolMaxX: 8750
    });
    const e20 = new LeaperEnemy(this, 9000, 824, this.player, {
      health: 80, damage: 20, speed: 85, patrolMinX: 8900, patrolMaxX: 9100
    });
    const e21 = new BaseEnemy(this, 9350, 792, 'enemy-sentry', this.player, {
      health: 65, damage: 16, speed: 70, patrolMinX: 9250, patrolMaxX: 9450
    });

    // Final barricade before exit
    const b3 = new Barricade(this, 9850, 704);
    this.barricades.add(b3);

    this.enemies.addMultiple([e1, e2, e3, e4, e5, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15, e16, e17, giantSentry, eG1, eG2, eG3, eMiniBoss, e18, e19, e20, e21]);
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

    this.createMovingPlatforms();
  }

  private movingPlatforms: { sprite: Phaser.Physics.Arcade.Sprite; minX: number; maxX: number; speed: number }[] = [];

  private createMovingPlatforms(): void {
    const defs = [
      { x: 2500, y: 580, minX: 2450, maxX: 2700, speed: 30 },
      { x: 3250, y: 600, minX: 3180, maxX: 3400, speed: -40 },
      { x: 3570, y: 560, minX: 3500, maxX: 3620, speed: 25 },
      { x: 4200, y: 580, minX: 4150, maxX: 4280, speed: -35 },
    ];

    defs.forEach(def => {
      const plat = this.platforms.create(def.x, def.y, 'tile-ground') as Phaser.Physics.Arcade.Sprite;
      plat.setDisplaySize(48, 12);
      plat.refreshBody();
      this.movingPlatforms.push({ sprite: plat, minX: def.minX, maxX: def.maxX, speed: def.speed });
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

  private updateMovingPlatforms(delta: number): void {
    this.movingPlatforms.forEach(mp => {
      const dt = delta / 1000;
      mp.sprite.x += mp.speed * dt;
      if (mp.sprite.x > mp.maxX || mp.sprite.x < mp.minX) {
        mp.speed *= -1;
        mp.sprite.x = Phaser.Math.Clamp(mp.sprite.x, mp.minX, mp.maxX);
      }
      (mp.sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
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
      const shakeForce = isLarge ? 0.004 : 0.002;
      this.spawnBouncingDebris(x, y, 0x2e2d35, isLarge);
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

  private rustleFoliage(sprite: Phaser.Physics.Arcade.Sprite): void {
    if (sprite.getData('rustling')) return;
    sprite.setData('rustling', true);

    const originalAngle = sprite.angle;
    this.tweens.add({
      targets: sprite,
      angle: { from: originalAngle - 8, to: originalAngle + 8 },
      duration: 100,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.setAngle(originalAngle);
        this.time.delayedCall(600, () => {
          if (sprite.active) sprite.setData('rustling', false);
        });
      }
    });
  }

  private spawnBouncingDebris(x: number, y: number, color: number, isLarge: boolean): void {
    const count = isLarge ? 8 : 5;
    for (let i = 0; i < count; i++) {
      const size = Phaser.Math.Between(4, isLarge ? 10 : 6);
      const shard = this.add.rectangle(x + Phaser.Math.Between(-8, 8), y + Phaser.Math.Between(-8, 8), size, size, color);
      shard.setDepth(15);
      
      this.physics.add.existing(shard);
      const body = shard.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setBounce(0.55, 0.35);
        body.setCollideWorldBounds(true);
        body.setVelocity(
          Phaser.Math.Between(-120, 120),
          Phaser.Math.Between(-180, -80)
        );
        body.setDrag(10, 0);
        this.physics.add.collider(shard, this.platforms);
      }

      this.time.delayedCall(Phaser.Math.Between(800, 1200), () => {
        this.tweens.add({
          targets: shard,
          alpha: 0,
          scale: 0.1,
          duration: 300,
          onComplete: () => shard.destroy()
        });
      });
    }
  }

  private generateMidGroundForest(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['midground', '42']);
    const g = this.add.graphics();
    g.setDepth(-6);
    g.setScrollFactor(1, 1);

    for (let x = 0; x < LEVEL_WIDTH; x += rng.between(80, 160)) {
      const h = rng.between(60, 180);
      const w = rng.between(12, 30);
      const baseY = 768;

      // Dark silhouette
      g.fillStyle(0x060408, 0.6 + rng.realInRange(-0.1, 0.1));
      g.fillRect(x, baseY - h, w, h);

      // Slight highlight edge
      g.fillStyle(0x0a080c, 0.3);
      g.fillRect(x + 2, baseY - h, w / 3, h);

      // Canopy top
      if (rng.between(0, 3) > 0) {
        const cw = w + rng.between(6, 18);
        g.fillStyle(0x08060a, 0.5);
        g.fillTriangle(x - cw / 2, baseY - h + rng.between(4, 15), x + w + cw / 2, baseY - h + 5, x + w / 2, baseY - h - rng.between(0, 20));
      }

      // Skip some positions for natural gaps
      if (rng.between(0, 5) === 0) x += rng.between(60, 120);
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

  private createTorches(): void {
    const torchPositions = [
      { x: 600, y: 632 }, { x: 1200, y: 640 }, { x: 2000, y: 636 },
      { x: 3200, y: 640 }, { x: 4800, y: 620 }, { x: 5500, y: 644 },
    ];

    torchPositions.forEach((pos) => {
      const torch = this.add.rectangle(pos.x, pos.y, 5, 14, 0x332211).setDepth(5);
      const flame = this.add.pointlight(pos.x, pos.y - 10, 0xff6622, 35, 0.25).setDepth(-1);

      this.tweens.add({
        targets: flame,
        intensity: { from: 0.18, to: 0.32 },
        radius: { from: 28, to: 42 },
        duration: 200 + Math.random() * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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

  private createEchoFragments(): void {
    const e1 = new EchoFragment(this, 3000, 630, 0);
    const e2 = new EchoFragment(this, 6500, 600, 1);
    this.echoFragments.push(e1, e2);
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

    const chariotCard = new TarotCard(this, 9100, 804, 'chariot');
    chariotCard.setDepth(1);

    this.physics.add.overlap(this.player, magicianCard, () => {
      magicianCard.collect(this.player);
      this.tarotSystem.collect('magician', this.player);
      this.gameAudio?.playCardCollect();
      this.requestSave();
    });

    this.physics.add.overlap(this.player, chariotCard, () => {
      chariotCard.collect(this.player);
      this.tarotSystem.collect('chariot', this.player);
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

    this.echoFragments.forEach((echo) => {
      this.physics.add.overlap(this.player, echo, () => {
        if (echo.active) echo.collect();
      });
    });

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
        spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
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

    this.physics.add.overlap(this.player, this.destructibles, (_player, _destructible) => {
      const sprite = _destructible as Phaser.Physics.Arcade.Sprite;
      if (sprite.texture.key === 'bush' || sprite.texture.key === 'bush-large') {
        this.rustleFoliage(sprite);
      }
    });
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setFollowOffset(0, -80);
    this.cameras.main.setDeadzone(80, 60);
    this.cameras.main.setZoom(CAMERA_ZOOM_HUMAN);
    this.cameras.main.setBounds(0, 0, 10000, LEVEL_HEIGHT);
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
    if (this.isCutsceneActive) return;
    this.isCutsceneActive = true;
    this.physics.world.pause();
    this.player.setInputEnabled(false);

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

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const scale = this.cameras.main.width / 800;

    const bgOverlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(600).setAlpha(0);

    const panelWidth = 400 * scale;
    const panelHeight = 160 * scale;
    
    const panel = this.add.graphics().setScrollFactor(0).setDepth(601).setAlpha(0);
    panel.fillStyle(0x0a0808, 0.95);
    panel.lineStyle(2, 0xffaa00, 0.8);
    panel.fillRect(cx - panelWidth/2, cy - panelHeight/2, panelWidth, panelHeight);
    panel.strokeRect(cx - panelWidth/2, cy - panelHeight/2, panelWidth, panelHeight);

    const promptParts = t('story.coreFoundPrompt').split('\n\n');
    const titleString = promptParts.length > 0 ? promptParts[0] : 'CORE ACQUIRED';
    const descString = promptParts.length > 1 ? promptParts[1] : '';

    const titleText = this.add.text(cx, cy - 35 * scale, titleString, {
      fontSize: `${Math.round(18 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#ffaa00',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(602).setAlpha(0);

    const descText = this.add.text(cx, cy + 15 * scale, descString, {
      fontSize: `${Math.round(11 * scale)}px`,
      fontFamily: 'monospace',
      color: '#dddddd',
      align: 'center',
      lineSpacing: 8 * scale,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(602).setAlpha(0);

    const continueText = this.add.text(cx, cy + panelHeight/2 - 20 * scale, t('story.introSkip') || 'ENTER / CLICK to continue', {
      fontSize: `${Math.round(10 * scale)}px`,
      fontFamily: 'monospace',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(602).setAlpha(0);

    this.tweens.add({ targets: continueText, alpha: 0.3, yoyo: true, repeat: -1, duration: 800, delay: 500 });

    this.tweens.add({
      targets: [bgOverlay, panel, titleText, descText, continueText],
      alpha: 1,
      duration: 300,
    });

    const closePrompt = () => {
      this.input.keyboard?.off('keydown-ENTER', closePrompt);
      this.input.keyboard?.off('keydown-C', closePrompt);
      this.input.keyboard?.off('keydown-SPACE', closePrompt);
      this.input.keyboard?.off('keydown-ESC', closePrompt);
      this.input.off('pointerdown', closePrompt);

      this.tweens.add({
        targets: [bgOverlay, panel, titleText, descText, continueText],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          bgOverlay.destroy();
          panel.destroy();
          titleText.destroy();
          descText.destroy();
          continueText.destroy();

          this.isCutsceneActive = false;
          this.physics.world.resume();
          this.player.setInputEnabled(true);
          disabledEnemies.forEach(e => { if (e.active) e.isActive = true; });
        }
      });
    };

    this.input.keyboard?.once('keydown-ENTER', closePrompt);
    this.input.keyboard?.once('keydown-C', closePrompt);
    this.input.keyboard?.once('keydown-SPACE', closePrompt);
    this.input.keyboard?.once('keydown-ESC', closePrompt);
    this.input.once('pointerdown', closePrompt);
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
      this.gameAudio?.setCombatActive?.(this.enemies.getChildren().some((e) => {
        const enemy = e as Phaser.Physics.Arcade.Sprite;
        return enemy.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 500;
      }));
      this.gameAudio?.setDragonActive?.(this.player.formMachine.state === FormState.DRAGON);
    }
    this.updateParallax();
    this.weatherSystem?.update(this.cameras.main.scrollX, this.time.now);
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.checkBushDestruction();
    this.updateBulletCleanup();
    this.checkCrumblingPlatforms();
    this.updateMovingPlatforms(delta);
    this.updateEmbers(delta);
    this.updateBloom();
    this.updateVignettePulse();
    this.updateShmupZone(delta, time);
    this.updateBulletLights();

    if (this.player.active) {
      if (this.player.y > LEVEL_HEIGHT + 60) {
        this.player.takeDamage(100, 0);
      }
      if (this.player.x >= 9950) {
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
      this.bgCastle.setScale(0.75 / cam.zoom);
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

  private updateVignettePulse(): void {
    if (!(this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
    const pipeline = this.cameras.main.getPostPipeline('CustomPostFX') as any;
    if (!pipeline) return;
    const hpRatio = this.player.health / this.player.maxHealth;
    const heatLevel = this.player.formMachine.heat.level;
    setVignetteFromPlayer(pipeline, hpRatio, heatLevel);
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

  private setupLightingAndPipelines(): void {
    if (this.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.cameras.main.setPostPipeline('CustomPostFX');
    }

    if (!this.lights || !this.lights.active) return;

    this.platforms.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.hazards.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.destructibles.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.solidDestructibles.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.barricades.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.enemies.getChildren().forEach((child: any) => child.setPipeline('Light2D'));

    if (this.player && this.player.active) {
      this.player.setPipeline('Light2D');
    }

    // 1. Ambient large moonlight spots
    this.lights.addLight(1500, 300, 800, 0x882244, 0.65);
    this.lights.addLight(4500, 300, 800, 0x882244, 0.65);
    this.lights.addLight(7000, 300, 800, 0x882244, 0.65);

    // 2. Crystal lights that pulse
    this.children.list.forEach((child: any) => {
      if (child.texture && child.texture.key === 'prop-crystal') {
        child.setPipeline('Light2D');
        const cLight = this.lights.addLight(child.x, child.y - 12, 110, 0x00ffcc, 1.25);
        this.tweens.add({
          targets: cLight,
          intensity: { from: 0.85, to: 1.6 },
          radius: { from: 100, to: 120 },
          duration: Phaser.Math.Between(1600, 2600),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      if (child.texture && child.texture.key === 'prop-chain') {
        child.setPipeline('Light2D');
      }
    });

    // 3. Dragon Core light
    if (this.dragonCore && this.dragonCore.active) {
      this.dragonCore.setPipeline('Light2D');
      const coreLight = this.lights.addLight(this.dragonCore.x, this.dragonCore.y, 160, 0xffaa00, 2.0);
      this.tweens.add({
        targets: coreLight,
        intensity: { from: 1.5, to: 2.5 },
        radius: { from: 140, to: 180 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 4. Tarot cards lights
    this.children.list.forEach((child: any) => {
      if (child.texture && child.texture.key === 'prop-card') {
        child.setPipeline('Light2D');
        this.lights.addLight(child.x, child.y, 80, 0xff44aa, 1.4);
      }
    });
  }

  private updateBulletLights(): void {
    this.player.combatSystem.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        bullet.setPipeline('Light2D');
        if (this.lights && this.lights.active) {
          let light = this.bulletLights.get(bullet);
          if (!light) {
            light = this.lights.addLight(bullet.x, bullet.y, 100, 0xff5500, 1.4);
            this.bulletLights.set(bullet, light);
          } else {
            light.x = bullet.x;
            light.y = bullet.y;
            light.setIntensity(1.4);
          }
        }
      } else {
        const light = this.bulletLights.get(bullet);
        if (light) {
          if (this.lights) this.lights.removeLight(light);
          this.bulletLights.delete(bullet);
        }
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

      drawLightningBolt(
        this,
        player.x + Phaser.Math.Between(-60, 60),
        this.cameras.main.scrollY,
        player.x,
        player.y - 10,
        { color1: 0xffffff, color2: 0x90d0ff },
        true,
        350
      );
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
