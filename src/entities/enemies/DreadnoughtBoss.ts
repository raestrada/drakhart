import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { spawnDeathExplosion } from '../../effects/Particles';

class DreadnoughtCannon extends BaseEnemy {
  public isTop: boolean;
  private boss: DreadnoughtBoss;
  private fireTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, isTop: boolean, boss: DreadnoughtBoss, player: Player) {
    super(scene, x, y, 'enemy-gunship', player, {
      health: 200,
      speed: 0,
      detectRange: 9999,
      attackRange: 9999,
      damage: 15,
      attackCooldown: 1200
    });
    this.isTop = isTop;
    this.boss = boss;
    this.setScale(1.5);
    this.setTint(isTop ? 0xff5555 : 0x5555ff);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;
    
    // Follow the boss
    this.x = this.boss.x - 30;
    this.y = this.boss.y + (this.isTop ? -100 : 100);
    
    // Fire bullets
    if (time - this.fireTimer > this.attackCooldown) {
      this.fireTimer = time;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    const bulletSpeed = 250;
    // Fire a spread
    const angles = [-0.15, 0, 0.15];
    angles.forEach(angleOffset => {
      const bullet = this.scene.physics.add.sprite(this.x - 40, this.y, 'bullet-fire');
      bullet.setTint(this.isTop ? 0xff0000 : 0x0000ff);
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
        this.player.takeDamage(this.attackDamage, -1);
      });

      this.scene.time.delayedCall(4000, () => {
        if (bullet.active) bullet.destroy();
      });
    });
  }

  die(): void {
    super.die();
    spawnDeathExplosion(this.scene, this.x, this.y);
    this.boss.onCannonDestroyed();
    this.destroy();
  }
}

export class DreadnoughtBoss extends BaseEnemy {
  private topCannon: DreadnoughtCannon | null = null;
  private bottomCannon: DreadnoughtCannon | null = null;
  private cannonsActive = 2;
  private phase: 'intro' | 'shielded' | 'vulnerable' | 'dead' = 'intro';
  private fireTimer = 0;
  private startX: number;
  private startY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'boss', player, {
      health: 800,
      speed: 30,
      detectRange: 9999,
      attackRange: 9999,
      damage: 25,
      attackCooldown: 1000
    });

    this.startX = x;
    this.startY = y;
    
    // Core is giant
    this.setScale(2.5);
    this.setTint(0x885544); // Dark armored but visible (was 0x333333 too dark)
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (this.body as Phaser.Physics.Arcade.Body).setSize(90, 90);
  }

  public activate(): void {
    this.phase = 'shielded';
    this.topCannon = new DreadnoughtCannon(this.scene, this.x, this.y - 100, true, this, this.player);
    this.bottomCannon = new DreadnoughtCannon(this.scene, this.x, this.y + 100, false, this, this.player);
    
    // The scene needs to know about these enemies for collisions
    const gameScene = this.scene as any;
    if (gameScene.addEnemyObject) {
      gameScene.addEnemyObject(this.topCannon);
      gameScene.addEnemyObject(this.bottomCannon);
    } else if (gameScene.enemies) {
      gameScene.enemies.add(this.topCannon);
      gameScene.enemies.add(this.bottomCannon);
    }
  }

  public onCannonDestroyed(): void {
    this.cannonsActive--;
    if (this.cannonsActive <= 0 && this.phase === 'shielded') {
      this.phase = 'vulnerable';
      this.setTint(0xff8800);
      this.scene.cameras.main.flash(500, 255, 150, 0);
      this.scene.cameras.main.shake(800, 0.02);

      // Pulsing glow to make it unmistakable
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.6 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Hint text
      const cam = this.scene.cameras.main;
      const hint = this.scene.add.text(
        cam.scrollX + cam.width / 2, cam.scrollY + cam.height * 0.2,
        'CORE EXPOSED — DESTROY IT!',
        { fontSize: '18px', fontFamily: 'monospace', color: '#ff6600', stroke: '#000000', strokeThickness: 4 }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

      this.scene.tweens.add({
        targets: hint,
        alpha: { from: 0, to: 1 },
        y: hint.y - 10,
        duration: 200,
        yoyo: true,
        hold: 2000,
        onComplete: () => hint.destroy(),
      });
    }
  }

  takeDamage(amount: number, knockDir: number = 0): void {
    if (this.phase === 'shielded') {
      // Immune while cannons are alive
      const spark = this.scene.add.rectangle(this.x - 80, this.y + Phaser.Math.Between(-40, 40), 4, 4, 0x8888ff);
      this.scene.tweens.add({ targets: spark, x: spark.x - 50, y: spark.y + Phaser.Math.Between(-20, 20), alpha: 0, duration: 300, onComplete: () => spark.destroy() });
      return;
    }
    
    super.takeDamage(amount);

    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.setTint(0xff8800);
    });
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.phase === 'dead') return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Hover pattern
    body.setVelocityY(Math.sin(time * 0.002) * 60);

    // Keep distance from player horizontally, but generally stay on right side of screen
    const cam = this.scene.cameras.main;
    const targetX = cam.scrollX + (cam.width / cam.zoom) * 0.65;
    
    if (this.x > targetX + 10) {
      body.setVelocityX(-this.moveSpeed);
    } else if (this.x < targetX - 10) {
      body.setVelocityX(this.moveSpeed);
    } else {
      body.setVelocityX(0);
    }

    // Clamp X to stay visible on screen
    const minX = cam.scrollX + cam.width * 0.2;
    const maxX = cam.scrollX + (cam.width / cam.zoom) * 0.85;
    if (this.x < minX) { this.x = minX; body.setVelocityX(0); }
    if (this.x > maxX) { this.x = maxX; body.setVelocityX(0); }

    if (this.phase === 'vulnerable') {
      // Core fires massive lasers
      if (time - this.fireTimer > this.attackCooldown) {
        this.fireTimer = time;
        this.fireCoreLaser();
      }
    }
  }

  private fireCoreLaser(): void {
    const laser = this.scene.add.rectangle(this.x - 100, this.y, 100, 40, 0xff0000);
    laser.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.physics.add.existing(laser);
    const body = laser.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setVelocityX(-600);

    // Grow laser
    this.scene.tweens.add({
      targets: laser,
      width: 400,
      duration: 200
    });

    this.scene.physics.add.overlap(this.player, laser, () => {
      if (!laser.active) return;
      this.player.takeDamage(this.attackDamage, -1);
    });

    this.scene.time.delayedCall(1500, () => {
      if (laser.active) laser.destroy();
    });
  }

  protected die(): void {
    this.phase = 'dead';
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x222222);

    this.scene.cameras.main.shake(2000, 0.03);
    this.scene.cameras.main.flash(1000, 255, 50, 0);
    
    // Multiple explosions
    for (let i = 0; i < 15; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        spawnDeathExplosion(this.scene, this.x + Phaser.Math.Between(-100, 100), this.y + Phaser.Math.Between(-100, 100));
      });
    }

    this.scene.tweens.add({
      targets: this,
      y: this.y + 400,
      alpha: 0,
      angle: 45,
      duration: 3000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });
  }
}
