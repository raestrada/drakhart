import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameAudio } from '../systems/GameAudio';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { SpitterEnemy } from '../entities/enemies/SpitterEnemy';
import { Boss } from '../entities/enemies/Boss';
import { EnergyPickup } from '../entities/EnergyPickup';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { loadGame, saveGame } from '../systems/SaveSystem';
import { spawnHitParticles, spawnDeathExplosion } from '../effects/Particles';
import { BloomSystem } from '../effects/BloomSystem';
import { BaseLevelScene } from './BaseLevelScene';
import { SaveAltar } from '../entities/SaveAltar';
import { EchoFragment } from '../entities/EchoFragment';
import {
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  CAMERA_LERP,
} from '../utils/constants';
import { t } from '../i18n';

interface PlatformDef {
  x: number;
  y: number;
  width: number;
  height: number;
  texture?: string;
}

interface WaveEnemyDef {
  type: 'sky-hunter' | 'bone-serpent' | 'spitter' | 'seeker-drone' | 'mine-dropper' | 'gunship';
  x: number; // offset from wave triggerX
  y: number;
  speedX?: number;
  speedY?: number;
  pattern?: 'straight' | 'sine' | 'dive';
}

interface WaveDef {
  triggerX: number;
  enemies: WaveEnemyDef[];
}

