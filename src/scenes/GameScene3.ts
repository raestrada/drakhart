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
import { spawnHitParticles } from '../effects/Particles';
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
  type: 'sky-hunter' | 'bone-serpent' | 'spitter';
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

export class GameScene3 extends Phaser.Scene {
  public gameAudio!: GameAudio;
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.StaticGroup;
  private energyPickups!: Phaser.Physics.Arcade.StaticGroup;
  private boss: Boss | null = null;
  private tarotSystem!: TarotSystem;

  private bgGorgeSky!: Phaser.GameObjects.TileSprite;
  private bgGorgeWalls!: Phaser.GameObjects.TileSprite;
  private bgGorgeStructures!: Phaser.GameObjects.TileSprite;
  private bgReactor!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;
  private emberTimer = 0;

  // Autoscroll & coordinates
  private scrollX = 0;
  private scrollSpeed = 165; // speed of autoscroll
  private playerScreenX = 200; // start 200px from left
  private playerScreenY = 400; // start center vertical
  private autoFireTimer = 0;
  private autoFireInterval = 110; // dragon fire speed

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

  init(data?: { startPos?: { x: number; y: number }; cardsCollected?: string[] }): void {
    if (data) {
      if (data.startPos) {
        this.pendingSpawnX = data.startPos.x;
        this.pendingSpawnY = data.startPos.y;
      }
      if (data.cardsCollected) {
        this.pendingCardsToCollect = data.cardsCollected;
      }
    }
  }

  create(): void {
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

    this.events.once('shutdown', () => {
      this.gameAudio.stopBGM();
    });
    this.events.once('destroy', () => {
      this.gameAudio.stopBGM();
    });

    this.createParallax();
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
    
    // Force player immediately into Dragon form
    this.player.formMachine.unlockTransform();
    this.player.formMachine.unlockDragon();
    (this.player.formMachine as any).enterDragon();
    this.player.formMachine.energy.addEnergy(100); // start full

    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);
    this.playerScreenX = this.pendingSpawnX;
    this.playerScreenY = this.pendingSpawnY;

    this.enemies = this.physics.add.group();
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

