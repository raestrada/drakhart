import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { SkyCore } from '../entities/SkyCore';
import { EnergyPickup } from '../entities/EnergyPickup';
import { TarotCard } from '../entities/TarotCard';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { MechaEnemy } from '../entities/enemies/MechaEnemy';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { ShieldEnemy } from '../entities/enemies/ShieldEnemy';
import { Barricade } from '../entities/Barricade';
import { SteamVent } from '../entities/SteamVent';
import { CoolingValve } from '../entities/CoolingValve';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { loadGame, saveGame } from '../systems/SaveSystem';
import { spawnHitParticles } from '../effects/Particles';
import {
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  CAMERA_LERP,
  CAMERA_ZOOM_MECHA,
} from '../utils/constants';
import { t } from '../i18n';

interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  texture?: string;
}

export class GameScene2 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
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

  private pendingMechaUnlock = true;
  private pendingSpawnX = 100;
  private pendingSpawnY = 550;
  private pendingCardsToCollect: string[] = [];
  private demoEnded = false;
  public isCutsceneActive = false;

  constructor() {
    super({ key: 'GameScene2' });
  }

  init(data?: { startPos?: { x: number; y: number }; cardsCollected?: string[]; mechaUnlocked?: boolean }): void {
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
    }
  }

  create(): void {
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    // Initialize/resume Audio system
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(2);

    this.events.once('shutdown', () => {
      this.gameAudio.stopBGM();
    });
    this.events.once('destroy', () => {
      this.gameAudio.stopBGM();
    });

    this.createParallax();
    this.createDecorations();
    this.createLevel();
    this.createInteractiveObjects();
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

    this.createEnemies();
    this.setupCamera();
    this.setupCollisions();
    this.createVignette();

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
        .setDepth(-29);
      this.refinerySunImage.setTint(0xffaa99, 0xff8877, 0x552222, 0x442222);
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
        .setDepth(-19);
      this.furnaceImage.setTint(0xff8866, 0xff88aa, 0x66222c, 0x883344);
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
        .setDepth(-9);
      this.pipesImage.setTint(0xbb5544, 0xdd6644, 0x221111, 0x331111);
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

    const platforms: PlatformDef[] = [
      // === SECTION 1: Refinery Gates (0-2000) ===
      { x: 0, y: 736, width: 2000, height: 64, texture: 'tile-lava-ground' },
      { x: 400, y: 600, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 700, y: 520, width: 160, height: 16, texture: 'tile-refinery' },
      { x: 1000, y: 600, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 1300, y: 520, width: 160, height: 16, texture: 'tile-refinery' },
      { x: 1600, y: 600, width: 192, height: 16, texture: 'tile-refinery' },

      // === SECTION 2: Smelting Vats (Lava pits: 2000-3800) ===
      { x: 2000, y: 736, width: 200, height: 64, texture: 'tile-lava-ground' },
      // Lava Lake from 2200 to 3800
      { x: 3800, y: 736, width: 700, height: 64, texture: 'tile-lava-ground' },

      // Floating platforms in the lava zone (widened gaps):
      { x: 2350, y: 560, width: 96, height: 16, texture: 'tile-refinery' },
      { x: 2750, y: 460, width: 96, height: 16, texture: 'tile-refinery' },
      { x: 3150, y: 420, width: 96, height: 16, texture: 'tile-refinery' },
      { x: 3500, y: 540, width: 96, height: 16, texture: 'tile-refinery' },

      // === SECTION 3: Overcharge Chamber (4500-6800) ===
      { x: 4500, y: 736, width: 2300, height: 64, texture: 'tile-lava-ground' },
      { x: 4700, y: 600, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 4950, y: 480, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 5200, y: 360, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 5500, y: 500, width: 256, height: 16, texture: 'tile-refinery' },
      { x: 5900, y: 600, width: 192, height: 16, texture: 'tile-refinery' },
      { x: 6200, y: 480, width: 192, height: 16, texture: 'tile-refinery' },

      // === SECTION 4: Dragon Shrine (6800-8000) ===
      { x: 6800, y: 736, width: 1200, height: 64, texture: 'tile-lava-ground' },
      { x: 7100, y: 620, width: 128, height: 16, texture: 'tile-refinery' },
      { x: 7350, y: 500, width: 256, height: 236, texture: 'tile-lava-ground' }, // Altar structure
    ];

    platforms.forEach((p) => {
      const textureKey = p.texture || 'tile-refinery';
      const isGround = textureKey === 'tile-lava-ground';
      const tileW = 32;
      const tileH = isGround ? 32 : 16;

      for (let tx = p.x; tx < p.x + p.width; tx += tileW) {
        for (let ty = p.y; ty < p.y + p.height; ty += tileH) {
          const tile = this.platforms.create(tx + tileW / 2, ty + tileH / 2, textureKey);
          if (!isGround) {
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.left = false;
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.right = false;
          }
        }
      }
    });

    // Populate lava hazard at y=768 in the smelting vats gap (2200 to 3800)
    for (let tx = 2200; tx < 3800; tx += 32) {
      const lava = this.hazards.create(tx + 16, 768 + 16, 'tile-refinery-lava');
      (lava.body as Phaser.Physics.Arcade.StaticBody).setSize(32, 24);
    }
  }

  private createInteractiveObjects(): void {
    this.barricades = this.physics.add.staticGroup();
    this.steamVents = this.physics.add.staticGroup();
    this.coolingValves = this.physics.add.staticGroup();
    this.energyPickups = this.physics.add.staticGroup();

    // Barricades that require heavy mecha claymore slashes
    // Ground blockades
    const b1 = new Barricade(this, 800, 704);
    const b2 = new Barricade(this, 4200, 704);
    const b3 = new Barricade(this, 6500, 704);

    // Upper platform blockades (Warrior cannot pass since sword damage is 25, below the 75 threshold)
    const bPlatform1 = new Barricade(this, 780, 488);  // Platform at x:700, y:520
    const bPlatform2 = new Barricade(this, 1380, 488); // Platform at x:1300, y:520
    const bPlatform3 = new Barricade(this, 2798, 428); // Platform 2 at x:2750, y:460
    const bPlatform4 = new Barricade(this, 5300, 328); // Platform at x:5200, y:360
    const bPlatform5 = new Barricade(this, 6300, 448); // Platform at x:6200, y:480
    const bPlatform6 = new Barricade(this, 7160, 588); // Platform at x:7100, y:620

    this.barricades.addMultiple([
      b1, b2, b3,
      bPlatform1, bPlatform2, bPlatform3, bPlatform4, bPlatform5, bPlatform6
    ]);

    // Steam vents for launching mecha and increasing heat
    const v1 = new SteamVent(this, 1400, 720);
    const v2 = new SteamVent(this, 2398, 544); // Platform 1 at x:2350, y:560
    const v3 = new SteamVent(this, 3198, 404); // Platform 3 at x:3150, y:420
    const v4 = new SteamVent(this, 4800, 720);
    this.steamVents.addMultiple([v1, v2, v3, v4]);

    // Cooling valves for heat dumping and freezing enemies
    const c1 = new CoolingValve(this, 1800, 704);
    const c2 = new CoolingValve(this, 3530, 524); // Adjust slightly for Platform 4
    const c3 = new CoolingValve(this, 5000, 704);
    this.coolingValves.addMultiple([c1, c2, c3]);

    // Scatter Energy Pickups across Level 2 to sustain Mecha and help Warrior recover
    const pickupSpots = [
      { x: 900, y: 540 },
      { x: 1450, y: 460 },
      { x: 2150, y: 680 },
      { x: 2550, y: 440 }, // floating in gap 1-2
      { x: 2950, y: 340 }, // floating in gap 2-3
      { x: 3350, y: 380 }, // floating in gap 3-4
      { x: 4000, y: 680 },
      { x: 5100, y: 300 },
      { x: 5700, y: 440 },
      { x: 6355, y: 420 },
      { x: 7000, y: 560 },
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

    // Rogue Mecha enemies (vulnerable only to mecha form, swing maces)
    const m1 = new MechaEnemy(this, 1200, 680, this.player, { patrolMinX: 950, patrolMaxX: 1550 });
    const m2 = new MechaEnemy(this, 3950, 680, this.player, { patrolMinX: 3850, patrolMaxX: 4150 });
    const m3 = new MechaEnemy(this, 4800, 680, this.player, { patrolMinX: 4600, patrolMaxX: 5200 });
    const m4 = new MechaEnemy(this, 5800, 680, this.player, { patrolMinX: 5600, patrolMaxX: 6200 });
    const m5 = new MechaEnemy(this, 7150, 680, this.player, { patrolMinX: 6900, patrolMaxX: 7300 });

    // Upper platform Rogue Mechas (completely block/penalize warrior form)
    const mPlatform1 = new MechaEnemy(this, 1700, 544, this.player, { patrolMinX: 1620, patrolMaxX: 1780 }); // Platform at 1600, y:600
    const mPlatform2 = new MechaEnemy(this, 4800, 544, this.player, { patrolMinX: 4720, patrolMaxX: 4880 }); // Platform at 4700, y:600
    const mPlatform3 = new MechaEnemy(this, 6000, 544, this.player, { patrolMinX: 5920, patrolMaxX: 6080 }); // Platform at 5900, y:600

    this.enemies.addMultiple([
      m1, m2, m3, m4, m5,
      mPlatform1, mPlatform2, mPlatform3
    ]);

    // Spitters & Shield sentries on ground & upper platforms
    const s1 = new SpitterEnemy(this, 600, 680, this.player);
    const s2 = new SpitterEnemy(this, 1700, 680, this.player);
    const sh1 = new ShieldEnemy(this, 1500, 680, this.player);

    // Upper platform Spitters
    const sPlatform1 = new SpitterEnemy(this, 1100, 584, this.player); // Platform at 1000, y:600
    const sPlatform2 = new SpitterEnemy(this, 2800, 444, this.player); // Platform 2 at x:2750, y:460 (lava zone)
    const sPlatform3 = new SpitterEnemy(this, 3170, 404, this.player); // Platform 3 at x:3150, y:420 (lava zone)
    const sPlatform4 = new SpitterEnemy(this, 5600, 484, this.player); // Platform at 5500, y:500

    this.enemies.addMultiple([
      s1, s2, sh1,
      sPlatform1, sPlatform2, sPlatform3, sPlatform4
    ]);

    // Flying Sentinels (crucial shmup style hazards in lava lake)
    const f1 = new FlyingEnemy(this, 2450, 320, this.player);
    const f2 = new FlyingEnemy(this, 3050, 280, this.player);
    const f3 = new FlyingEnemy(this, 5100, 240, this.player);
    const f4 = new FlyingEnemy(this, 6100, 300, this.player);
    this.enemies.addMultiple([f1, f2, f3, f4]);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);
    this.cameras.main.setZoom(CAMERA_ZOOM_MECHA);
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
  }

  private createVignette(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRect(0, 0, LEVEL_WIDTH, 80); // top screen vignette
    shadow.fillRect(0, LEVEL_HEIGHT - 80, LEVEL_WIDTH, 80); // bottom screen vignette
    shadow.setScrollFactor(0);
    shadow.setDepth(400);
  }

  update(time: number, delta: number): void {
    if (this.isCutsceneActive) return;

    if (this.player && this.player.active) {
      this.gameAudio?.update(this.player.x);
    }
    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);

    // Apply extreme heat environmental damage to Warrior form
    if (this.player.active && this.player.alive) {
      const state = this.player.formMachine.state;
      if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
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

  private updateEmbers(delta: number): void {
    this.emberTimer += delta;
    if (this.emberTimer > 150) {
      this.emberTimer = 0;
      this.spawnSmeltingEmber();
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
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const scale = this.cameras.main.width / 800;

    const bannerBg = this.add.rectangle(cx, cy, this.cameras.main.width, 140 * scale, 0x000000, 0.8)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(600)
      .setAlpha(0);

    const borderTop = this.add.rectangle(cx, cy - 70 * scale, this.cameras.main.width, 2 * scale, 0x00d2d3)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(601)
      .setAlpha(0);

    const borderBottom = this.add.rectangle(cx, cy + 70 * scale, this.cameras.main.width, 2 * scale, 0x00d2d3)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(601)
      .setAlpha(0);

    const unlockText = this.add.text(cx, cy, t('story.dragonUnlockedPrompt'), {
      fontSize: `${Math.round(13 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
      lineSpacing: 8 * scale
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(602)
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

          // After showing unlock banner, transition to Level 3 autoscroller
          this.transitionToLevel3();
        }
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
      this.scene.start('GameScene3', {
        cardsCollected: this.tarotSystem.collectedCards,
        mechaUnlocked: true,
        dragonUnlocked: true
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
    // Spawn refinery consoles on platforms
    const consoleSpots = [
      { x: 300, y: 736 },
      { x: 500, y: 600 },
      { x: 800, y: 520 },
      { x: 1100, y: 600 },
      { x: 1400, y: 520 },
      { x: 1700, y: 600 },
      { x: 2350, y: 580 },
      { x: 2600, y: 460 },
      { x: 3000, y: 520 },
      { x: 3350, y: 400 },
      { x: 3650, y: 460 },
      { x: 4000, y: 736 },
      { x: 4400, y: 520 },
      { x: 4800, y: 600 },
      { x: 5350, y: 460 },
      { x: 5700, y: 520 },
      { x: 6150, y: 600 },
      { x: 6600, y: 400 },
      { x: 7050, y: 520 },
      { x: 7350, y: 736 },
    ];

    consoleSpots.forEach((spot) => {
      const console = this.add.image(spot.x, spot.y, 'prop-console');
      console.setOrigin(0.5, 1);
      console.setDepth(-1);
      if (Math.random() > 0.5) console.setFlipX(true);
    });

    // Spawn blinking warning lights on background walls / ceilings
    const lightSpots = [
      { x: 150, y: 150 },
      { x: 420, y: 180 },
      { x: 680, y: 140 },
      { x: 950, y: 160 },
      { x: 1250, y: 180 },
      { x: 1520, y: 150 },
      { x: 1880, y: 170 },
      { x: 2150, y: 130 },
      { x: 2480, y: 160 },
      { x: 2820, y: 140 },
      { x: 3150, y: 150 },
      { x: 3520, y: 170 },
      { x: 3900, y: 150 },
      { x: 4250, y: 140 },
      { x: 4620, y: 160 },
      { x: 4950, y: 150 },
      { x: 5280, y: 130 },
      { x: 5620, y: 160 },
      { x: 5950, y: 140 },
      { x: 6280, y: 150 },
      { x: 6650, y: 170 },
      { x: 7020, y: 140 },
      { x: 7450, y: 150 },
    ];

    lightSpots.forEach((spot) => {
      const wLight = this.add.image(spot.x, spot.y, 'prop-warning-light');
      wLight.setOrigin(0.5, 0.5);
      wLight.setDepth(-15);
      wLight.setScrollFactor(0.06);

      this.tweens.add({
        targets: wLight,
        alpha: { from: 0.2, to: 1.0 },
        scale: { from: 0.9, to: 1.25 },
        duration: Phaser.Math.Between(400, 800),
        yoyo: true,
        repeat: -1,
        ease: 'Cubic.easeInOut'
      });
    });
  }
}
