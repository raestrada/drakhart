import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameScene } from '../scenes/GameScene';

interface WaveEnemy {
  type: 'sky-hunter' | 'gorge-turret' | 'bone-serpent';
  x: number;   // relative to zone start
  y: number;
  speedX?: number;
  speedY?: number;
  pattern?: 'straight' | 'sine' | 'dive';
}

interface WaveDefinition {
  triggerX: number;  // absolute world x where wave triggers
  enemies: WaveEnemy[];
  restPoint?: boolean;
}

export class ShmupSystem {
  private scene: GameScene;
  private player: Player;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private active = false;
  private zoneStartX = 0;
  private zoneEndX = 0;
  private scrollSpeed = 100;
  private spawnOffset = 480;

  private waves: WaveDefinition[];
  private spawnedWaves = new Set<number>();
  private shmupEnemies: Phaser.Physics.Arcade.Group;


  private scrollX = 0;

  constructor(scene: GameScene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.camera = scene.cameras.main;
    this.shmupEnemies = scene.physics.add.group({ allowGravity: false });

    this.waves = this.buildWaves();
  }

  get isActive(): boolean {
    return this.active;
  }

  get enemies(): Phaser.Physics.Arcade.Group {
    return this.shmupEnemies;
  }

  activate(zoneStartX: number, zoneEndX: number): void {
    this.active = true;
    this.zoneStartX = zoneStartX;
    this.zoneEndX = zoneEndX;
    this.scrollX = zoneStartX;
    this.spawnedWaves.clear();

    this.camera.startFollow(this.player, false);
    this.camera.scrollX = zoneStartX;
  }

  deactivate(): void {
    this.active = false;
    this.shmupEnemies.clear(true, true);

    this.scene.resumeNormalCamera();
  }

