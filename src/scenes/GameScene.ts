import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { DragonCore } from '../entities/DragonCore';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { Boss } from '../entities/enemies/Boss';
import { Barricade } from '../entities/Barricade';
import { FlyingEnemy } from '../entities/enemies/FlyingEnemy';
import { FormState } from '../systems/FormStateMachine';
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
  private boss!: Boss;
  private bossTriggered = false;

  private bgMountains!: Phaser.GameObjects.TileSprite;
  private bgForest!: Phaser.GameObjects.TileSprite;
  private bgRuins!: Phaser.GameObjects.TileSprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private emberTimer = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.physics.world.setBounds(0, 0, LEVEL_WIDTH, LEVEL_HEIGHT);

    this.createParallax();
    this.createLevel();
    this.createPlayer();
    this.createEnemies();
    this.createDragonCore();
    this.createBarricades();
    this.createBoss();
    this.setupCamera();
    this.setupCollisions();
    this.showIntroText();
    this.createVignette();

    this.scene.launch('UIScene', { player: this.player });
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
      // --- PART 1: Warrior Zone (0 - 1300) ---
      // Starting ground
      { x: 0, y: LEVEL_HEIGHT - 32, width: 850, height: 64 },
      
      // Agility Passage ceiling blocks: ceiling bottom at y: 700, ground surface at y: 768 (clearance 68px)
      // The Mecha (height 76px) cannot pass, forcing player to stay as agile Human
      { x: 800, y: 560, width: 250, height: 140 },
      
      // Tunnel ground continues
      { x: 850, y: LEVEL_HEIGHT - 32, width: 300, height: 64 },
      
      // Platforms to climb to the altar
      { x: 1050, y: 690, width: 80, height: 16 },
      { x: 1150, y: 620, width: 90, height: 16 },
      { x: 1240, y: 550, width: 120, height: 16 },

      // --- PART 2: Mecha Zone (1300 - 2100) ---
      // Ground continues under the bastion
      { x: 1300, y: LEVEL_HEIGHT - 32, width: 850, height: 64 },
      
      // Platforms inside the ruins
      { x: 1420, y: 680, width: 120, height: 16 },
      { x: 1560, y: 600, width: 100, height: 16 },
      { x: 1680, y: 680, width: 120, height: 16 },
      { x: 1820, y: 620, width: 100, height: 16 },

      // --- PART 3: Dragon Shmup Zone (2100 - 3200) ---
      // Ground stops at x: 2150 and resumes at x: 2850 (open sky gorge)
      { x: 2850, y: LEVEL_HEIGHT - 32, width: 350, height: 64 },
      
      // Floating ruins for landing/refueling
      { x: 2250, y: 440, width: 80, height: 16 },
      { x: 2420, y: 360, width: 90, height: 16 },
      { x: 2600, y: 440, width: 80, height: 16 },
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

    // Warrior Zone sentinels
    const e1 = new BaseEnemy(this, 250, 700, 'enemy-sentry', this.player);
    const e2 = new BaseEnemy(this, 580, 700, 'enemy-sentry', this.player);

    // Mecha Zone Elite sentinels (high health, high damage)
    const e3 = new BaseEnemy(this, 1550, 700, 'enemy-sentry', this.player, { health: 80, damage: 18, speed: 50 });
    const e4 = new BaseEnemy(this, 1750, 700, 'enemy-sentry', this.player, { health: 80, damage: 18, speed: 50 });

    this.enemies.add(e1);
    this.enemies.add(e2);
    this.enemies.add(e3);
    this.enemies.add(e4);

    // Dragon Zone Flying enemies (shmup style)
    const fe1 = new FlyingEnemy(this, 2200, 250, this.player);
    const fe2 = new FlyingEnemy(this, 2380, 300, this.player);
    const fe3 = new FlyingEnemy(this, 2550, 200, this.player);
    const fe4 = new FlyingEnemy(this, 2700, 280, this.player);

    this.enemies.add(fe1);
    this.enemies.add(fe2);
    this.enemies.add(fe3);
    this.enemies.add(fe4);
  }

  private createDragonCore(): void {
    this.dragonCore = new DragonCore(this, 1300, 500);
  }

  private createBarricades(): void {
    this.barricades = this.physics.add.staticGroup();
    const b1 = new Barricade(this, 1450, 736);
    const b2 = new Barricade(this, 1850, 736);
    this.barricades.add(b1);
    this.barricades.add(b2);
  }

  private createBoss(): void {
    this.boss = new Boss(this, 2950, 550, this.player);
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

  update(_time: number, delta: number): void {
    this.updateParallax();
    this.updateShadows();
    this.updateSwordVsEnemies();
    this.updateBulletCleanup();
    this.updateEmbers(delta);
    this.updateBossTrigger();

    // Check if player fell into the bottomless sky gorge chasm
    if (this.player.active && this.player.y > LEVEL_HEIGHT + 60) {
      this.player.takeDamage(100, 0);
    }
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

    const dist = Math.abs(this.player.x - 2950);
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