export class GameScene3 extends BaseLevelScene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private boss: Boss | null = null;
  private tarotSystem!: TarotSystem;

  private laserGates: LaserGate[] = [];
  private laserBeams!: Phaser.Physics.Arcade.StaticGroup;
  private steamPipes: SteamPipeHazard[] = [];
  private pistons!: Phaser.Physics.Arcade.Group;
  private lastLaserDamageTime = 0;
  private lastSteamDamageTime = 0;
  private lastPistonDamageTime = 0;
  private windLines!: Phaser.GameObjects.Graphics;

  private bgGorgeSky!: Phaser.GameObjects.TileSprite;
  private bgGorgeWalls!: Phaser.GameObjects.TileSprite;
  private bgGorgeStructures!: Phaser.GameObjects.TileSprite;
  private bgReactor!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private emberTimer = 0;
  private bloom!: BloomSystem;
  private echoFragments: EchoFragment[] = [];

  // Autoscroll & coordinates
  private scrollX = 0;
  private scrollSpeed = 165; // speed of autoscroll
  private playerScreenX = 200; // start 200px from left
  private playerScreenY = 400; // start center vertical


  private shmupStarted = false;
  private warningTriggered = false;
  private pendingMechaUnlock = true;
  private pendingDragonUnlock = true;

  private waves: WaveDef[] = [];
  private spawnedWaves = new Set<number>();

  private pendingSpawnX = 100;
  private pendingSpawnY = 400;
  private pendingCardsToCollect: string[] = [];
  private demoEnded = false;
  public isCutsceneActive = false;
  private bossActive = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'GameScene3' });
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

    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    // Keyboard controls
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Initialize/resume Audio system
    this.gameAudio = new GameAudio();
    this.gameAudio.playBGM(3);
    this.gameAudio.playAmbientZone(3);

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

    this.input.keyboard?.on('keydown-T', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('TarotCollectionScene', { tarotSystem: this.tarotSystem });
    });

    // Initialize groups & arrays before creating levels
    this.enemies = this.physics.add.group();
    this.laserBeams = this.physics.add.staticGroup();
    this.pistons = this.physics.add.group();
    this.laserGates = [];
    this.steamPipes = [];

    this.windLines = this.add.graphics();
    this.windLines.setDepth(10);

    this.createParallax();
    this.createLevel();
    this.createInteractiveObjects();
    this.createDecorations();
    this.createEchoFragments();
    this.tarotSystem = new TarotSystem();

    if (this.pendingCardsToCollect && this.pendingCardsToCollect.length > 0) {
      this.pendingCardsToCollect.forEach((cardId) => {
        this.tarotSystem.collect(cardId, null as any);
      });
    }

    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.player.formMachine.energy.addEnergy(100); // start full

    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);
    this.playerScreenX = this.pendingSpawnX;
    this.playerScreenY = this.pendingSpawnY;

    this.buildWaves();
    this.setupCamera();
    this.setupCollisions();
    this.createVignette();
    this.showIntroText();

    this.scene.launch('UIScene', {
      player: this.player,
      tarotSystem: this.tarotSystem,
    });
  }

  private createParallax(): void {
    this.cameras.main.setBackgroundColor('#08040a');

    // 1. Gorge Sky Background (reuse procedural cosmic nebula sky texture)
    this.bgGorgeSky = this.add.tileSprite(0, 0, LEVEL_WIDTH, 1200, 'bg-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.01, 0)
      .setDepth(-30);
    this.bgGorgeSky.setTint(0x884488, 0x884488, 0x331133, 0x331133);

    // 1.1 Volcanic Reactor Core (Unique background support image, slow horizontal scroll)
    if (this.textures.exists('bg-gorge-reactor')) {
      this.bgReactor = this.add.image(0, 0, 'bg-gorge-reactor')
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(-25)
        .setAlpha(0.65);
      this.bgReactor.setTint(0xff5522, 0xff8844, 0x331122, 0x551122);
    }

    // 2. Obsidian Gorge Walls (procedural craggy top/bottom ceiling & floor, slow scroll)
    this.bgGorgeWalls = this.add.tileSprite(0, 180, this.scale.width * 1.5, 800, 'bg-gorge-walls')
      .setOrigin(0, 0)
      .setScrollFactor(0.06, 0)
      .setDepth(-20);
    this.bgGorgeWalls.setTint(0xff5500, 0xff2200, 0x1a0512, 0x2d0b1a);

    // 3. Gorge Industrial Structures (procedural girders, pipes, cables, medium scroll)
    this.bgGorgeStructures = this.add.tileSprite(0, 240, this.scale.width * 1.5, 800, 'bg-gorge-structures')
      .setOrigin(0, 0)
      .setScrollFactor(0.18, 0)
      .setDepth(-10);
    this.bgGorgeStructures.setTint(0x777788, 0x9999aa, 0x111122, 0x111122);
  }

  private createLevel(): void {
    this.platforms = this.physics.add.staticGroup();
    this.hazards = this.physics.add.staticGroup();

    // Ceiling and floor boundaries to lock player in the gorge corridor
    const platforms: PlatformDef[] = [
      { x: 0, y: 0, width: 8000, height: 96, texture: 'tile-lava-ground' },
      { x: 0, y: 704, width: 8000, height: 96, texture: 'tile-lava-ground' }
    ];

    platforms.forEach((p) => {
      const textureKey = p.texture || 'tile-lava-ground';
      const tileW = 32;
      const tileH = 32;

      for (let tx = p.x; tx < p.x + p.width; tx += tileW) {
        for (let ty = p.y; ty < p.y + p.height; ty += tileH) {
          this.platforms.create(tx + tileW / 2, ty + tileH / 2, textureKey);
        }
      }
    });

    // Spawn Steam Pipes
    const steamLocs = [
      { x: 1200, isCeiling: true },
      { x: 2000, isCeiling: false },
      { x: 2800, isCeiling: true },
      { x: 3800, isCeiling: false },
      { x: 4600, isCeiling: true },
      { x: 5400, isCeiling: false },
      { x: 6200, isCeiling: true }
    ];
    steamLocs.forEach((loc) => {
      const pipeY = loc.isCeiling ? 96 : 704;
      const pipe = new SteamPipeHazard(this, loc.x, pipeY, loc.isCeiling);
      this.steamPipes.push(pipe);
    });

    // Spawn Pistons
    const pistonLocs = [
      { x: 1600, isCeiling: true },
      { x: 2200, isCeiling: false },
      { x: 3200, isCeiling: true },
      { x: 3200, isCeiling: false },
      { x: 4200, isCeiling: true },
      { x: 4800, isCeiling: false },
      { x: 5800, isCeiling: true },
      { x: 5800, isCeiling: false }
    ];
    pistonLocs.forEach((loc) => {
      const pipeY = loc.isCeiling ? 96 : 704;
      const piston = new PistonHazard(this, loc.x, pipeY, loc.isCeiling);
      this.pistons.add(piston);
    });

    // Spawn Laser Gates
    const laserGateXs = [2500, 3600, 4500, 5200, 6000, 6600];
    laserGateXs.forEach((x) => {
      const gate = new LaserGate(this, x);
      this.laserGates.push(gate);
      this.laserBeams.add(gate.beam);
      this.enemies.add(gate.nodeTop);
      this.enemies.add(gate.nodeBottom);
    });
  }

  private createInteractiveObjects(): void {
    this.energyPickups = this.physics.add.staticGroup();

    // Spawn Energy pickups along the gorge corridor (Y must be in flight path 120 - 680)
    const pickupLocations = [
      { x: 500, y: 300 },
      { x: 1100, y: 250 },
      { x: 1700, y: 250 },
      { x: 2450, y: 450 },
      { x: 2950, y: 350 },
      { x: 3400, y: 250 },
      { x: 3900, y: 450 },
      { x: 4300, y: 300 },
      { x: 4850, y: 250 },
      { x: 5250, y: 500 },
      { x: 5750, y: 200 },
      { x: 6150, y: 450 },
      { x: 6650, y: 350 },
      { x: 7050, y: 300 },
    ];

    pickupLocations.forEach((loc) => {
      const pickup = new EnergyPickup(this, loc.x, loc.y);
      this.energyPickups.add(pickup);
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, this.pendingSpawnX, this.pendingSpawnY);
    this.playerShadow = this.add.image(this.player.x, this.player.y + 32, 'shadow')
      .setDepth(-5)
      .setAlpha(0.5);
  }

  private buildWaves(): void {
    this.waves = [
      {
        triggerX: 1400,
        enemies: [
          { type: 'seeker-drone', x: 0, y: 200 },
          { type: 'seeker-drone', x: 100, y: 400 },
          { type: 'seeker-drone', x: 200, y: 600 }
        ]
      },
      {
        triggerX: 1800,
        enemies: [
          { type: 'mine-dropper', x: 0, y: 140 },
          { type: 'sky-hunter', x: 100, y: 300, speedX: -110 },
          { type: 'sky-hunter', x: 200, y: 500, speedX: -110 }
        ]
      },
      {
        triggerX: 2200,
        enemies: [
          { type: 'gunship', x: 0, y: 300 },
          { type: 'bone-serpent', x: 150, y: 200, speedX: -280 },
          { type: 'bone-serpent', x: 150, y: 500, speedX: -280 }
        ]
      },
      {
        triggerX: 2600,
        enemies: [
          { type: 'seeker-drone', x: 0, y: 250 },
          { type: 'seeker-drone', x: 80, y: 450 },
          { type: 'mine-dropper', x: 160, y: 140 }
        ]
      },
      {
        triggerX: 3000,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 200, speedX: -120 },
          { type: 'sky-hunter', x: 50, y: 300, speedX: -120 },
          { type: 'sky-hunter', x: 100, y: 400, speedX: -120 },
          { type: 'sky-hunter', x: 150, y: 500, speedX: -120 }
        ]
      },
      {
        triggerX: 3400,
        enemies: [
          { type: 'gunship', x: 0, y: 400 },
          { type: 'seeker-drone', x: 120, y: 200 },
          { type: 'seeker-drone', x: 200, y: 600 }
        ]
      },
      {
        triggerX: 3900,
        enemies: [
          { type: 'mine-dropper', x: 0, y: 140 },
          { type: 'mine-dropper', x: 150, y: 140 },
          { type: 'bone-serpent', x: 200, y: 350, speedX: -300 }
        ]
      },
      {
        triggerX: 4300,
        enemies: [
          { type: 'gunship', x: 0, y: 300 },
          { type: 'gunship', x: 200, y: 450 }
        ]
      },
      {
        triggerX: 4700,
        enemies: [
          { type: 'seeker-drone', x: 0, y: 200 },
          { type: 'seeker-drone', x: 50, y: 350 },
          { type: 'seeker-drone', x: 100, y: 500 }
        ]
      },
      {
        triggerX: 5100,
        enemies: [
          { type: 'mine-dropper', x: 0, y: 140 },
          { type: 'sky-hunter', x: 100, y: 250, speedX: -120 },
          { type: 'sky-hunter', x: 150, y: 450, speedX: -120 }
        ]
      },
      {
        triggerX: 5500,
        enemies: [
          { type: 'gunship', x: 0, y: 250 },
          { type: 'bone-serpent', x: 100, y: 400, speedX: -300 },
          { type: 'bone-serpent', x: 200, y: 550, speedX: -300 }
        ]
      },
      {
        triggerX: 5900,
        enemies: [
          { type: 'seeker-drone', x: 0, y: 300 },
          { type: 'mine-dropper', x: 100, y: 140 },
          { type: 'gunship', x: 200, y: 400 }
        ]
      },
      {
        triggerX: 6300,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 200, speedX: -140 },
          { type: 'sky-hunter', x: 50, y: 320, speedX: -140 },
          { type: 'sky-hunter', x: 100, y: 440, speedX: -140 },
          { type: 'bone-serpent', x: 150, y: 560, speedX: -320 }
        ]
      },
      {
        triggerX: 6700,
        enemies: [
          { type: 'gunship', x: 0, y: 300 },
          { type: 'seeker-drone', x: 100, y: 200 },
          { type: 'seeker-drone', x: 100, y: 500 },
          { type: 'mine-dropper', x: 200, y: 140 }
        ]
      }
    ];
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    if (!this.shmupStarted) {
      this.cameras.main.setZoom(1.6);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    } else {
      this.cameras.main.setZoom(1.4);
    }
  }

  private createEchoFragments(): void {
    const e1 = new EchoFragment(this, 3500, 350, 2);
    this.echoFragments.push(e1);
  }

  private setupCollisions(): void {
    this.echoFragments.forEach((echo) => {
      this.physics.add.overlap(this.player, echo, () => {
        if (echo.active) echo.collect();
      });
    });

    // Overlap checks for gorge platforms/walls to apply dragging speed penalty
    this.physics.add.overlap(this.player, this.platforms, (_player, _platform) => {
      if (this.player.formMachine.state !== FormState.DRAGON) return;
      const wall = _platform as Phaser.Physics.Arcade.Sprite;

      // Pull back to the left (scrape friction)
      if (this.player.x < wall.x) {
        this.playerScreenX -= 5;
      } else {
        if (this.player.y < wall.y) {
          this.playerScreenY -= 3;
        } else {
          this.playerScreenY += 3;
        }
      }
    });

    // Enemy collision deals damage and inflicts high drag/pushback penalty
    this.physics.add.collider(this.player, this.enemies, (_player, _enemy) => {
      const obj = _enemy as Phaser.Physics.Arcade.Sprite;
      if (!obj.active) return;

      // Check if it's a homing missile or drift mine
      if (typeof (_enemy as any).explode === 'function') {
        (_enemy as any).explode();
        return;
      }

      // Check if it is a LaserGateNode
      if (_enemy instanceof LaserGateNode) {
        if (this.time.now - this.lastLaserDamageTime > 400) {
          this.lastLaserDamageTime = this.time.now;
          this.playerScreenX -= 65;
          this.player.takeDamage(15, -1);
        }
        return;
      }

      const enemy = _enemy as BaseEnemy;
      if (enemy.health <= 0) return;

      const dmg = enemy.attackDamage ?? 10;
      if (this.player.formMachine.state === FormState.DRAGON) {
        // Heavy pushback to the left on hit
        this.playerScreenX -= 65;
        this.player.takeDamage(dmg, -1);
      } else {
        // Warrior gets knocked back normally
        const knockDir = this.player.x < enemy.x ? -1 : 1;
        this.player.takeDamage(dmg, knockDir);
      }
    });

    // Overlap with Energy Crystals
    this.physics.add.overlap(this.player, this.energyPickups, (_player, _pickup) => {
      const pickup = _pickup as EnergyPickup;
      pickup.collect(this.player, () => {
        // Push forward boost callback
        this.playerScreenX += 90;
      });
    });

    // Bullets vs platforms
    this.physics.add.collider(
      this.player.combatSystem.bullets,
      this.platforms,
      (_bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        b.disableBody(true, true);
      }
    );

    // Bullets vs enemies (Standard + Custom nodes/missiles/mines)
    this.physics.add.overlap(
      this.player.combatSystem.bullets,
      this.enemies,
      (_bullet, _enemy) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        b.disableBody(true, true);

        const target = _enemy as Phaser.Physics.Arcade.Sprite;
        if (typeof (target as any).takeDamage === 'function') {
          (target as any).takeDamage(this.player.combatSystem.getFireDamage());
        } else {
          target.destroy();
        }
        spawnHitParticles(this, target.x, target.y);
      }
    );

    // Player vs Laser Beams
    this.physics.add.overlap(this.player, this.laserBeams, () => {
      if (this.time.now - this.lastLaserDamageTime > 400) {
        this.lastLaserDamageTime = this.time.now;
        this.playerScreenX -= 40; // small pushback
        this.player.takeDamage(8, -1);
      }
    });

    // Player vs Pistons
    this.physics.add.collider(this.player, this.pistons, (_player, _piston) => {
      if (this.time.now - this.lastPistonDamageTime > 500) {
        this.lastPistonDamageTime = this.time.now;
        this.playerScreenX -= 80; // heavy pushback
        this.player.takeDamage(12, -1);
        this.cameras.main.shake(150, 0.008);
      }
    });
  }

  private createVignette(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRect(0, 0, LEVEL_WIDTH, 80);
    shadow.fillRect(0, LEVEL_HEIGHT - 80, LEVEL_WIDTH, 80);
    shadow.setScrollFactor(0);
    shadow.setDepth(400);
  }

  private showIntroText(): void {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const scale = cam.width / 800;

    const bannerBg = this.add.rectangle(cx, cy, cam.width, 160 * scale, 0x000000, 0.75)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(600);

    const borderTop = this.add.rectangle(cx, cy - 80 * scale, cam.width, 2 * scale, 0xcc55aa)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(601);

    const borderBottom = this.add.rectangle(cx, cy + 80 * scale, cam.width, 2 * scale, 0xcc55aa)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(601);

    const text = this.add.text(cx, cy, t('story.level3Intro') || 'THE ASHEN GORGE', {
      fontSize: `${Math.round(12 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8 * scale
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(602);

    this.tweens.add({
      targets: [bannerBg, borderTop, borderBottom, text],
      alpha: 1,
      duration: 300,
    });

    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: [bannerBg, borderTop, borderBottom, text],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          bannerBg.destroy();
          borderTop.destroy();
          borderBottom.destroy();
          text.destroy();
        }
      });
    });
  }

  private startShmupPhase(): void {
    if (this.warningTriggered) return;
    this.warningTriggered = true;

    // Force player into Dragon form
    if (this.player.formMachine.state !== FormState.DRAGON) {
      (this.player.formMachine as any).enterDragon();
    }

    // Play warning effects
    this.cameras.main.shake(1000, 0.01);
    this.cameras.main.flash(500, 255, 0, 0);

    // Stop follow and setup autoscroll positions
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1.4);
    
    // Warn player banner
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const scale = this.scale.width / 800;

    const bannerBg = this.add.rectangle(cx, cy, this.scale.width, 100 * scale, 0x000000, 0.8)
      .setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);
    const borderTop = this.add.rectangle(cx, cy - 50 * scale, this.scale.width, 2 * scale, 0xff0000)
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0);
    const borderBottom = this.add.rectangle(cx, cy + 50 * scale, this.scale.width, 2 * scale, 0xff0000)
      .setOrigin(0.5).setScrollFactor(0).setDepth(1001).setAlpha(0);
    
    const text = this.add.text(cx, cy, t('story.warningShmup') || 'WARNING: INDUSTRIAL DEFENSE ZONE DETECTED!\nAUTOSCROLL INITIATED', {
      fontSize: `${Math.round(16 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ff3333',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002).setAlpha(0);

    this.tweens.add({
      targets: [bannerBg, borderTop, borderBottom, text],
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 2500,
      onComplete: () => {
        bannerBg.destroy();
        borderTop.destroy();
        borderBottom.destroy();
        text.destroy();

        // Enable scrolling!
        this.scrollX = this.cameras.main.scrollX;
        this.playerScreenX = this.player.x - this.scrollX;
        this.playerScreenY = this.player.y;
        this.shmupStarted = true;
      }
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
      this.scene.start('TransitionScene23', {
        startPos: { x: 720, y: 650 },
        cardsCollected: this.tarotSystem?.collectedCards || [],
        mechaUnlocked: this.player.formMachine.isMechaUnlocked(),
        dragonUnlocked: this.player.formMachine.isDragonUnlocked()
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

    if (!this.shmupStarted) {
      // Quiet transition room logic
      if (this.player.active && this.player.alive) {
        if (this.player.x <= 80) {
          this.transitionToLevel2();
        }
        if (this.player.x >= 550) {
          this.startShmupPhase();
        }
      }
      
      // Let the camera follow them, keep scrollX bound
      this.scrollX = this.cameras.main.scrollX;
    } else {
      // Active SHMUP autoscroller phase
      if (this.player.active && this.player.alive && this.player.formMachine.state === FormState.DRAGON) {
        const dt = delta / 1000;

        // 1. Autoscroll horizontal camera
        if (!this.bossActive) {
          // Accelerate speed based on scrollX: starting at 210, ending at 280 near 7200
          const progress = Math.min(this.scrollX / 7200, 1);
          const currentSpeed = 210 + progress * 70; // 210 to 280 px/s
          this.scrollX += currentSpeed * dt;
          if (this.scrollX >= 7200) {
            this.scrollX = 7200;
            this.activateBoss();
          }
        }
        this.cameras.main.scrollX = this.scrollX;
        this.cameras.main.scrollY = 0;

        // 2. Read input to shift screen-relative positions
        const speed = 380; // fly speed
        
        // Horizontal control
        if (this.cursors.left.isDown || this.keyA.isDown) {
          this.playerScreenX -= speed * dt;
        } else if (this.cursors.right.isDown || this.keyD.isDown) {
          this.playerScreenX += speed * dt;
        }

        // Vertical control
        if (this.cursors.up.isDown || this.keyW.isDown) {
          this.playerScreenY -= speed * dt;
        } else if (this.cursors.down.isDown || this.keyS.isDown) {
          this.playerScreenY += speed * dt;
        }

        // Constrain inside viewport boundaries
        const cam = this.cameras.main;
        this.playerScreenX = Phaser.Math.Clamp(this.playerScreenX, 50, cam.width - 50);
        this.playerScreenY = Phaser.Math.Clamp(this.playerScreenY, 120, 680); // bound to corridor flight height

        // Force player position
        this.player.x = this.scrollX + this.playerScreenX;
        this.player.y = this.playerScreenY;

        // enforce the pushback crush/off-screen death (bypass invincibility to prevent getting stuck)
        if (this.playerScreenX <= 55) {
          this.player.isInvincible = false;
          this.player.takeDamage(100, 0);
        }

        // Force zero velocity during controlled flight to avoid drift
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocity(0, 0);
        }

        // Draw speed wind lines
        this.windLines.clear();
        if (!this.bossActive) {
          this.windLines.lineStyle(1.5, 0xffffff, 0.15);
          const wWidth = cam.width;
          for (let i = 0; i < 15; i++) {
            const seed = Math.sin(i * 452.12 + this.scrollX * 0.005) * 0.5 + 0.5;
            const xOffset = ((this.scrollX * (2.2 + i * 0.15)) % wWidth);
            const wx = this.scrollX + wWidth - xOffset;
            const wy = 120 + seed * (680 - 120);
            const wlen = 40 + seed * 80;
            this.windLines.lineBetween(wx, wy, wx + wlen, wy);
          }
        }

      } else if (this.player.active && this.player.alive) {
        // Reverted to human/mecha form.
        // Self-sabotage or energy loss! Let gravity drag player body down into the void.
        // In Level 3, falling below the corridor (y > 690) is fatal.
        if (this.player.y > 690) {
          this.player.takeDamage(100, 0);
        }
      }
    }

    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);
    this.updateBloom();
    this.updateVignettePulse();
    
    // Update active steam pipes & check steam hits
    this.steamPipes.forEach((pipe) => {
      pipe.update(time, delta);
      if (pipe.isSteamActive() && this.player && this.player.active && this.player.alive && this.shmupStarted) {
        const dx = Math.abs(this.player.x - pipe.x);
        if (dx < 20) {
          const inRange = pipe.isCeiling 
            ? (this.player.y >= pipe.y && this.player.y <= pipe.y + 180)
            : (this.player.y <= pipe.y && this.player.y >= pipe.y - 180);
          if (inRange) {
            if (this.time.now - this.lastSteamDamageTime > 300) {
              this.lastSteamDamageTime = this.time.now;
              this.playerScreenX -= 30;
              this.player.takeDamage(5, -1);
              // Spawn steam hit sparks
              const spark = this.add.rectangle(this.player.x, this.player.y, 4, 4, 0xff7f50);
              this.tweens.add({ targets: spark, alpha: 0, scale: 2, duration: 200, onComplete: () => spark.destroy() });
            }
          }
        }
      }
    });

    // Update laser gates
    this.laserGates.forEach((gate) => {
      gate.update();
    });

    // Spawn SHMUP enemy waves
    if (this.shmupStarted) {
      this.updateWaves();
    }
  }

  private updateParallax(): void {
    const cam = this.cameras.main;
    const camX = cam.scrollX;
    this.bgGorgeWalls.tilePositionX = camX * 0.06;
    this.bgGorgeStructures.tilePositionX = camX * 0.18;

    const w = this.scale.width;
    const h = this.scale.height;

    const desiredWidth = w * cam.zoom * 2.0;
    const desiredHeight = h * cam.zoom;

    if (this.bgGorgeSky) {
      this.bgGorgeSky.width = desiredWidth;
      this.bgGorgeSky.height = desiredHeight;
      this.bgGorgeSky.setScale(1.0 / cam.zoom);
      this.bgGorgeSky.y = (0 - cam.centerY) / cam.zoom + cam.centerY;
    }

    // Scroll the unique Reactor backdrop extremely slowly horizontally
    if (this.bgReactor) {
      const targetScreenX = w * 0.65 - camX * 0.03;
      const targetScreenY = h * 0.45;
      this.bgReactor.x = (targetScreenX - cam.centerX) / cam.zoom + cam.centerX;
      this.bgReactor.y = (targetScreenY - cam.centerY) / cam.zoom + cam.centerY;
      this.bgReactor.setScale(1.15 / cam.zoom);
    }

    if (this.bgGorgeWalls) {
      this.bgGorgeWalls.width = desiredWidth;
      this.bgGorgeWalls.height = desiredHeight;
      this.bgGorgeWalls.setScale(1.0 / cam.zoom);
      this.bgGorgeWalls.y = (180 - cam.centerY) / cam.zoom + cam.centerY;
    }

    if (this.bgGorgeStructures) {
      this.bgGorgeStructures.width = desiredWidth;
      this.bgGorgeStructures.height = desiredHeight;
      this.bgGorgeStructures.setScale(1.0 / cam.zoom);
      this.bgGorgeStructures.y = (240 - cam.centerY) / cam.zoom + cam.centerY;
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

    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as BaseEnemy;
      if (!e.active || e.health <= 0) return;

      if (Phaser.Geom.Intersects.RectangleToRectangle(slashBounds, e.getBounds())) {
        e.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, e.x, e.y);
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

    if (this.boss && this.boss.active) {
      this.boss.bullets.getChildren().forEach((bullet) => {
        const b = bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        if (
          b.x < cam.scrollX - 100 ||
          b.x > cam.scrollX + cam.width + 100
        ) {
          b.setActive(false);
          b.setVisible(false);
        }
      });
    }
  }

  private updateEmbers(delta: number): void {
    this.emberTimer += delta;
    if (this.emberTimer > 130) {
      this.emberTimer = 0;
      this.spawnAshEmber();
    }
  }

  private spawnAshEmber(): void {
    const cam = this.cameras.main;
    const rx = cam.scrollX + Phaser.Math.Between(0, cam.width);
    const ry = cam.scrollY + cam.height + 20;

    const ember = this.add.rectangle(rx, ry, Phaser.Math.Between(2, 4), Phaser.Math.Between(2, 4), 0x9b59b6); // purple ash embers
    ember.setDepth(15);
    ember.setAlpha(0.6);

    this.tweens.add({
      targets: ember,
      y: ry - Phaser.Math.Between(200, 500),
      x: rx - Phaser.Math.Between(50, 150), // drift left
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: Phaser.Math.Between(1500, 3000),
      onComplete: () => ember.destroy()
    });
  }

  private updateBloom(): void {
    this.player.combatSystem.bullets.getChildren().forEach((b) => {
      const bullet = b as Phaser.Physics.Arcade.Sprite;
      if (bullet.active) {
        this.bloom.add(bullet.x, bullet.y, 8, 0xff4400, 0.6);
      }
    });

    const state = this.player.formMachine.state;
    if (state === FormState.DRAGON) {
      this.bloom.add(this.player.x, this.player.y - 10, 14, 0xff0066, 0.4);
    }

    if (this.boss && this.boss.active) {
      this.bloom.add(this.boss.x, this.boss.y, 24, 0xff1166, 0.7);
    }

    this.bloom.update();
  }

  private updateVignettePulse(): void {
    if (!this.vignette) return;
    const hpRatio = this.player.health / this.player.maxHealth;
    let alpha = 0;

    if (hpRatio < 0.3) {
      alpha = 0.35 + 0.1 * Math.sin(Date.now() * 0.005);
      this.vignette.setFillStyle(0x880000, alpha);
    } else if (hpRatio < 0.5) {
      alpha = 0.15;
      this.vignette.setFillStyle(0x000000, alpha);
    }

    this.vignette.setAlpha(alpha);
  }

  private updateWaves(): void {
    this.waves.forEach((wave) => {
      if (this.spawnedWaves.has(wave.triggerX)) return;
      // Spawn wave when camera reaches triggerX
      if (this.scrollX + 600 >= wave.triggerX) {
        this.spawnedWaves.add(wave.triggerX);
        this.spawnWave(wave);
      }
    });
  }

  private spawnWave(wave: WaveDef): void {
    wave.enemies.forEach((def) => {
      const spawnX = wave.triggerX + def.x;
      const spawnY = def.y;

      let enemy: Phaser.Physics.Arcade.Sprite | null = null;

      if (def.type === 'sky-hunter') {
        enemy = new FlyingEnemy(this, spawnX, spawnY, this.player);
        enemy.setTint(0xcc55aa);
        enemy.setScale(0.8);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        enemy.setVelocityX(def.speedX ?? -120);
        if (def.pattern === 'sine') {
          enemy.setData('sineOffset', Math.random() * Math.PI * 2);
          enemy.setData('baseY', spawnY);
        }
      } else if (def.type === 'bone-serpent') {
        enemy = this.physics.add.sprite(spawnX, spawnY, 'bullet-fire');
        enemy.setTint(0xff88ff);
        enemy.setScale(1.6);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        (enemy.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
        enemy.setVelocityX(def.speedX ?? -240);
        // Custom simple serpent logic
        enemy.setData('serpent', true);
        enemy.setData('damage', 15);
      } else if (def.type === 'spitter') {
        // Platform turret
        enemy = new SpitterEnemy(this, spawnX, spawnY, this.player);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        (enemy.body as Phaser.Physics.Arcade.Body).setImmovable(true);
      } else if (def.type === 'seeker-drone') {
        enemy = new SeekerDrone(this, spawnX, spawnY, this.player);
      } else if (def.type === 'mine-dropper') {
        enemy = new MineDropper(this, spawnX, spawnY, this.player);
      } else if (def.type === 'gunship') {
        enemy = new HeavyGunship(this, spawnX, spawnY, this.player);
      }

      if (enemy) {
        this.enemies.add(enemy);
      }
    });
  }

  public addEnemyObject(obj: Phaser.Physics.Arcade.Sprite): void {
    this.enemies.add(obj);
  }

  public addPickupObject(obj: Phaser.Physics.Arcade.Sprite): void {
    this.energyPickups.add(obj);
  }

  private activateBoss(): void {
    if (this.bossActive) return;
    this.bossActive = true;

    // Play Boss warning text
    const cam = this.cameras.main;
    const cx = cam.scrollX + cam.width / 2;
    const cy = 200;

    const alertText = this.add.text(cx, cy, t('story.bossAlert') || 'BOSS ALERT', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#cc0055',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

    this.tweens.add({
      targets: alertText,
      scaleX: 1.2,
      scaleY: 1.2,
      yoyo: true,
      repeat: 4,
      duration: 300,
      onComplete: () => alertText.destroy()
    });

    // Spawn Boss at the right of the screen
    this.boss = new Boss(this, this.scrollX + cam.width - 250, 400, this.player);
    this.enemies.add(this.boss);
    this.boss.activate();

    // Modify die method of Boss to trigger Level 3 victory
    const originalDie = (this.boss as any).die.bind(this.boss);
    (this.boss as any).die = () => {
      originalDie();
      this.triggerLevel3Victory();
    };

    // Override Boss bullets overlap handler
    this.physics.add.overlap(this.player, this.boss.bullets, (_player, _bullet) => {
      const b = _bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      b.destroy();
      this.playerScreenX -= 60; // pushback penalty
      this.player.takeDamage(12, -1);
    });
  }

  private triggerLevel3Victory(): void {
    if (this.demoEnded) return;
    this.demoEnded = true;

    this.player.setVelocity(0, 0);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    this.cameras.main.fade(2000, 0, 0, 0);

    this.time.delayedCall(2000, () => {
      const cam = this.cameras.main;
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      const scale = cam.width / 800;

      this.add.rectangle(0, 0, cam.width * 2, cam.height * 2, 0x000000)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1000);

      const titleText = this.add.text(cx, cy, t('ui.prototypeComplete') + '\n\n' + t('story.demoEndPrompt'), {
        fontSize: `${Math.round(20 * scale)}px`,
        fontFamily: 'monospace',
        color: '#ff3388',
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
        duration: 2500,
        ease: 'Power2',
      });
    });
  }

  triggerDramaticDeath(player: Player): void {
    // 1. Stop all normal BGM and play tragic death theme
    this.gameAudio?.stopBGM();
    this.gameAudio?.playDeathTheme();

    // Play a mecha crash alarm / falling sound (descending pitch siren)
    if (this.gameAudio && (this.gameAudio as any).ctx) {
      const ctx = (this.gameAudio as any).ctx as AudioContext;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(80, t + 1.5);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect((this.gameAudio as any).sfxGainNode || ctx.destination);
      
      osc.start(t);
      osc.stop(t + 1.6);
    }

    // Force player texture, scale, and state to Dragon for the death sequence
    player.formMachine.unlockTransform();
    player.formMachine.unlockDragon();
    (player.formMachine as any).currentState = FormState.DRAGON;
    player.setTexture('player-dragon');
    player.setScale(1.45);
    player.angle = 0;

    const cam = this.cameras.main;
    // Pull the player into the center X-wise and visible Y-wise
    const targetScreenX = cam.width * 0.45;
    const targetScreenY = Phaser.Math.Clamp(player.y + 80, 240, 500);
    const targetWorldX = this.scrollX + targetScreenX;

    // 2. Crash flight tween (derribo)
    this.tweens.add({
      targets: player,
      x: targetWorldX,
      y: targetScreenY,
      angle: player.angle - 360, // spin
      duration: 1500,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        if (!player.active) return;
        // trailing fire
        const fire = this.add.rectangle(player.x, player.y, Phaser.Math.Between(8, 16), Phaser.Math.Between(8, 16), 0xff4400);
        fire.setBlendMode(Phaser.BlendModes.ADD);
        fire.setDepth(player.depth + 1);
        this.tweens.add({
          targets: fire,
          x: fire.x + Phaser.Math.Between(-50, -10) - 20,
          y: fire.y + Phaser.Math.Between(-15, 15),
          alpha: 0,
          scale: 0.1,
          duration: 350,
          onComplete: () => fire.destroy()
        });

        // trailing smoke
        const smoke = this.add.rectangle(player.x, player.y, Phaser.Math.Between(6, 12), Phaser.Math.Between(6, 12), 0x222225);
        smoke.setAlpha(0.6);
        smoke.setDepth(player.depth - 1);
        this.tweens.add({
          targets: smoke,
          x: smoke.x + Phaser.Math.Between(-60, -20) - 10,
          y: smoke.y - Phaser.Math.Between(5, 25),
          alpha: 0,
          scale: 1.6,
          duration: 550,
          onComplete: () => smoke.destroy()
        });
      },
      onComplete: () => {
        if (!player.active) return;

        // 3. Core shatter explosion upon landing/impact at target
        this.gameAudio?.playCoreShatter();
        spawnDeathExplosion(this, player.x, player.y);

        // 4. Lightning Strike (400ms delay after crash ends)
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
          const endY = player.y;

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

          this.tweens.add({
            targets: lightning,
            alpha: 0,
            duration: 350,
            onComplete: () => lightning.destroy()
          });

          // Disintegrate player
          this.tweens.add({
            targets: player,
            alpha: 0,
            duration: 2000,
            onComplete: () => player.setVisible(false)
          });

          // Disintegration particles
          this.time.addEvent({
            delay: 40,
            repeat: 40,
            callback: () => {
              if (!player.active) return;
              const px = player.x + Phaser.Math.Between(-16, 16);
              const py = player.y + Phaser.Math.Between(-16, 16);
              const tx = px - Phaser.Math.Between(20, 80);
              const ty = py - Phaser.Math.Between(30, 90);
              const isEmber = Math.random() < 0.25;
              const color = isEmber ? 0xff4411 : 0x222225;
              const p = this.add.rectangle(px, py, Phaser.Math.Between(3, 7), Phaser.Math.Between(3, 7), color);
              if (isEmber) p.setBlendMode(Phaser.BlendModes.ADD);

              this.tweens.add({
                targets: p,
                x: tx,
                y: ty,
                alpha: 0,
                scale: 0.1,
                duration: Phaser.Math.Between(800, 1600),
                onComplete: () => p.destroy()
              });
            }
          });
        });

        // 5. Final fade and restart (3s delay after crash ends)
        this.time.delayedCall(3000, () => {
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
    });
  }

  private createDecorations(): void {
    // Spawn floating gorge debris drifting in the background
    // Since it's a shmup, these represent volcanic ejecta and rubble floating in the gorge
    const count = 35;
    for (let i = 0; i < count; i++) {
      const rx = Phaser.Math.Between(100, LEVEL_WIDTH - 200);
      const ry = Phaser.Math.Between(100, LEVEL_HEIGHT - 100);
      const texture = Math.random() > 0.5 ? 'prop-debris-1' : 'prop-debris-2';
      
      const debris = this.add.image(rx, ry, texture);
      debris.setDepth(Phaser.Math.Between(-25, -5)); // scatter depths
      
      // Determine scroll factor depending on depth (closer debris moves faster)
      const depthFactor = (debris.depth + 30) / 30; // 0.16 to 0.83
      const scrollFactorX = 0.05 + depthFactor * 0.15; // 0.07 to 0.17
      debris.setScrollFactor(scrollFactorX, 0);
      
      debris.setScale(0.5 + depthFactor * 0.8); // closer is larger
      debris.setAlpha(0.3 + depthFactor * 0.6); // closer is more opaque

      // Slow drift & spin
      this.tweens.add({
        targets: debris,
        angle: 360 * (Math.random() > 0.5 ? 1 : -1),
        y: ry + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(10000, 30000),
        repeat: -1,
        yoyo: true,
        ease: 'Linear'
      });
    }
  }
}

class PistonHazard extends Phaser.Physics.Arcade.Sprite {
  private rod: Phaser.GameObjects.TileSprite;
  public isCeiling: boolean;
  private startY: number;
  private travelDist: number;

  constructor(scene: Phaser.Scene, x: number, y: number, isCeiling: boolean) {
    super(scene, x, isCeiling ? y - 48 : y + 48, 'hazard-piston');
    this.isCeiling = isCeiling;
    this.startY = this.y;
    this.travelDist = 200; // punch distance

    this.rod = scene.add.tileSprite(x, isCeiling ? y - 96 : y + 96, 16, 192, 'hazard-piston-rod');
    this.rod.setOrigin(0.5, isCeiling ? 0 : 1);
    this.rod.setDepth(this.depth - 1);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.allowGravity = false;

    scene.tweens.add({
      targets: [this],
      y: isCeiling ? this.startY + this.travelDist : this.startY - this.travelDist,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      hold: 800,
      repeatDelay: 800,
      ease: 'Quad.easeInOut',
      onUpdate: () => {
        if (!this.active) return;
        if (this.isCeiling) {
          this.rod.height = this.y - y;
        } else {
          this.rod.height = y - this.y;
          this.rod.y = y;
        }
      }
    });
  }

  destroy(fromScene?: boolean) {
    if (this.rod && this.rod.active) this.rod.destroy();
    super.destroy(fromScene);
  }
}

class LaserGateNode extends Phaser.Physics.Arcade.Sprite {
  public health = 40;
  public maxHealth = 40;
  private hpBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hazard-laser-node');
    scene.add.existing(this);
    scene.physics.add.existing(this); // dynamic body
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.allowGravity = false;
    this.hpBar = scene.add.graphics();
    this.updateHpBar();
  }

  takeDamage(amount: number): boolean {
    if (this.health <= 0) return false;
    this.health -= amount;
    this.setTint(0xff0000);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    this.updateHpBar();

    if (this.health <= 0) {
      this.explode();
      return true;
    }
    return false;
  }

  private updateHpBar() {
    this.hpBar.clear();
    if (this.health <= 0) return;
    const pct = this.health / this.maxHealth;
    this.hpBar.fillStyle(0x000000, 0.7);
    this.hpBar.fillRect(this.x - 12, this.y - 20, 24, 4);
    this.hpBar.fillStyle(0xff3f34, 1.0);
    this.hpBar.fillRect(this.x - 12, this.y - 20, 24 * pct, 4);
  }

  private explode() {
    for (let i = 0; i < 8; i++) {
      const spark = this.scene.add.rectangle(this.x, this.y, 4, 4, 0xff7f50);
      this.scene.physics.add.existing(spark);
      (spark.body as Phaser.Physics.Arcade.Body).setVelocity(
        Phaser.Math.Between(-80, 80),
        Phaser.Math.Between(-80, 80)
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        onComplete: () => spark.destroy()
      });
    }
    this.hpBar.destroy();
    this.destroy();
  }

  destroy(fromScene?: boolean) {
    this.hpBar.destroy();
    super.destroy(fromScene);
  }
}

class LaserGate extends Phaser.GameObjects.Container {
  public nodeTop: LaserGateNode;
  public nodeBottom: LaserGateNode;
  public beam: Phaser.GameObjects.TileSprite;
  public activeBeam = true;

  constructor(scene: Phaser.Scene, x: number) {
    super(scene, x, 0);
    scene.add.existing(this);

    this.nodeTop = new LaserGateNode(scene, x, 112);
    this.nodeBottom = new LaserGateNode(scene, x, 688);

    this.beam = scene.add.tileSprite(x, 400, 16, 544, 'hazard-laser-beam');
    this.beam.setDepth(this.nodeTop.depth - 1);
    this.beam.setBlendMode(Phaser.BlendModes.ADD);

    scene.physics.add.existing(this.beam, true);
    
    scene.tweens.add({
      targets: this.beam,
      alpha: 0.4,
      duration: 100,
      yoyo: true,
      repeat: -1
    });
  }

  update() {
    if (this.activeBeam && (!this.nodeTop.active || !this.nodeBottom.active)) {
      this.activeBeam = false;
      this.beam.destroy();
      (this.scene as any).gameAudio?.playDestruction();
    }
  }
}

class SteamPipeHazard extends Phaser.Physics.Arcade.Sprite {
  public isCeiling: boolean;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private steamActive = false;
  private timer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, isCeiling: boolean) {
    super(scene, x, isCeiling ? y + 16 : y - 16, 'steam-vent');
    this.isCeiling = isCeiling;
    if (!isCeiling) {
      this.setFlipY(true);
    }
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    // Steam particle emitter
    const particles = scene.add.particles(0, 0, 'bullet-fire', {
      x: x,
      y: isCeiling ? this.y + 16 : this.y - 16,
      speed: { min: 180, max: 280 },
      angle: isCeiling ? 90 : 270,
      scale: { start: 0.8, end: 1.8 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      frequency: -1, // manual explosion only
      blendMode: 'ADD',
      tint: 0xff7f50
    });
    this.emitter = particles;
    this.emitter.setDepth(this.depth - 1);
  }

  update(time: number, delta: number) {
    this.timer += delta;
    if (this.timer > 2000) {
      this.timer = 0;
      this.steamActive = !this.steamActive;
      if (this.steamActive) {
        this.emitter?.start();
      } else {
        this.emitter?.stop();
      }
    }
  }

  isSteamActive(): boolean {
    return this.steamActive;
  }

  destroy(fromScene?: boolean) {
    this.emitter?.destroy();
    super.destroy(fromScene);
  }
}

class SeekerDrone extends FlyingEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, player);
    this.setTexture('enemy-seeker-drone');
    this.setScale(1.0);
    this.health = 25;
    this.maxHealth = 25;
    this.moveSpeed = 70;
    this.detectRange = 550;
    this.attackRange = 450;
    this.attackDamage = 10;
    this.attackCooldown = 2500;
  }

  protected doAttack(): void {
    if (!this.active || this.health <= 0) return;
    const missile = new HomingMissile(this.scene, this.x, this.y, this.player);
    (this.scene as GameScene3).addEnemyObject(missile);
  }
}

class HomingMissile extends Phaser.Physics.Arcade.Sprite {
  public health = 1;
  private player: Player;
  private speed = 190;
  private turnSpeed = 0.04;
  private vx = 0;
  private vy = 0;
  private lifeTimer = 0;
  public attackDamage = 10;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'bullet-homing');
    this.player = player;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (this.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
    
    this.vx = -this.speed;
    this.vy = 0;
    this.setVelocity(this.vx, this.vy);
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    this.lifeTimer += delta;
    if (this.lifeTimer > 4000) {
      this.explode();
      return;
    }

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, this.turnSpeed);
    
    this.vx = Math.cos(newAngle) * this.speed;
    this.vy = Math.sin(newAngle) * this.speed;

    this.setVelocity(this.vx, this.vy);
    this.setRotation(newAngle);

    if (Math.random() < 0.4) {
      const smoke = this.scene.add.rectangle(this.x - Math.cos(newAngle) * 8, this.y - Math.sin(newAngle) * 8, 3, 3, 0xffa502);
      this.scene.tweens.add({
        targets: smoke,
        alpha: 0,
        scale: 0.1,
        duration: 250,
        onComplete: () => smoke.destroy()
      });
    }
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.explode();
    }
  }

  public explode() {
    for (let i = 0; i < 4; i++) {
      const spark = this.scene.add.rectangle(this.x, this.y, 3, 3, 0xff7f50);
      this.scene.physics.add.existing(spark);
      (spark.body as Phaser.Physics.Arcade.Body).setVelocity(
        Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(-50, 50)
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy()
      });
    }
    this.destroy();
  }
}

