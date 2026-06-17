import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { SkyCore } from '../entities/SkyCore';
import { EnergyPickup } from '../entities/EnergyPickup';
import { TarotCard } from '../entities/TarotCard';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { MechaEnemy } from '../entities/enemies/MechaEnemy';
import { EliteMecha } from '../entities/enemies/EliteMecha';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { Barricade } from '../entities/Barricade';
import { SteamVent } from '../entities/SteamVent';
import { CoolingValve } from '../entities/CoolingValve';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { loadGame, saveGame } from '../systems/SaveSystem';
import { spawnHitParticles, spawnDeathExplosion, spawnLavaSplash, spawnProjectileImpact } from '../effects/Particles';
import { drawLightningBolt } from '../effects/LightningBolt';
import { BloomSystem } from '../effects/BloomSystem';
import { applyBiomePostFX, setVignetteFromPlayer } from '../effects/PostFXPipelines';
import { WeatherSystem } from '../systems/WeatherSystem';
import { TerrainGenerator } from '../generators/TerrainGenerator';
import { BaseLevelScene } from './BaseLevelScene';
import { SaveAltar } from '../entities/SaveAltar';
import { EchoFragment } from '../entities/EchoFragment';
import {
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  CAMERA_LERP,
  CAMERA_ZOOM_MECHA,
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

export class GameScene2 extends BaseLevelScene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bgCauldrons: Phaser.GameObjects.Image[] = [];
  private moltenDroplets!: Phaser.Physics.Arcade.Group;
  private dripTimer = 0;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private steamVents!: Phaser.Physics.Arcade.StaticGroup;
  private coolingValves!: Phaser.Physics.Arcade.StaticGroup;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private skyCore!: SkyCore;
  private tarotSystem!: TarotSystem;

  private bgRefinerySun!: Phaser.GameObjects.TileSprite;
  private bgFurnace!: Phaser.GameObjects.TileSprite;
  private bgFurnacePipes!: Phaser.GameObjects.TileSprite;
  private refinerySunImage!: Phaser.GameObjects.Image;
  private furnaceImage!: Phaser.GameObjects.Image;
  private pipesImage!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private heatWarningText!: Phaser.GameObjects.Text;
  private lastHeatDamageSoundTime = 0;
  private emberTimer = 0;
  private bulletLights: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Light> = new Map();
  private bloom!: BloomSystem;
  private weatherSystem!: WeatherSystem;
  private terrainGen!: TerrainGenerator;
  private echoFragments: EchoFragment[] = [];

  private pendingMechaUnlock = true;
  private pendingDragonUnlock = false;
  private pendingSpawnX = 100;
  private pendingSpawnY = 550;
  private bossIntroTriggered = false;
  private bossEnergyAssistTimer = 0;
  private pendingCardsToCollect: string[] = [];
  private demoEnded = false;
  public isCutsceneActive = false;

  constructor() {
    super({ key: 'GameScene2' });
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

    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    if (this.lights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x947c6d); // Warm bright industrial orange-brown
    }

    // Initialize/resume Audio system
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(2);
    this.gameAudio.playAmbientZone(2);

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
    this.currentBiome = 'refinery';

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    this.createParallax();
    this.weatherSystem = new WeatherSystem(this, 'refinery', LEVEL_WIDTH);
    applyBiomePostFX(this, 'refinery');
    this.createLavaBubbles();
    this.createGears();
    this.moltenDroplets = this.physics.add.group({ allowGravity: false });
    this.createBackgroundEffects();
    this.createDecorations();
    this.createLevel();
    this.createInteractiveObjects();
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
    if (this.pendingMechaUnlock) {
      this.player.formMachine.unlockTransform();
    }
    if (this.pendingDragonUnlock) {
      this.player.formMachine.unlockDragon();
    }

    this.createEnemies();
    this.setupCamera();
    this.setupCollisions();
    this.createVignette();
    this.setupLightingAndPipelines();

    const cx = this.scale.width / 2;
    this.heatWarningText = this.add.text(cx, 120, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ff2200',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(500);

    this.scene.launch('UIScene', {
      player: this.player,
      tarotSystem: this.tarotSystem,
    });
  }

  private createParallax(): void {
    this.cameras.main.setBackgroundColor('#0b0712');

    // 1. Refinery Sky background (procedural gradient + soot)
    this.bgRefinerySun = this.add.tileSprite(0, 0, LEVEL_WIDTH, 1200, 'bg-refinery-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.01, 0)
      .setDepth(-30);
    this.bgRefinerySun.setTint(0xcc6655, 0xcc6655, 0x442222, 0x442222);

    // 1.1 Refinery Sun single support image (non-tiled)
    if (this.textures.exists('image-refinery-sun')) {
      this.refinerySunImage = this.add.image(0, 0, 'image-refinery-sun')
        .setOrigin(0.5, 0.5)
        .setDepth(-29)
        .setAlpha(0.7);
    }

    // 2. Smelting Furnace background (procedural silhouette towers, slow scroll)
    this.bgFurnace = this.add.tileSprite(0, 180, this.scale.width * 1.5, 800, 'bg-refinery-furnaces')
      .setOrigin(0, 0)
      .setScrollFactor(0.06, 0)
      .setDepth(-20);
    this.bgFurnace.setTint(0xff8866, 0xff88aa, 0x66222c, 0x883344);

    // 2.1 Smelting Furnace Reactor single support image (non-tiled)
    if (this.textures.exists('image-furnace')) {
      this.furnaceImage = this.add.image(0, 0, 'image-furnace')
        .setOrigin(0.5, 0.5)
        .setDepth(-19)
        .setAlpha(0.6);
    }

    // 3. Furnace Pipes background (procedural girders & pipes, medium scroll)
    this.bgFurnacePipes = this.add.tileSprite(0, 240, this.scale.width * 1.5, 800, 'bg-refinery-structures')
      .setOrigin(0, 0)
      .setScrollFactor(0.18, 0)
      .setDepth(-10);
    this.bgFurnacePipes.setTint(0xbb5544, 0xdd6644, 0x221111, 0x331111);

    // 3.1 Refinery Pipes detail single support image (non-tiled)
    if (this.textures.exists('image-furnace-pipes')) {
      this.pipesImage = this.add.image(0, 0, 'image-furnace-pipes')
        .setOrigin(0.5, 0.5)
        .setDepth(-9)
        .setAlpha(0.5);
    }
  }

  private updateParallax(): void {
    const cam = this.cameras.main;
    const camX = cam.scrollX;
    this.bgFurnace.tilePositionX = camX * 0.06;
    this.bgFurnacePipes.tilePositionX = camX * 0.18;

    const w = this.scale.width;
    const h = this.scale.height;

    const desiredWidth = w * cam.zoom * 2.0;
    const desiredHeight = h * cam.zoom;

    if (this.bgRefinerySun) {
      this.bgRefinerySun.width = desiredWidth;
      this.bgRefinerySun.height = desiredHeight;
      this.bgRefinerySun.setScale(1.0 / cam.zoom);
      this.bgRefinerySun.y = (0 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgFurnace) {
      this.bgFurnace.width = desiredWidth;
      this.bgFurnace.height = desiredHeight;
      this.bgFurnace.setScale(1.0 / cam.zoom);
      this.bgFurnace.y = (180 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgFurnacePipes) {
      this.bgFurnacePipes.width = desiredWidth;
      this.bgFurnacePipes.height = desiredHeight;
      this.bgFurnacePipes.setScale(1.0 / cam.zoom);
      this.bgFurnacePipes.y = (240 - cam.centerY) / cam.zoom + cam.centerY;
    }

    // Scroll Refinery Sun support image slowly
    if (this.refinerySunImage) {
      const targetScreenX = w * 0.70 - camX * 0.015;
      const targetScreenY = h * 0.22;
      this.refinerySunImage.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.refinerySunImage.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.refinerySunImage.setScale(1.25 / cam.zoom);
    }

    // Scroll Smelting Furnace support image
    if (this.furnaceImage) {
      const targetScreenX = w * 0.40 - camX * 0.06;
      const targetScreenY = h * 0.45;
      this.furnaceImage.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.furnaceImage.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.furnaceImage.setScale(1.1 / cam.zoom);
    }

    // Scroll Refinery Pipes support image
    if (this.pipesImage) {
      const targetScreenX = w * 0.85 - camX * 0.18;
      const targetScreenY = h * 0.55;
      this.pipesImage.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.pipesImage.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.pipesImage.setScale(1.05 / cam.zoom);
    }
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    const graveyardBg = this.add.tileSprite(0, 340, LEVEL_WIDTH, 400, 'bg-mecha-graveyard')
      .setOrigin(0, 0).setScrollFactor(0.12, 0).setDepth(-18).setAlpha(0.75)
      .setTint(0xaa5533, 0x882211, 0x441100, 0x330800);

    // Organic ground — refinery biome
    const groundY = 736;
    this.terrainGen.generateGroundSegment(this.platforms, 0, groundY, 1360, 'refinery', 10);
    this.terrainGen.generateGroundSegment(this.platforms, 1500, groundY, 1420, 'refinery', 11);
    this.terrainGen.generateGroundSegment(this.platforms, 3060, groundY, 1460, 'refinery', 12);
    this.terrainGen.generateGroundSegment(this.platforms, 4660, groundY, 1460, 'refinery', 13);
    this.terrainGen.generateGroundSegment(this.platforms, 6280, groundY, 1720, 'refinery', 14);

    // Organic platforms
    [400,490,128, 900,480,96, 1700,490,128, 2400,480,96, 3300,495,128, 4100,480,96, 4900,490,128, 5700,485,96, 7180,560,96, 7350,500,256].forEach((_,i,arr) => {
      if (i%3===0) this.terrainGen.generatePlatform(this.platforms, arr[i], arr[i+1], arr[i+2], 'refinery');
    });

    // Lava pits
    const lavaPits = [{s:1360,e:1500},{s:2920,e:3060},{s:4500,e:4660},{s:6100,e:6280}];
    lavaPits.forEach(pit => {
      for (let tx = pit.s; tx < pit.e; tx += 32) {
        const lava = this.hazards.create(tx + 16, 784, 'tile-refinery-lava');
        (lava.body as Phaser.Physics.Arcade.StaticBody).setSize(32, 24);
      }
    });

    // Thruster barriers
    [680,1900,3450,5100].forEach((bx) => {
      for (let by = 544; by < 736; by += 96) {
        const barrier = this.hazards.create(bx + 12, by + 48, 'thruster-barrier');
        (barrier.body as Phaser.Physics.Arcade.StaticBody).setSize(24, 96);
        barrier.setDepth(3);
        this.tweens.add({ targets: barrier, alpha: { from: 0.7, to: 1.0 }, duration: Phaser.Math.Between(500, 900), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });
  }

  private createInteractiveObjects(): void {
    this.barricades = this.physics.add.staticGroup();
    this.steamVents = this.physics.add.staticGroup();
    this.coolingValves = this.physics.add.staticGroup();
    this.energyPickups = this.physics.add.staticGroup();

    // Barricades — ground-level chokepoints requiring Mecha claymore to break.
    // They serve as tactical beats in each corridor segment.
    const b1 = new Barricade(this, 550, 704);   // Mid-entry — forces first engagement
    const b2 = new Barricade(this, 2500, 704);  // Segment 2 chokepoint
    const b3 = new Barricade(this, 3800, 704);  // Segment 3 entrance
    const b4 = new Barricade(this, 5600, 704);  // Segment 4 chokepoint
    const b5 = new Barricade(this, 6200, 704);  // Final gauntlet gate (gate to Elite Mecha arena)

    this.barricades.addMultiple([b1, b2, b3, b4, b5]);

    // Steam vents — placed at the EDGE of each lava pit (both sides) so the Mecha
    // can boost launch over the pit with style. Warriors get burned instead.
    const v1 = new SteamVent(this, 1340, 720);  // Left edge of Pit 1
    const v2 = new SteamVent(this, 1510, 720);  // Right edge of Pit 1
    const v3 = new SteamVent(this, 2910, 720);  // Left edge of Pit 2
    const v4 = new SteamVent(this, 3070, 720);  // Right edge of Pit 2
    const v5 = new SteamVent(this, 4490, 720);  // Left edge of Pit 3
    const v6 = new SteamVent(this, 4670, 720);  // Right edge of Pit 3
    const v7 = new SteamVent(this, 6090, 720);  // Left edge of Pit 4
    const v8 = new SteamVent(this, 6290, 720);  // Right edge of Pit 4
    this.steamVents.addMultiple([v1, v2, v3, v4, v5, v6, v7, v8]);

    // Cooling valves — mid-corridor for heat management during long fights
    const c1 = new CoolingValve(this, 700,  704);
    const c2 = new CoolingValve(this, 2100, 704);
    const c3 = new CoolingValve(this, 3700, 704);
    const c4 = new CoolingValve(this, 5300, 704);
    const c5 = new CoolingValve(this, 6850, 704);
    this.coolingValves.addMultiple([c1, c2, c3, c4, c5]);

    // Energy pickups — scattered along corridors, near barricades and lava pit edges.
    // They bait the player into moving into dangerous territory.
    const pickupSpots = [
      { x: 200,  y: 700 },  // Entry — near start, easy grab
      { x: 800,  y: 700 },  // Near first barricade
      { x: 1430, y: 700 },  // Just before Pit 1
      { x: 1530, y: 700 },  // Just after Pit 1 — dangerous pickup
      { x: 1900, y: 700 },  // Segment 2 mid-fight
      { x: 2400, y: 700 },  // Near second barricade
      { x: 2870, y: 700 },  // Just before Pit 2
      { x: 3200, y: 700 },  // Segment 3 entry
      { x: 3900, y: 700 },  // Segment 3 mid-fight
      { x: 4400, y: 700 },  // Near Pit 3 edge
      { x: 4720, y: 700 },  // Just after Pit 3 — dangerous
      { x: 5050, y: 700 },  // Segment 4 start
      { x: 5550, y: 700 },  // Near barricade 4
      { x: 5980, y: 700 },  // Before Pit 4
      { x: 6400, y: 700 },  // Final gauntlet
      { x: 6950, y: 700 },  // Near final barricade
    ];

    pickupSpots.forEach((spot) => {
      const pickup = new EnergyPickup(this, spot.x, spot.y);
      this.energyPickups.add(pickup);
    });

    // The Flight Core (SkyCore) Altar
    this.skyCore = new SkyCore(this, 7478, 450);
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow')
      .setDepth(-5)
      .setAlpha(0.5);
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();

    // === SEGMENT 1: Entry Ruins (0–1350) — 3 Mechas, wide patrol, instant aggression ===
    const m1a = new MechaEnemy(this, 380, 700, this.player, { health: 350, speed: 65, damage: 35, patrolMinX: 50,  patrolMaxX: 680  });
    const m1b = new MechaEnemy(this, 950, 700, this.player, { health: 350, speed: 65, damage: 35, patrolMinX: 680, patrolMaxX: 1350 });
    const m1c = new MechaEnemy(this, 1220, 700, this.player, { health: 350, speed: 65, damage: 35, patrolMinX: 800, patrolMaxX: 1340 });

    // === SEGMENT 2: After Lava Pit 1 (1500–2920) — Pincer: 2 rush from sides + shield blocker ===
    const m2a = new MechaEnemy(this, 1650, 700, this.player, { health: 380, speed: 70, damage: 40, patrolMinX: 1500, patrolMaxX: 2100 });
    const m2b = new MechaEnemy(this, 2200, 700, this.player, { health: 380, speed: 70, damage: 40, patrolMinX: 1700, patrolMaxX: 2500 });
    const m2c = new MechaEnemy(this, 2700, 700, this.player, { health: 400, speed: 55, damage: 45, patrolMinX: 2400, patrolMaxX: 2900 });
    const sh2a = new ShieldEnemy(this, 2050, 700, this.player);

    // === SEGMENT 3: After Lava Pit 2 (3060–4500) — 4 Mechas, brutal gauntlet ===
    const m3a = new MechaEnemy(this, 3150, 700, this.player, { health: 400, speed: 70, damage: 40, patrolMinX: 3060, patrolMaxX: 3700 });
    const m3b = new MechaEnemy(this, 3500, 700, this.player, { health: 400, speed: 70, damage: 40, patrolMinX: 3200, patrolMaxX: 3900 });
    const m3c = new MechaEnemy(this, 4000, 700, this.player, { health: 420, speed: 75, damage: 45, patrolMinX: 3700, patrolMaxX: 4450 });
    const m3d = new MechaEnemy(this, 4350, 700, this.player, { health: 400, speed: 75, damage: 40, patrolMinX: 4000, patrolMaxX: 4480 });

    // === SEGMENT 4: After Lava Pit 3 (4660–6100) — Apex difficulty + shield blocker ===
    const m4a = new MechaEnemy(this, 4780, 700, this.player, { health: 450, speed: 80, damage: 50, patrolMinX: 4660, patrolMaxX: 5350 });
    const m4b = new MechaEnemy(this, 5400, 700, this.player, { health: 450, speed: 80, damage: 50, patrolMinX: 5000, patrolMaxX: 5900 });
    const m4c = new MechaEnemy(this, 5900, 700, this.player, { health: 480, speed: 60, damage: 55, patrolMinX: 5500, patrolMaxX: 6080 });
    const sh4a = new ShieldEnemy(this, 5200, 700, this.player);

    // === SEGMENT 5: Final Gauntlet (6280–7400) — Last stand before Dragon Shrine ===
    const m5a = new MechaEnemy(this, 6380, 700, this.player, { health: 480, speed: 85, damage: 55, patrolMinX: 6280, patrolMaxX: 6420 });

    // Mini-boss Arena (6500 - 7300): Completely clean space except for the Elite Mecha Guard!
    const eliteBoss = new EliteMecha(this, 6880, 500, this.player);

    this.enemies.addMultiple([
      m1a, m1b, m1c,
      m2a, m2b, m2c, sh2a,
      m3a, m3b, m3c, m3d,
      m4a, m4b, m4c, sh4a,
      m5a, eliteBoss,
    ]);

    // Overwrite die method of EliteMecha to trigger boss defeat cinematic
    const originalDie = (eliteBoss as any).die.bind(eliteBoss);
    (eliteBoss as any).die = () => {
      this.triggerBossDeathCinematic(eliteBoss, originalDie);
    };

    // === FLYING SENTRIES on elevated command perches (aerial fire support) ===
    const f1  = new FlyingEnemy(this,  450, 440, this.player);
    const f2  = new FlyingEnemy(this,  950, 430, this.player);
    const f3  = new FlyingEnemy(this, 1750, 445, this.player);
    const f4  = new FlyingEnemy(this, 2450, 435, this.player);
    const f5  = new FlyingEnemy(this, 3350, 445, this.player);
    const f6  = new FlyingEnemy(this, 4150, 430, this.player);
    const f7  = new FlyingEnemy(this, 4950, 445, this.player);
    const f8  = new FlyingEnemy(this, 5750, 435, this.player);
    // Sentries removed near final boss area to keep the arena clean!
    this.enemies.addMultiple([f1, f2, f3, f4, f5, f6, f7, f8]);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setFollowOffset(0, -80);
    this.cameras.main.setDeadzone(80, 60);
    this.cameras.main.setZoom(CAMERA_ZOOM_HUMAN);
  }

  private createEchoFragments(): void {
    const e1 = new EchoFragment(this, 3800, 630, 2);
    this.echoFragments.push(e1);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.barricades);
    this.physics.add.collider(this.enemies, this.barricades);

    this.physics.add.collider(this.player, this.enemies, (_player, _enemy) => {
      const player = _player as Player;
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0) return;

      const knockDir = player.x < enemy.x ? -1 : 1;
      player.takeDamage(enemy.attackDamage, knockDir);
    });

    this.echoFragments.forEach((echo) => {
      this.physics.add.overlap(this.player, echo, () => {
        if (echo.active) echo.collect();
      });
    });

    // Overlap checks for hazards (Lava: instant kill for human warrior, damage for mecha)
    this.physics.add.overlap(this.player, this.hazards, (_player, _hazard) => {
      const player = _player as Player;
      if (player.formMachine.state === FormState.HUMAN || player.formMachine.state === FormState.EXHAUSTED) {
        player.takeDamage(100, 0); // instant death
      } else {
        // Mecha form gets scorched slowly, knocked back upwards
        const body = player.body as Phaser.Physics.Arcade.Body;
        body.setVelocityY(-400);
        player.takeDamage(15, player.x < (_hazard as Phaser.GameObjects.Sprite).x ? -1 : 1);
        player.formMachine.heat.addHeat(25);
      }
    });

    // Overlap with Energy Crystals in Level 2
    this.physics.add.overlap(this.player, this.energyPickups, (_player, _pickup) => {
      const pickup = _pickup as EnergyPickup;
      pickup.collect(this.player);
    });

    // Overlap with Flight Core (SkyCore) triggers the final cutscene
    this.physics.add.overlap(this.player, this.skyCore, (_player, core) => {
      (core as SkyCore).collect(_player as Player);
      this.gameAudio?.playCoreCollect();
      this.triggerDragonGemCutscene();
    });

    // Overlap checks for player's fire breath bullets vs enemies
    this.physics.add.overlap(
      this.player.combatSystem.bullets,
      this.enemies,
      (_bullet, _enemy) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        b.disableBody(true, true);
        const enemy = _enemy as BaseEnemy;
        enemy.takeDamage(this.player.combatSystem.getFireDamage());
        spawnHitParticles(this, enemy.x, enemy.y);
      }
    );

    // Collider for player's bullets vs platforms
    this.physics.add.collider(
      this.player.combatSystem.bullets,
      this.platforms,
      (_bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        spawnProjectileImpact(this, b.x, b.y, [0xff6600, 0xff8800], 4);
        b.disableBody(true, true);
      }
    );
  }

  private createVignette(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRect(0, 0, LEVEL_WIDTH, 80); // top screen vignette
    shadow.fillRect(0, LEVEL_HEIGHT - 80, LEVEL_WIDTH, 80); // bottom screen vignette
    shadow.setScrollFactor(0);
    shadow.setDepth(400);

    const { width, height } = this.scale;
    this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(299);
  }

  update(time: number, delta: number): void {
    if (this.player && this.player.active && this.player.x >= 6520 && !this.bossIntroTriggered) {
      this.triggerBossIntro();
    }

    // Auto-spawn energy near boss when player is low
    this.updateBossEnergyAssist(delta);

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
    this.updateLavaAnimation(this.time.now);
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);
    this.updateBloom();
    this.updateVignettePulse();
    this.updateMoltenDrips(delta);
    this.updateBulletLights();

    // Apply extreme heat environmental damage to Warrior form
    if (this.player.active && this.player.alive) {
      const state = this.player.formMachine.state;
      const isGodMode = (window as any).godModeActive;
      if ((state === FormState.HUMAN || state === FormState.EXHAUSTED) && !isGodMode) {
        this.heatWarningText.setText(t('story.extremeHeat') || 'EXTREME HEAT: WARRIOR BURNS - FIND ENERGY');
        this.heatWarningText.setAlpha(0.6 + Math.sin(time * 0.01) * 0.4);

        // Health drain: 8 HP per second
        this.player.health -= 8 * (delta / 1000);

        if (time - this.lastHeatDamageSoundTime > 700) {
          this.lastHeatDamageSoundTime = time;
          this.gameAudio?.playDamage?.();
          this.player.setTint(0xff5500);
          this.time.delayedCall(150, () => {
            if (this.player.active) this.player.clearTint();
          });
        }

        if (Math.random() > 0.4) {
          const ember = this.add.rectangle(
            this.player.x + Phaser.Math.Between(-16, 16),
            this.player.y + Phaser.Math.Between(-24, 24),
            Phaser.Math.Between(2, 4),
            Phaser.Math.Between(2, 4),
            0xffaa00
          );
          ember.setDepth(this.player.depth + 1);
          this.tweens.add({
            targets: ember,
            y: ember.y - 45,
            alpha: 0,
            duration: 450,
            onComplete: () => ember.destroy()
          });
        }

        if (this.player.health <= 0) {
          (this.player as any).die();
        }
      } else {
        this.heatWarningText.setText('');
      }
    }

    // Apply Steam Vents overlap boost checks
    this.steamVents.getChildren().forEach((vent) => {
      const v = vent as SteamVent;
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), v.getBounds())) {
        v.onPlayerOverlap(this.player, delta);
      }
      v.update(time, delta);
    });

    if (this.player.active) {
      if (this.player.y > LEVEL_HEIGHT + 60) {
        this.player.takeDamage(100, 0);
      }
      if (this.player.x <= 80) {
        this.transitionToLevel1();
      }
      if (this.player.x >= 7950) {
        this.transitionToLevel3();
      }
    }
  }

  private updateShadows(): void {
    if (this.player && this.player.active && this.playerShadow) {
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 24;
      this.playerShadow.setScale(this.player.scaleX);
    }
  }

  private updateSwordVsEnemies(): void {
    const slashBounds = this.player.combatSystem.getSwordBounds();
    if (!slashBounds) return;

    // Hit normal/Rogue enemies
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        e.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, e.x, e.y);
      }
    });

    // Hit barricades
    this.barricades.getChildren().forEach((barricade) => {
      const b = barricade as Barricade;
      if (!b.active || !b.alive) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, b.getBounds())) {
        b.takeDamage(this.player.combatSystem.getSwordDamage());
      }
    });

    // Hit cooling valves
    this.coolingValves.getChildren().forEach((valve) => {
      const v = valve as CoolingValve;
      if (!v.active) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, v.getBounds())) {
        v.hit(this.player);
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
    this.barricades.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.enemies.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.steamVents.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.coolingValves.getChildren().forEach((child: any) => child.setPipeline('Light2D'));
    this.energyPickups.getChildren().forEach((child: any) => child.setPipeline('Light2D'));

    if (this.player && this.player.active) {
      this.player.setPipeline('Light2D');
    }

    // 1. Ambient furnace heat lights
    this.lights.addLight(1000, 300, 900, 0xff5500, 0.7);
    this.lights.addLight(3000, 300, 900, 0xff5500, 0.7);
    this.lights.addLight(5000, 300, 900, 0xff5500, 0.7);
    this.lights.addLight(7000, 300, 900, 0xff5500, 0.7);

    // 2. Cauldron background lights
    this.bgCauldrons.forEach(c => {
      c.setPipeline('Light2D');
      this.lights.addLight(c.x, c.y - 30, 220, 0xff4400, 1.4);
    });

    // 3. Lava Pits ambient heat glow (add a light in the middle of each pit)
    const lavaPits = [{s:1360,e:1500},{s:2920,e:3060},{s:4500,e:4660},{s:6100,e:6280}];
    lavaPits.forEach(pit => {
      const midX = pit.s + (pit.e - pit.s) / 2;
      const lLight = this.lights.addLight(midX, 750, 240, 0xff2200, 1.6);
      this.tweens.add({
        targets: lLight,
        intensity: { from: 1.3, to: 1.9 },
        duration: Phaser.Math.Between(1000, 1500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 4. Steam Vents & Cooling Valves lights
    this.steamVents.getChildren().forEach((v: any) => {
      this.lights.addLight(v.x, v.y - 12, 100, 0xff5500, 1.15);
    });
    this.coolingValves.getChildren().forEach((v: any) => {
      this.lights.addLight(v.x, v.y - 12, 100, 0x00aaff, 1.25);
    });

    // 5. SkyCore light
    if (this.skyCore && this.skyCore.active) {
      this.skyCore.setPipeline('Light2D');
      const coreLight = this.lights.addLight(this.skyCore.x, this.skyCore.y, 160, 0x00ccff, 2.0);
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

    // 6. Tarot cards & crystal props
    this.children.list.forEach((child: any) => {
      if (child.texture && child.texture.key === 'prop-crystal') {
        child.setPipeline('Light2D');
        const cLight = this.lights.addLight(child.x, child.y - 12, 110, 0x00ffcc, 1.25);
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

  private updateEmbers(delta: number): void {
    this.emberTimer += delta;
    if (this.emberTimer > 150) {
      this.emberTimer = 0;
      this.spawnSmeltingEmber();
    }
  }

  private updateBloom(): void {
    if (this.skyCore && this.skyCore.active) {
      this.bloom.add(this.skyCore.x, this.skyCore.y, 18, 0x44aaff, 1.2);
    }

    this.player.combatSystem.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        this.bloom.add(bullet.x, bullet.y, 8, 0xff4400, 0.6);
      }
    });

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

  private createLavaBubbles(): void {
    this.gameAudio?.playLavaAmbient?.();
    const lavaPits = [{s:1360,e:1500},{s:2920,e:3060},{s:4500,e:4660},{s:6100,e:6280}];
    lavaPits.forEach(pit => {
      for (let x = pit.s + 10; x < pit.e; x += 80) {
        this.add.particles(x, 784, 'px-4', {
          speed: { min: 5, max: 15 },
          angle: { min: 260, max: 280 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.6, end: 0 },
          tint: [0xff6600, 0xff4400, 0xffaa00],
          lifespan: { min: 600, max: 1200 },
          frequency: 200 + Math.random() * 150,
          blendMode: Phaser.BlendModes.ADD,
        });
      }
    });
  }

  private createGears(): void {
    const gearPositions = [
      { x: 500, y: 200, speed: 0.0008 },
      { x: 900, y: 230, speed: -0.0012 },
      { x: 1400, y: 180, speed: 0.0006 },
    ];

    gearPositions.forEach(g => {
      const gear = this.add.rectangle(g.x, g.y, 40, 40, 0x334455, 0.3).setDepth(-18).setScrollFactor(0.03, 0);
      this.tweens.add({
        targets: gear,
        angle: 360 * Math.sign(g.speed),
        duration: Math.abs(1 / g.speed) * 1000,
        repeat: -1,
      });
    });

    // Chimney smoke
    for (let i = 0; i < 3; i++) {
      const cx = 400 + i * 500;
      this.add.particles(cx, 160, 'particle-smoke', {
        speed: { min: 10, max: 30 },
        angle: { min: 260, max: 280 },
        scale: { start: 0.6, end: 2.0 },
        alpha: { start: 0.15, end: 0 },
        tint: 0x888888,
        lifespan: { min: 2000, max: 4000 },
        frequency: 200,
      }).setDepth(-16).setScrollFactor(0.05, 0);
    }
  }

  private updateLavaAnimation(time: number): void {
    const lavaPits = [{s:1360,e:1500},{s:2920,e:3060},{s:4500,e:4660},{s:6100,e:6280}];
    lavaPits.forEach(pit => {
      for (let x = pit.s; x < pit.e; x += 32) {
        const tile = this.hazards.getChildren().find(
          c => c instanceof Phaser.GameObjects.TileSprite && c.x > pit.s && c.x < pit.e
        ) as Phaser.GameObjects.TileSprite;
        if (tile && tile.texture && tile.texture.key === 'tile-refinery-lava') {
          tile.tilePositionX = time * 0.02;
          tile.tilePositionY = Math.sin(time * 0.001 + x * 0.01) * 1.5;
        }
      }
    });
  }

  private updateBossEnergyAssist(delta: number): void {
    if (!this.player || !this.player.active) return;
    if (this.player.x < 6200 || this.player.x > 7500) return;

    const energyRatio = this.player.formMachine.energy.ratio;
    if (energyRatio > 0.3) { this.bossEnergyAssistTimer = 0; return; }

    this.bossEnergyAssistTimer += delta;
    if (this.bossEnergyAssistTimer > 5000) {
      this.bossEnergyAssistTimer = 0;
      const pickup = this.physics.add.sprite(
        this.player.x + Phaser.Math.Between(-80, 80),
        650, 'energy-pickup'
      );
      pickup.setScale(1.0);
      pickup.setDepth(5);
      if (this.lights) pickup.setPipeline('Light2D');
      this.physics.add.overlap(this.player, pickup, () => {
        if (!pickup.active) return;
        this.player.formMachine.energy.addEnergy(20);
        (this.scene as any).gameAudio?.playCardCollect?.();
        pickup.destroy();
      });
      this.time.delayedCall(8000, () => { if (pickup.active) pickup.destroy(); });
    }
  }

  private spawnSmeltingEmber(): void {
    const cam = this.cameras.main;
    const rx = cam.scrollX + Phaser.Math.Between(0, cam.width);
    const ry = cam.scrollY + cam.height + 20;

    const ember = this.add.rectangle(rx, ry, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4), 0xff3300);
    ember.setDepth(15);
    ember.setAlpha(0.8);

    this.tweens.add({
      targets: ember,
      y: ry - Phaser.Math.Between(150, 450),
      x: rx + Phaser.Math.Between(-80, 80),
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: Phaser.Math.Between(1200, 2400),
      onComplete: () => ember.destroy()
    });
  }

  private triggerDragonGemCutscene(): void {
    if (this.isCutsceneActive) return;
    this.isCutsceneActive = true;

    // Reset camera zoom for slideshow centering
    const originalZoom = this.cameras.main.zoom;
    this.cameras.main.setZoom(1.0);

    // Pause physics & disable inputs
    this.physics.world.pause();
    this.player.setInputEnabled(false);

    // Freeze enemies
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

    // Hide HUD overlay
    this.scene.setVisible(false, 'UIScene');

    // Create cinematic letterbox black bars
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;

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

    const topBorder = this.add.rectangle(cx, barHeight, cam.width, 2 * scale, 0x00d2d3) // blue/cyan separator rule
      .setScrollFactor(0)
      .setDepth(501);

    const bottomBorder = this.add.rectangle(cx, cam.height - barHeight, cam.width, 2 * scale, 0x00d2d3)
      .setScrollFactor(0)
      .setDepth(501);

    // Slide Image Display
    const slideSprite = this.add.image(cx, cy, 'cinematic-dragon-1')
      .setScrollFactor(0)
      .setDepth(499)
      .setAlpha(0);

    const targetHeight = cam.height - barHeight * 2 - 10 * scale;
    const aspect = slideSprite.width / slideSprite.height;
    slideSprite.setDisplaySize(targetHeight * aspect, targetHeight);

    // Subtitle Text inside bottom letterbox
    const subtitle = this.add.text(cx, cam.height - barHeight / 2, '', {
      fontSize: `${Math.round(11 * scale)}px`,
      fontFamily: 'monospace',
      color: '#cceeff',
      align: 'center',
      wordWrap: { width: cam.width - 60 * scale },
      lineSpacing: 4 * scale
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(502);

    const hintText = this.add.text(cam.width - 25 * scale, cam.height - 15 * scale, t('story.introSkip') || 'ENTER / CLICK to continue', {
      fontSize: `${Math.round(8 * scale)}px`,
      fontFamily: 'monospace',
      color: '#446688'
    })
    .setOrigin(1, 0.5)
    .setScrollFactor(0)
    .setDepth(502);

    // Fade cutscene slide in
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
      subtitle.setText(fullText);
    };

    // Load first slide
    startTypewriter(t(`story.cinematicDragon1`));

    const endCutscene = () => {
      this.tweens.add({
        targets: [backdrop, topBar, bottomBar, topBorder, bottomBorder, slideSprite, subtitle, hintText],
        alpha: 0,
        duration: 800,
        onComplete: () => {
          // Cleanup
          backdrop.destroy();
          topBar.destroy();
          bottomBar.destroy();
          topBorder.destroy();
          bottomBorder.destroy();
          slideSprite.destroy();
          subtitle.destroy();
          hintText.destroy();

          this.isCutsceneActive = false;
          this.physics.world.resume();
          this.player.setInputEnabled(true);
          this.cameras.main.setZoom(originalZoom);

          disabledEnemies.forEach((e) => {
            if (e.active) e.isActive = true;
          });

          // Unlocks Dragon form
          this.player.formMachine.unlockDragon();

          this.scene.setVisible(true, 'UIScene');

          // Save game
          saveGame({
            cardsCollected: this.tarotSystem.collectedCards,
            mechaUnlocked: true,
            dragonUnlocked: true,
            playerX: this.player.x,
            playerY: this.player.y
          });

          // Show unlock banner
          this.showDragonUnlockedPrompt();
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
        // Fade transition between slides
        this.tweens.add({
          targets: slideSprite,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            slideSprite.setTexture(`cinematic-dragon-${currentSlide}`);
            this.tweens.add({
              targets: slideSprite,
              alpha: 1,
              duration: 300
            });
            startTypewriter(t(`story.cinematicDragon${currentSlide}`));
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

  private showDragonUnlockedPrompt(): void {
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
    panel.fillStyle(0x060c14, 0.95);
    panel.lineStyle(2, 0x00d2d3, 0.8);
    panel.fillRect(cx - panelWidth/2, cy - panelHeight/2, panelWidth, panelHeight);
    panel.strokeRect(cx - panelWidth/2, cy - panelHeight/2, panelWidth, panelHeight);

    const promptParts = t('story.dragonUnlockedPrompt').split('\n\n');
    const titleString = promptParts.length > 0 ? promptParts[0] : 'CORE ACQUIRED';
    const descString = promptParts.length > 1 ? promptParts[1] : '';

    const titleText = this.add.text(cx, cy - 35 * scale, titleString, {
      fontSize: `${Math.round(16 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#00d2d3',
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

  private transitionToLevel1(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.cameras.main.fade(1000, 0, 0, 0);

    this.time.delayedCall(1000, () => {
      this.scene.start('TransitionScene12', {
        startPos: { x: 720, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private transitionToLevel3(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.cameras.main.fade(1000, 0, 0, 0);

    this.time.delayedCall(1000, () => {
      this.scene.start('TransitionScene23', {
        startPos: { x: 150, y: 650 },
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
      });
    });
  }

  private triggerPrototypeComplete(): void {
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

      const titleText = this.add.text(cx, cy, t('ui.prototypeComplete') + '\n\n' + t('story.demoEndPrompt'), {
        fontSize: `${Math.round(18 * scale)}px`,
        fontFamily: 'monospace',
        color: '#00d2d3',
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

  private createDecorations(): void {
    // === DESTROYED MECHA CARCASSES — large foreground props ===
    // These are half-buried fallen mechas that establish the "graveyard" atmosphere.
    // Alternating types A and B, scattered across each corridor segment.
    const mechaDecoA = [
      { x: 250,  y: 736, scale: 1.8, flipX: false },
      { x: 1100, y: 736, scale: 2.0, flipX: true  },
      { x: 1700, y: 736, scale: 1.6, flipX: false },
      { x: 2600, y: 736, scale: 1.9, flipX: true  },
      { x: 3400, y: 736, scale: 1.7, flipX: false },
      { x: 4300, y: 736, scale: 2.1, flipX: true  },
      { x: 5100, y: 736, scale: 1.8, flipX: false },
      { x: 5900, y: 736, scale: 2.0, flipX: true  },
      { x: 6700, y: 736, scale: 1.9, flipX: false },
      { x: 7400, y: 736, scale: 1.7, flipX: true  },
    ];

    mechaDecoA.forEach((d) => {
      const img = this.add.image(d.x, d.y, 'deco-mecha-a');
      img.setOrigin(0.5, 1);
      img.setDepth(2);
      img.setScale(d.scale);
      img.setFlipX(d.flipX);
      img.setAlpha(0.9);
      // Slight red glow tint to suggest still-hot reactor remnants
      img.setTint(0xcc5533);
    });

    const mechaDecoB = [
      { x: 650,  y: 736, scale: 1.6, flipX: true  },
      { x: 1480, y: 736, scale: 1.8, flipX: false },
      { x: 2150, y: 736, scale: 1.7, flipX: true  },
      { x: 3700, y: 736, scale: 1.9, flipX: false },
      { x: 4800, y: 736, scale: 1.5, flipX: true  },
      { x: 5500, y: 736, scale: 1.8, flipX: false },
      { x: 6350, y: 736, scale: 1.6, flipX: true  },
      { x: 7100, y: 736, scale: 2.0, flipX: false },
    ];

    mechaDecoB.forEach((d) => {
      const img = this.add.image(d.x, d.y, 'deco-mecha-b');
      img.setOrigin(0.5, 1);
      img.setDepth(1);
      img.setScale(d.scale);
      img.setFlipX(d.flipX);
      img.setAlpha(0.85);
      img.setTint(0xaa4422);
    });

    // === SCORCH MARKS on the ground ===
    // Large dark ellipses burned into the floor under fallen mechas
    const scorch = this.add.graphics();
    scorch.setDepth(0);
    const scorchPositions = [250, 650, 1100, 1480, 1700, 2150, 2600, 3400, 3700, 4300, 4800, 5100, 5500, 5900, 6350, 6700, 7100, 7400];
    scorchPositions.forEach((sx) => {
      const sw = Phaser.Math.Between(80, 140);
      scorch.fillStyle(0x0a0808, 0.7);
      scorch.fillEllipse(sx, 738, sw, 18);
    });

    // === BLINKING RED ALARM LIGHTS on high walls (atmosphere) ===
    const lightSpots = [
      { x: 150,  y: 120 }, { x: 450, y: 100 }, { x: 750,  y: 130 },
      { x: 1050, y: 110 }, { x: 1350, y: 95 }, { x: 1650, y: 125 },
      { x: 1950, y: 105 }, { x: 2300, y: 90 }, { x: 2700, y: 115 },
      { x: 3100, y: 100 }, { x: 3500, y: 125 }, { x: 3900, y: 95 },
      { x: 4250, y: 110 }, { x: 4600, y: 90 }, { x: 5000, y: 120 },
      { x: 5400, y: 100 }, { x: 5800, y: 130 }, { x: 6200, y: 105 },
      { x: 6600, y: 90 },  { x: 7000, y: 115 }, { x: 7400, y: 100 },
    ];

    lightSpots.forEach((spot) => {
      const wLight = this.add.image(spot.x, spot.y, 'prop-warning-light');
      wLight.setOrigin(0.5, 0.5);
      wLight.setDepth(-15);
      wLight.setScrollFactor(0.06);

      this.tweens.add({
        targets: wLight,
        alpha: { from: 0.15, to: 0.9 },
        scale: { from: 0.8, to: 1.3 },
        duration: Phaser.Math.Between(300, 700),
        yoyo: true,
        repeat: -1,
        ease: 'Cubic.easeInOut'
      });
    });
  }

  private createBackgroundEffects(): void {
    this.bgCauldrons = [];
    const cauldronSpots = [
      { x: 1000, y: 500 },
      { x: 2200, y: 490 },
      { x: 3500, y: 510 },
      { x: 4800, y: 490 },
      { x: 6000, y: 500 },
      { x: 6880, y: 490 }
    ];

    cauldronSpots.forEach((spot) => {
      const cauldron = this.add.image(spot.x, spot.y, 'bg-cauldron');
      cauldron.setOrigin(0.5, 0.5);
      cauldron.setDepth(-8);
      cauldron.setScrollFactor(1.0);
      this.bgCauldrons.push(cauldron);

      this.tweens.add({
        targets: cauldron,
        angle: { from: -3, to: 3 },
        duration: Phaser.Math.Between(2500, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  private spawnMoltenDrip(): void {
    if (this.bgCauldrons.length === 0) return;
    const cauldron = Phaser.Utils.Array.GetRandom(this.bgCauldrons);
    if (!cauldron) return;

    const rad = Phaser.Math.DegToRad(cauldron.angle);
    const localX = 18;
    const localY = 44;
    const spawnX = cauldron.x + (localX * Math.cos(rad) - localY * Math.sin(rad));
    const spawnY = cauldron.y + (localX * Math.sin(rad) + localY * Math.cos(rad));

    const droplet = this.add.rectangle(spawnX, spawnY, 2, 7, 0xffaa00);
    droplet.setDepth(-7);

    this.physics.add.existing(droplet);
    const body = droplet.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setVelocityY(Phaser.Math.Between(260, 360));

    this.moltenDroplets.add(droplet);
  }

  private updateMoltenDrips(delta: number): void {
    this.dripTimer += delta;
    if (this.dripTimer >= 220) {
      this.dripTimer = 0;
      this.spawnMoltenDrip();
    }

    this.moltenDroplets.getChildren().forEach((dobj) => {
      const d = dobj as Phaser.GameObjects.Rectangle;
      if (d.y >= 736) {
        spawnLavaSplash(this, d.x, 736);
        d.destroy();
      }
    });
  }

  private triggerDramaticDeath(player: Player): void {
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

  private triggerBossIntro(): void {
    this.bossIntroTriggered = true;
    this.isCutsceneActive = true;
    this.physics.world.pause();
    this.player.setInputEnabled(false);
    this.player.setVelocity(0, 0);

    // Stop Level 2 BGM, start Boss BGM
    this.gameAudio?.stopBGM();
    this.gameAudio?.playBGM(4);

    const cam = this.cameras.main;
    cam.stopFollow();

    cam.flash(500, 200, 0, 0);
    cam.shake(200, 0.005);

    this.tweens.add({
      targets: cam,
      scrollX: 6880 - cam.width / 2,
      duration: 1200,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        const bannerBg = this.add.rectangle(cam.scrollX + cam.width / 2, 240, cam.width, 100, 0x000000, 0.8)
          .setDepth(600)
          .setAlpha(0);
        const borderTop = this.add.rectangle(cam.scrollX + cam.width / 2, 190, cam.width, 2, 0xff3300)
          .setDepth(601)
          .setAlpha(0);
        const borderBottom = this.add.rectangle(cam.scrollX + cam.width / 2, 290, cam.width, 2, 0xff3300)
          .setDepth(601)
          .setAlpha(0);
        const titleText = this.add.text(cam.scrollX + cam.width / 2, 240, t('boss.eliteName') || 'DRACONEL BASTION', {
          fontSize: '20px',
          fontFamily: 'monospace',
          color: '#ff3300',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(602).setAlpha(0);

        this.tweens.add({
          targets: [bannerBg, borderTop, borderBottom, titleText],
          alpha: 1,
          duration: 500,
          yoyo: true,
          hold: 1400,
          onComplete: () => {
            bannerBg.destroy();
            borderTop.destroy();
            borderBottom.destroy();
            titleText.destroy();

            this.tweens.add({
              targets: cam,
              scrollX: this.player.x - cam.width / 2,
              duration: 1000,
              ease: 'Cubic.easeInOut',
              onComplete: () => {
                cam.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
                this.isCutsceneActive = false;
                this.physics.world.resume();
                this.player.setInputEnabled(true);
              }
            });
          }
        });
      }
    });
  }

  private triggerBossDeathCinematic(eliteBoss: EliteMecha, originalDie: () => void): void {
    this.isCutsceneActive = true;
    this.physics.world.pause();
    this.player.setInputEnabled(false);
    this.player.setVelocity(0, 0);

    this.gameAudio?.stopBGM();
    this.cameras.main.stopFollow();
    this.cameras.main.shake(1200, 0.012);

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: eliteBoss.x - this.cameras.main.width / 2,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        originalDie();

        this.time.delayedCall(1600, () => {
          this.gameAudio?.playCoreCollect();

          const cam = this.cameras.main;
          const bannerBg = this.add.rectangle(cam.scrollX + cam.width / 2, 240, cam.width, 100, 0x000000, 0.8)
            .setDepth(600)
            .setAlpha(0);
          const borderTop = this.add.rectangle(cam.scrollX + cam.width / 2, 190, cam.width, 2, 0x00d2d3)
            .setDepth(601)
            .setAlpha(0);
          const borderBottom = this.add.rectangle(cam.scrollX + cam.width / 2, 290, cam.width, 2, 0x00d2d3)
            .setDepth(601)
            .setAlpha(0);
          const titleText = this.add.text(cam.scrollX + cam.width / 2, 240, t('boss.defeated') || 'DRACONEL DEFEATED', {
            fontSize: '22px',
            fontFamily: 'monospace',
            color: '#00d2d3',
            stroke: '#000000',
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(602).setAlpha(0);

          this.tweens.add({
            targets: [bannerBg, borderTop, borderBottom, titleText],
            alpha: 1,
            duration: 600,
            yoyo: true,
            hold: 2000,
            onComplete: () => {
              bannerBg.destroy();
              borderTop.destroy();
              borderBottom.destroy();
              titleText.destroy();

              this.tweens.add({
                targets: cam,
                scrollX: this.player.x - cam.width / 2,
                duration: 1000,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                  cam.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
                  this.isCutsceneActive = false;
                  this.physics.world.resume();
                  this.player.setInputEnabled(true);
                  this.gameAudio?.playBGM(2);
                }
              });
            }
          });
        });
      }
    });
  }
}
