import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GameScene } from '../scenes/GameScene';

interface WaveEnemy {
  type: 'sky-hunter' | 'gorge-turret' | 'bone-serpent';
  x: number;
  y: number;
  speedX?: number;
  speedY?: number;
  pattern?: 'straight' | 'sine' | 'dive';
}

interface WaveDefinition {
  triggerX: number;
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
  private currentWaveIndex = 0;
  private totalWaves = 0;

  private scrollX = 0;

  constructor(scene: GameScene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.camera = scene.cameras.main;
    this.shmupEnemies = scene.physics.add.group({ allowGravity: false });

    this.waves = this.buildWaves();
    this.totalWaves = this.waves.length;
  }

  get isActive(): boolean { return this.active; }
  get enemies(): Phaser.Physics.Arcade.Group { return this.shmupEnemies; }

  activate(zoneStartX: number, zoneEndX: number): void {
    this.active = true;
    this.zoneStartX = zoneStartX;
    this.zoneEndX = zoneEndX;
    this.scrollX = zoneStartX;
    this.spawnedWaves.clear();
    this.currentWaveIndex = 0;

    this.showBanner('STORM CANYON — SURVIVE', '#cc44ff');
    this.camera.startFollow(this.player, false);
    this.camera.scrollX = zoneStartX;
  }

  deactivate(): void {
    this.active = false;
    this.shmupEnemies.clear(true, true);
    this.scene.resumeNormalCamera();
  }

  private showBanner(text: string, color: string): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2 - 40;
    const banner = this.scene.add.text(cx, cy, text, {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);

    this.scene.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.7, to: 1.0 },
      scaleY: { from: 0.7, to: 1.0 },
      duration: 400,
      yoyo: true,
      hold: 1200,
      ease: 'Power2',
      onComplete: () => banner.destroy(),
    });
  }

  private showWaveNotice(waveNum: number): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height * 0.3;
    const banner = this.scene.add.text(cx, cy, `WAVE ${waveNum}/${this.totalWaves}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffaa44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300).setAlpha(0);

    this.scene.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 0.9 },
      y: cy - 10,
      duration: 250,
      yoyo: true,
      hold: 800,
      onComplete: () => banner.destroy(),
    });
  }

  update(delta: number): void {
    if (!this.active) return;
    const dt = delta / 1000;

    this.scrollX += this.scrollSpeed * dt;

    if (this.scrollX > this.zoneEndX) {
      this.deactivate();
      return;
    }

    this.camera.scrollX = this.scrollX;
    this.camera.scrollY = Math.max(0, this.player.y - this.camera.height / 2);

    const viewLeft = this.scrollX;
    const viewRight = this.scrollX + this.camera.width;

    if (this.player.x < viewLeft + 20) { this.player.x = viewLeft + 20; (this.player.body as Phaser.Physics.Arcade.Body).velocity.x = 0; }
    if (this.player.x > viewRight - 20) { this.player.x = viewRight - 20; (this.player.body as Phaser.Physics.Arcade.Body).velocity.x = 0; }

    this.waves.forEach((wave, idx) => {
      if (this.spawnedWaves.has(wave.triggerX)) return;
      if (this.scrollX + this.spawnOffset >= wave.triggerX) {
        this.spawnedWaves.add(wave.triggerX);
        this.currentWaveIndex = idx + 1;
        if (!wave.restPoint) {
          this.showWaveNotice(this.currentWaveIndex);
        } else {
          this.showBanner('SAFE ZONE', '#44ff66');
        }
        this.spawnWave(wave);
      }
    });

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
        this.spawnPortal(enemy);
      }
    });
  }

  private spawnPortal(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.setAlpha(0);
    enemy.setScale(enemy.scaleX * 0.2, enemy.scaleY * 0.2);

    const ex = enemy.x;
    const ey = enemy.y;

    const ring = this.scene.add.graphics();
    ring.setDepth(50);
    ring.lineStyle(3, 0xff6600, 1);
    ring.strokeCircle(ex, ey, 8);

    const glowMask = this.scene.add.graphics();
    glowMask.fillStyle(0xffffff, 1);
    glowMask.fillCircle(0, 0, 30);
    glowMask.setPosition(ex, ey);
    glowMask.setDepth(50);

    const portalStencil = this.scene.add.stencil(0, 0, [glowMask], {
      stencilLayerMode: 'addLayer',
    });
    portalStencil.setDepth(50);

    const glowFill = this.scene.add.rectangle(ex, ey, 90, 90, 0xff4400, 0.6);
    glowFill.setDepth(50);
    glowFill.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: [ring, glowMask, glowFill],
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        ring.destroy();
        glowMask.destroy();
        glowFill.destroy();
        portalStencil.destroy();
      },
    });

    this.scene.tweens.add({
      targets: enemy,
      alpha: 1,
      scaleX: enemy.scaleX / 0.2,
      scaleY: enemy.scaleY / 0.2,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  updateShmupEnemies(time: number, _delta: number): void {
    this.shmupEnemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      if (enemy.getData('sineOffset') !== undefined) {
        const offset = enemy.getData('sineOffset') as number;
        const baseY = enemy.getData('baseY') as number;
        enemy.y = baseY + Math.sin(time * 0.003 + offset) * 30;
      }

      const fireTimer = enemy.getData('fireTimer') as number;
      if (fireTimer !== undefined) {
        const newTimer = fireTimer + _delta;
        if (newTimer > 2000) {
          enemy.setData('fireTimer', 0);
          this.turretShoot(enemy);
        } else {
          enemy.setData('fireTimer', newTimer);
        }
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

  getCurrentZoneName(): string { return 'Storm Canyon'; }
}