class MineDropper extends FlyingEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, player);
    this.setTexture('enemy-mine-dropper');
    this.setScale(1.0);
    this.health = 30;
    this.maxHealth = 30;
    this.moveSpeed = 40;
    this.detectRange = 600;
    this.attackRange = 500;
    this.attackCooldown = 1800;
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    const targetY = 140;
    const dy = targetY - this.y;
    body.setVelocityY(dy * 2);
    body.setVelocityX(-this.moveSpeed);

    if (time - this.lastAttackTime > this.attackCooldown) {
      this.lastAttackTime = time;
      this.doAttack();
    }
  }

  protected doAttack(): void {
    if (!this.active || this.health <= 0) return;
    const mine = new DriftMine(this.scene, this.x, this.y + 20, this.player);
    (this.scene as GameScene3).addEnemyObject(mine);
  }
}

class DriftMine extends Phaser.Physics.Arcade.Sprite {
  public health = 1;
  private player: Player;
  private driftSpeed = 80;
  private lifeTimer = 0;
  public attackDamage = 15;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'bullet-mine');
    this.player = player;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    this.setVelocity(-30, this.driftSpeed);
    
    scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.active) return;

    this.lifeTimer += delta;
    if (this.lifeTimer > 6000) {
      this.destroy();
    }
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.explode();
    }
  }

  public explode() {
    (this.scene as any).gameAudio?.playDestruction();
    
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    if (dist < 80) {
      this.player.takeDamage(this.attackDamage, this.player.x < this.x ? -1 : 1);
    }

    for (let i = 0; i < 10; i++) {
      const spark = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-8, 8),
        this.y + Phaser.Math.Between(-8, 8),
        4, 4, 0xfdcb6e
      );
      this.scene.physics.add.existing(spark);
      (spark.body as Phaser.Physics.Arcade.Body).setVelocity(
        Phaser.Math.Between(-120, 120),
        Phaser.Math.Between(-120, 120)
      );
      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        scale: 0.1,
        duration: 400,
        onComplete: () => spark.destroy()
      });
    }

    this.destroy();
  }
}