    const platforms: PlatformDef[] = [
      // === CEILINGS (0 to 8000) ===
      { x: 0, y: 0, width: 8000, height: 96, texture: 'tile-lava-ground' },

      // === FLOORS (0 to 8000) ===
      { x: 0, y: 704, width: 8000, height: 96, texture: 'tile-lava-ground' },

      // === SECTION 1: Narrow Gorge Entry (0-2000) ===
      // Clear path initially. First obstacle appears at 1800.
      { x: 1800, y: 350, width: 160, height: 120, texture: 'tile-lava-ground' },

      // === SECTION 2: Refinery Maze (2000-4500) ===
      { x: 2200, y: 300, width: 256, height: 96, texture: 'tile-lava-ground' },
      { x: 2600, y: 96, width: 160, height: 256, texture: 'tile-lava-ground' }, // top divider wall
      { x: 2600, y: 450, width: 160, height: 254, texture: 'tile-lava-ground' }, // bottom divider wall
      { x: 3100, y: 200, width: 192, height: 96, texture: 'tile-lava-ground' },
      { x: 3500, y: 450, width: 192, height: 96, texture: 'tile-lava-ground' },
      { x: 4000, y: 300, width: 256, height: 120, texture: 'tile-lava-ground' },

      // === SECTION 3: Obsidian Gates (4500-6800) ===
      { x: 4600, y: 96, width: 192, height: 300, texture: 'tile-lava-ground' },
      { x: 5000, y: 400, width: 192, height: 304, texture: 'tile-lava-ground' },
      { x: 5400, y: 280, width: 256, height: 120, texture: 'tile-lava-ground' },
      { x: 5900, y: 96, width: 160, height: 300, texture: 'tile-lava-ground' },
      { x: 6300, y: 400, width: 160, height: 304, texture: 'tile-lava-ground' },
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
        triggerX: 1800,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 250, speedX: -100, pattern: 'sine' },
          { type: 'sky-hunter', x: 80, y: 300, speedX: -100, pattern: 'sine' },
          { type: 'sky-hunter', x: 160, y: 350, speedX: -100, pattern: 'sine' },
        ]
      },
      {
        triggerX: 2500,
        enemies: [
          { type: 'bone-serpent', x: 0, y: 400, speedX: -260 },
          { type: 'bone-serpent', x: 100, y: 200, speedX: -260 },
          { type: 'spitter', x: 50, y: 550 }
        ]
      },
      {
        triggerX: 3200,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 200, speedX: -120 },
          { type: 'sky-hunter', x: 60, y: 250, speedX: -120 },
          { type: 'sky-hunter', x: 120, y: 300, speedX: -120 },
          { type: 'sky-hunter', x: 180, y: 350, speedX: -120 }
        ]
      },
      {
        triggerX: 3900,
        enemies: [
          { type: 'spitter', x: 0, y: 150 },
          { type: 'spitter', x: 120, y: 550 },
          { type: 'bone-serpent', x: 200, y: 360, speedX: -300 }
        ]
      },
      {
        triggerX: 4600,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 220, speedX: -130, pattern: 'sine' },
          { type: 'sky-hunter', x: 80, y: 380, speedX: -130, pattern: 'sine' },
          { type: 'bone-serpent', x: 120, y: 300, speedX: -280 }
        ]
      },
      {
        triggerX: 5300,
        enemies: [
          { type: 'spitter', x: 0, y: 400 },
          { type: 'sky-hunter', x: 50, y: 200, speedX: -110 },
          { type: 'sky-hunter', x: 150, y: 500, speedX: -110 }
        ]
      },
      {
        triggerX: 6000,
        enemies: [
          { type: 'bone-serpent', x: 0, y: 200, speedX: -320 },
          { type: 'bone-serpent', x: 80, y: 320, speedX: -320 },
          { type: 'bone-serpent', x: 160, y: 440, speedX: -320 }
        ]
      },
      {
        triggerX: 6600,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 250, speedX: -150, pattern: 'sine' },
          { type: 'sky-hunter', x: 60, y: 300, speedX: -150, pattern: 'sine' },
          { type: 'sky-hunter', x: 120, y: 350, speedX: -150, pattern: 'sine' },
          { type: 'spitter', x: 80, y: 150 }
        ]
      }
    ];
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);
    this.cameras.main.setZoom(1.4); // CAMERA_ZOOM_DRAGON
  }

  private setupCollisions(): void {
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
      const enemy = _enemy as BaseEnemy;
      if (!enemy.active || enemy.health <= 0) return;

      if (this.player.formMachine.state === FormState.DRAGON) {
        // Heavy pushback to the left on hit
        this.playerScreenX -= 65;
        this.player.takeDamage(enemy.attackDamage, -1);
      } else {
        // Warrior gets knocked back normally
        const knockDir = this.player.x < enemy.x ? -1 : 1;
        this.player.takeDamage(enemy.attackDamage, knockDir);
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

  update(time: number, delta: number): void {
    if (this.isCutsceneActive) return;

    if (this.player && this.player.active) {
      this.gameAudio?.update(this.player.x);
    }

    if (this.player.active && this.player.alive && this.player.formMachine.state === FormState.DRAGON) {
      const dt = delta / 1000;

      // 1. Autoscroll horizontal camera
      if (!this.bossActive) {
        this.scrollX += this.scrollSpeed * dt;
        if (this.scrollX >= 7200) {
          this.scrollX = 7200;
          this.activateBoss();
        }
      }
      this.cameras.main.scrollX = this.scrollX;
      this.cameras.main.scrollY = 0;

      // 2. Read input to shift screen-relative positions
      const speed = 260; // fly speed
      
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

      // 3. Shmup auto-fire
      this.autoFireTimer += delta;
      if (this.autoFireTimer >= this.autoFireInterval) {
        this.autoFireTimer = 0;
        this.player.combatSystem.fireBreathAuto(true);
      }

    } else if (this.player.active && this.player.alive) {
      // Reverted to human/mecha form (or dead).
      // Self-sabotage or energy loss! Let gravity drag player body down into the void
      if (this.player.y > LEVEL_HEIGHT + 60) {
        this.player.takeDamage(100, 0);
      }
    }

    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);
    
    // Spawn SHMUP enemy waves
    this.updateWaves();
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
      }

      if (enemy) {
        this.enemies.add(enemy);
      }
    });
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

    const cam = this.cameras.main;
    // Crash targets: pull the player back to the screen (around 220px from left) and fall down
    const targetScreenX = 220;
    const targetScreenY = Phaser.Math.Clamp(player.y + 120, 150, 700);
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

        for (let i = 0; i < 35; i++) {
          const px = player.x;
          const py = player.y;
          const sparkColor = Phaser.Math.Between(0, 1) ? 0xff3300 : 0xffaa00;
          const size = Phaser.Math.Between(4, 10);
          const spark = this.add.rectangle(px, py, size, size, sparkColor);
          spark.setBlendMode(Phaser.BlendModes.ADD);

          const angle = Math.random() * Math.PI * 2;
          const speed = Phaser.Math.Between(50, 250);
          const targetX = px + Math.cos(angle) * speed * 0.6;
          const targetY = py + Math.sin(angle) * speed * 0.6;

          this.tweens.add({
            targets: spark,
            x: targetX,
            y: targetY,
            alpha: 0,
            scale: 0.2,
            angle: Phaser.Math.Between(-180, 180),
            duration: Phaser.Math.Between(600, 1200),
            ease: 'Quad.easeOut',
            onComplete: () => spark.destroy()
          });
        }

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
            this.scene.restart();
          });
        });
      }
    });
  }
}
