import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DragonCore } from '../entities/DragonCore';
import { SkyCore } from '../entities/SkyCore';
import { TarotCard } from '../entities/TarotCard';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { Boss } from '../entities/enemies/Boss';
import { Barricade } from '../entities/Barricade';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { FormState } from '../systems/FormStateMachine';
import { ShmupSystem } from '../systems/ShmupSystem';
import { TarotSystem } from '../systems/TarotSystem';
import { saveGame, loadGame } from '../systems/SaveSystem';
import {
  spawnHitParticles,
  spawnDeathExplosion,
} from '../effects/Particles';
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
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemies!: Phaser.Physics.Arcade.Group;
  private barricades!: Phaser.Physics.Arcade.StaticGroup;
  private dragonCore!: DragonCore;
  private skyCore!: SkyCore;
  private boss!: Boss;
  private bossTriggered = false;
  private shmupSystem!: ShmupSystem;
  private tarotSystem!: TarotSystem;

  private bgMountains!: Phaser.GameObjects.TileSprite;
  private bgForest!: Phaser.GameObjects.TileSprite;
  private bgRuins!: Phaser.GameObjects.TileSprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private emberTimer = 0;

  private shmupZoneActive = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    this.createParallax();
    this.createLevel();
    this.tarotSystem = new TarotSystem();

    const saveData = loadGame();
    if (saveData) {
      this.restoreSave(saveData);
    }

    this.createPlayer();
    this.player.tarotSystem = this.tarotSystem;
    this.player.setPosition(this.pendingSpawnX, this.pendingSpawnY);
    if (this.pendingMechaUnlock) this.player.formMachine.unlockTransform();
    if (this.pendingDragonUnlock) this.player.formMachine.unlockDragon();
    this.createEnemies();
    this.createDragonCore();
    this.createSkyCore();
    this.createBarricades();
    this.createBoss();
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

    // Add star-filled sky gradient as a tiling parallax layer
    this.add.tileSprite(0, 0, LEVEL_WIDTH, 480, 'bg-sky')
      .setOrigin(0, 0)
      .setScrollFactor(0.05, 0)
      .setDepth(-30);

    this.bgMountains = this.add
      .tileSprite(0, 360, this.scale.width * 1.5, 140, 'bg-mountains')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-20);

    this.bgForest = this.add
      .tileSprite(0, 390, this.scale.width * 1.5, 100, 'bg-forest')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-15);

    this.bgRuins = this.add
      .tileSprite(0, 410, this.scale.width * 1.5, 80, 'bg-ruins')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);
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

    const platforms: PlatformDef[] = [
      // --- PART 1: Ashen Woods (0 - 1400) ---
      { x: 0, y: LEVEL_HEIGHT - 32, width: 1400, height: 64 },

      // Agility Passage: low ceiling blocks Mecha
      { x: 800, y: 560, width: 250, height: 140 },

      // Platforms to climb to Dragon Core altar
      { x: 1050, y: 690, width: 80, height: 16 },
      { x: 1150, y: 620, width: 90, height: 16 },
      { x: 1240, y: 550, width: 120, height: 16 },

      // --- PART 2: Iron Bastion (1400 - 2200) ---
      { x: 1400, y: LEVEL_HEIGHT - 32, width: 800, height: 64 },

      // Ruins platforms
      { x: 1520, y: 680, width: 120, height: 16 },
      { x: 1660, y: 600, width: 100, height: 16 },
      { x: 1800, y: 680, width: 120, height: 16 },
      { x: 1950, y: 620, width: 100, height: 16 },

      // Sky Core platform
      { x: 2050, y: 520, width: 160, height: 16 },

      // --- PART 3: Flight Training (2200 - 2900) ---
      { x: 2200, y: LEVEL_HEIGHT - 32, width: 700, height: 64 },
      { x: 2250, y: 440, width: 80, height: 16 },
      { x: 2420, y: 360, width: 80, height: 16 },
      { x: 2600, y: 440, width: 80, height: 16 },
      { x: 2750, y: 500, width: 100, height: 16 },

      // --- PART 4: Storm Canyon / Shmup zone (2900 - 4500) ---
      // Ground drops away — bottomless chasm
      // Floating islands for rest points
      { x: 3400, y: 400, width: 120, height: 16 },
      { x: 3600, y: 350, width: 120, height: 16 },
      { x: 3900, y: 420, width: 100, height: 16 },
      { x: 4100, y: 370, width: 100, height: 16 },

      // --- Boss area (4500 - 5000) ---
      { x: 4500, y: LEVEL_HEIGHT - 32, width: 500, height: 64 },
      { x: 4600, y: 600, width: 100, height: 16 },
      { x: 4750, y: 550, width: 100, height: 16 },
    ];

    platforms.forEach((p) => {
      const isGround = p.height > 32;
      const textureKey = isGround ? 'tile-ground' : 'tile-platform';
      const tileW = isGround ? 32 : 32;
      const tileH = isGround ? 32 : 16;

      for (let tx = p.x; tx < p.x + p.width; tx += tileW) {
        for (let ty = p.y; ty < p.y + p.height; ty += tileH) {
          const tile = this.platforms.create(tx + tileW / 2, ty + tileH / 2, textureKey);
          if (!isGround) {
            (tile.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
          }
        }
      }
    });
  }

  private createEnemies(): void {
    this.enemies = this.physics.add.group();

    // Ashen Woods — tutorial enemies
    const e1 = new BaseEnemy(this, 300, 700, 'enemy-sentry', this.player);
    const e2 = new BaseEnemy(this, 550, 700, 'enemy-sentry', this.player);
    const e3 = new BaseEnemy(this, 700, 500, 'enemy-sentry', this.player);

    // Iron Bastion — heavy enemies
    const e4 = new BaseEnemy(this, 1550, 700, 'enemy-sentry', this.player,
      { health: 80, damage: 18, speed: 50 });
    const e5 = new BaseEnemy(this, 1800, 700, 'enemy-sentry', this.player,
      { health: 80, damage: 18, speed: 50 });
    const e6 = new BaseEnemy(this, 2000, 650, 'enemy-sentry', this.player,
      { health: 80, damage: 18, speed: 50 });

    // Flight training zone — flying enemies
    const fe1 = new FlyingEnemy(this, 2300, 300, this.player);
    const fe2 = new FlyingEnemy(this, 2500, 250, this.player);
    const fe3 = new FlyingEnemy(this, 2700, 350, this.player);

    this.enemies.addMultiple([e1, e2, e3, e4, e5, e6, fe1, fe2, fe3]);
  }

  private createDragonCore(): void {
    this.dragonCore = new DragonCore(this, 1300, 500);
  }

  private createSkyCore(): void {
    this.skyCore = new SkyCore(this, 2100, 480);
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
      // Will be applied after player creation
      this.pendingMechaUnlock = true;
    }
    if (data.dragonUnlocked) {
      this.pendingDragonUnlock = true;
    }
    this.pendingSpawnX = data.playerX;
    this.pendingSpawnY = data.playerY;
  }

  private pendingMechaUnlock = false;
  private pendingDragonUnlock = false;
  private pendingSpawnX = 100;
  private pendingSpawnY = 650;

  private requestSave(): void {
    saveGame({
      cardsCollected: this.tarotSystem.collectedCards,
      mechaUnlocked: this.player.formMachine.hasTransform(),
      dragonUnlocked: this.player.formMachine.hasDragon(),
      playerX: this.player.x,
      playerY: this.player.y,
    });
  }

  private createTarotCards(): void {
    // The Magician — hidden alcove in Ashen Woods, behind breakable wall (requires Mecha backtrack)
    const magicianCard = new TarotCard(this, 680, 720, 'magician');
    magicianCard.setDepth(1);

    this.physics.add.overlap(this.player, magicianCard, () => {
      magicianCard.collect(this.player);
      this.tarotSystem.collect('magician', this.player);
      this.requestSave();
    });

    // Barricade blocking access to the secret alcove
    const secretWall = new Barricade(this, 650, 736);
    this.barricades.add(secretWall);

    // The Chariot — Iron Bastion, behind barricade gauntlet
    const chariotCard = new TarotCard(this, 1950, 700, 'chariot');
    chariotCard.setDepth(1);

    this.physics.add.overlap(this.player, chariotCard, () => {
      chariotCard.collect(this.player);
      this.tarotSystem.collect('chariot', this.player);
      this.requestSave();
    });
  }

  private createBarricades(): void {
    this.barricades = this.physics.add.staticGroup();

    // Iron Bastion barricades — must use Mecha to break
    const b1 = new Barricade(this, 1480, 736);
    const b2 = new Barricade(this, 1720, 736);
    const b3 = new Barricade(this, 1900, 736);
    const b4 = new Barricade(this, 2050, 736);

    this.barricades.addMultiple([b1, b2, b3, b4]);
  }

  private createBoss(): void {
    this.boss = new Boss(this, 4800, 480, this.player);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.player, this.enemies);
    this.physics.add.collider(this.player, this.boss);
    this.physics.add.collider(this.player, this.barricades);
    this.physics.add.collider(this.enemies, this.barricades);

    this.physics.add.overlap(
      this.player,
      this.dragonCore,
      (_player, core) => {
        (core as DragonCore).collect(_player as Player);
        this.requestSave();
      }
    );

    this.physics.add.overlap(
      this.player,
      this.skyCore,
      (_player, core) => {
        (core as SkyCore).collect(_player as Player);
        this.requestSave();
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

    this.physics.add.overlap(
      this.player,
      this.boss.bullets,
      (_player, _bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        b.disableBody(true, true);
        const knockDir = (_player as Player).x < b.x ? -1 : 1;
        (_player as Player).takeDamage(15, knockDir);
      }
    );

    this.physics.add.overlap(
      this.player.combatSystem.bullets,
      this.boss,
      (_bullet) => {
        const b = _bullet as Phaser.Physics.Arcade.Sprite;
        if (!b.active) return;
        b.disableBody(true, true);
        this.boss.takeDamage(this.player.combatSystem.getFireDamage());
        spawnHitParticles(this, this.boss.x, this.boss.y);
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
        fontSize: `${Math.round(16 * scale)}px`,
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    const intro2 = this.add
      .text(cx, cy + 24 * scale, t('story.intro2'), {
        fontSize: `${Math.round(14 * scale)}px`,
        fontFamily: 'monospace',
        color: '#ff6600',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);

    const controls = this.add
      .text(cx, cy + 60 * scale, t('story.controls'), {
        fontSize: `${Math.round(11 * scale)}px`,
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

  update(time: number, delta: number): void {
    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);
    this.updateBossTrigger();
    this.updateShmupZone(delta, time);

    if (this.player.active && this.player.y > LEVEL_HEIGHT + 60) {
      this.player.takeDamage(100, 0);
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

  private updateBossTrigger(): void {
    if (this.bossTriggered) return;

    const dist = Math.abs(this.player.x - 4700);
    if (dist < 400 && this.player.formMachine.hasTransform()) {
      this.bossTriggered = true;
      this.boss.activate();
    }
  }

  private updateParallax(): void {
    const camX = this.cameras.main.scrollX;
    this.bgMountains.tilePositionX = camX * 0.08;
    this.bgForest.tilePositionX = camX * 0.2;
    this.bgRuins.tilePositionX = camX * 0.35;
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

    if (this.boss && this.boss.active) {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          slashBounds,
          this.boss.getBounds()
        )
      ) {
        this.boss.takeDamage(this.player.combatSystem.getSwordDamage());
        spawnHitParticles(this, this.boss.x, this.boss.y);
      }
    }
  }

  private updateBulletCleanup(): void {
    const cam = this.cameras.main;

    [
      this.player.combatSystem.bullets,
      this.boss.bullets,
    ].forEach((group) => {
      group.getChildren().forEach((bullet) => {
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
    });
  }
}