class HeavyGunship extends FlyingEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, player);
    this.setTexture('enemy-gunship');
    this.setScale(1.0);
    this.health = 110;
    this.maxHealth = 110;
    this.moveSpeed = 50;
    this.detectRange = 600;
    this.attackRange = 500;
    this.attackCooldown = 2000;
    this.attackDamage = 12;
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    body.setVelocityX(-this.moveSpeed);
    body.setVelocityY(Math.sin(time * 0.002) * 40);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    if (dist <= this.attackRange && time - this.lastAttackTime > this.attackCooldown) {
      this.lastAttackTime = time;
      this.doAttack();
    }
  }

  protected doAttack(): void {
    if (!this.active || this.health <= 0) return;

    const bulletSpeed = 220;
    const angles = [-0.2, 0, 0.2];

    angles.forEach((angleOffset) => {
      const bullet = this.scene.physics.add.sprite(this.x - 20, this.y, 'bullet-fire');
      bullet.setTint(0xff3300);
      bullet.setScale(1.2);
      bullet.setBlendMode(Phaser.BlendModes.ADD);

      const body = bullet.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;

      const dx = this.player.x - this.x;
      const dy = this.player.y - this.y;
      const baseAngle = Math.atan2(dy, dx);
      const angle = baseAngle + angleOffset;

      bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

      this.scene.physics.add.overlap(this.player, bullet, () => {
        if (!bullet.active) return;
        bullet.destroy();
        this.player.takeDamage(this.attackDamage, this.player.x < this.x ? -1 : 1);
      });

      this.scene.time.delayedCall(3000, () => {
        if (bullet.active) bullet.destroy();
      });
    });
  }

  die(): void {
    super.die();
    for (let i = 0; i < 3; i++) {
      const pickup = new EnergyPickup(this.scene, this.x + Phaser.Math.Between(-30, 30), this.y + Phaser.Math.Between(-30, 30));
      (this.scene as GameScene3).addPickupObject(pickup);
    }
  }
}