  update(delta: number): void {
    if (!this.active) return;

    const dt = delta / 1000;

    this.scrollX += this.scrollSpeed * dt;

    if (this.scrollX > this.zoneEndX) {
      this.deactivate();
      return;
    }

    // Force camera position — auto-scroll right
    this.camera.scrollX = this.scrollX;
    this.camera.scrollY = Math.max(0, this.player.y - this.camera.height / 2);

    // Keep player within viewport
    const viewLeft = this.scrollX;
    const viewRight = this.scrollX + this.camera.width;
    const viewTop = this.camera.scrollY;
    const viewBottom = this.camera.scrollY + this.camera.height;

    if (this.player.x < viewLeft + 20) {
      this.player.x = viewLeft + 20;
      (this.player.body as Phaser.Physics.Arcade.Body).velocity.x = 0;
    }
    if (this.player.x > viewRight - 20) {
      this.player.x = viewRight - 20;
      (this.player.body as Phaser.Physics.Arcade.Body).velocity.x = 0;
    }



    // Spawn waves
    this.waves.forEach((wave) => {
      if (this.spawnedWaves.has(wave.triggerX)) return;
      if (this.scrollX + this.spawnOffset >= wave.triggerX) {
        this.spawnedWaves.add(wave.triggerX);
        this.spawnWave(wave);
      }
    });

    // Cleanup off-screen enemies
    this.shmupEnemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;
      if (enemy.x < this.scrollX - 100) {
        enemy.setActive(false);
        enemy.setVisible(false);
        enemy.destroy();
      }
    });
  }

  private spawnWave(wave: WaveDefinition): void {
    wave.enemies.forEach((def) => {
      const worldX = this.scrollX + this.spawnOffset + def.x;
      const worldY = def.y;

      let enemy: Phaser.Physics.Arcade.Sprite | null = null;

      if (def.type === 'sky-hunter') {
        enemy = this.scene.physics.add.sprite(worldX, worldY, 'enemy-sentry');
        enemy.setTint(0x4488cc);
        enemy.setScale(0.7);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        enemy.setVelocityX(def.speedX ?? -80);
        if (def.pattern === 'sine') {
          enemy.setData('sineOffset', Math.random() * Math.PI * 2);
          enemy.setData('baseY', worldY);
        }
        enemy.setData('hp', 15);
      } else if (def.type === 'gorge-turret') {
        enemy = this.scene.physics.add.sprite(worldX, worldY, 'particle-spark');
        enemy.setTint(0xcc4444);
        enemy.setScale(1.5);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = true;
        // Stationary — clamp position
        enemy.setData('anchorX', worldX);
        enemy.setData('anchorY', worldY);
        enemy.setData('hp', 25);
        enemy.setData('fireTimer', 0);
      } else if (def.type === 'bone-serpent') {
        enemy = this.scene.physics.add.sprite(worldX, worldY, 'bullet-fire');
        enemy.setTint(0xaa9966);
        enemy.setScale(1.2);
        (enemy.body as Phaser.Physics.Arcade.Body).allowGravity = false;
        enemy.setVelocity(def.speedX ?? -160, def.speedY ?? 0);
        enemy.setData('hp', 20);
      }

      if (enemy) {
        this.shmupEnemies.add(enemy);
      }
    });
  }

  updateShmupEnemies(time: number, _delta: number): void {
    this.shmupEnemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      // Enemy movement patterns
      if (enemy.getData('sineOffset') !== undefined) {
        const offset = enemy.getData('sineOffset') as number;
        const baseY = enemy.getData('baseY') as number;
        enemy.y = baseY + Math.sin(time * 0.003 + offset) * 30;
      }

      // Turret: stay anchored, shoot at player
      const fireTimer = enemy.getData('fireTimer') as number;
      if (fireTimer !== undefined) {
        const newTimer = fireTimer + _delta;
        if (newTimer > 2000) {
          enemy.setData('fireTimer', 0);
          this.turretShoot(enemy);
        } else {
          enemy.setData('fireTimer', newTimer);
        }
        // Keep turret at anchor position
        const ax = enemy.getData('anchorX') as number;
        const ay = enemy.getData('anchorY') as number;
        if (ax) enemy.x = ax;
        if (ay) enemy.y = ay;
      }
    });
  }

  private turretShoot(turret: Phaser.Physics.Arcade.Sprite): void {
    const bullet = this.scene.physics.add.sprite(turret.x, turret.y, 'bullet-fire');
    bullet.setTint(0xff4444);
    bullet.setScale(0.6);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    const angle = Phaser.Math.Angle.Between(turret.x, turret.y, this.player.x, this.player.y);
    const speed = 180;
    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.scene.physics.add.overlap(this.player, bullet, () => {
      if (!bullet.active) return;
      bullet.destroy();
      const knockDir = this.player.x < turret.x ? -1 : 1;
      this.player.takeDamage(8, knockDir);
    });

    this.scene.time.delayedCall(3000, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  private buildWaves(): WaveDefinition[] {
    return [
      {
        triggerX: 3000,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 200, speedX: -60 },
          { type: 'sky-hunter', x: 50, y: 240, speedX: -60 },
          { type: 'sky-hunter', x: 100, y: 280, speedX: -60 },
        ],
      },
      {
        triggerX: 3200,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 200, speedX: -70, pattern: 'sine' },
          { type: 'sky-hunter', x: 40, y: 260, speedX: -70, pattern: 'sine' },
          { type: 'gorge-turret', x: -50, y: 350 },
        ],
      },
      {
        triggerX: 3400,
        enemies: [
          { type: 'sky-hunter', x: 0, y: 180, speedX: -80, pattern: 'sine' },
          { type: 'sky-hunter', x: 60, y: 220, speedX: -80 },
          { type: 'bone-serpent', x: 100, y: 250, speedX: -180 },
          { type: 'gorge-turret', x: -30, y: 300 },
          { type: 'gorge-turret', x: -60, y: 380 },
        ],
      },
      {
        triggerX: 3600,
        restPoint: true,
        enemies: [
          { type: 'sky-hunter', x: -20, y: 200, speedX: -60, pattern: 'sine' },
          { type: 'sky-hunter', x: 20, y: 240, speedX: -60, pattern: 'sine' },
        ],
      },
      {
        triggerX: 3800,
        enemies: [
          { type: 'bone-serpent', x: 0, y: 200, speedX: -200 },
          { type: 'bone-serpent', x: 50, y: 250, speedX: -180 },
          { type: 'bone-serpent', x: 100, y: 300, speedX: -200 },
          { type: 'gorge-turret', x: -40, y: 350 },
          { type: 'gorge-turret', x: -80, y: 250 },
        ],
      },
    ];
  }

  getCurrentZoneName(): string {
    return 'Storm Canyon';
  }
}
