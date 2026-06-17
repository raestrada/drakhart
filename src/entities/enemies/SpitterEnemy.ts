import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { spawnAcidSplash, spawnProjectileTrail, spawnProjectileImpact } from '../../effects/Particles';

export class SpitterEnemy extends BaseEnemy {
  private bulletTrails: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Player,
    config?: {
      health?: number;
      speed?: number;
      detectRange?: number;
      attackRange?: number;
      damage?: number;
      attackCooldown?: number;
      patrolMinX?: number;
      patrolMaxX?: number;
    }
  ) {
    super(scene, x, y, 'enemy-spitter', player, {
      health: config?.health ?? 45,
      speed: config?.speed ?? 50,
      detectRange: config?.detectRange ?? 320,
      attackRange: config?.attackRange ?? 220,
      damage: config?.damage ?? 12,
      attackCooldown: config?.attackCooldown ?? 1800,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });
  }

  protected doAttack(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    (this.scene as any).gameAudio?.playFireball?.();

    // Telegraph: flash green briefly before shooting
    this.setTint(0x88ffaa);
    this.scene.time.delayedCall(180, () => {
      if (!this.active || this.health <= 0) return;
      this.clearTint();
      this.fireBullet();
    });
  }

  private fireBullet(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    // Muzzle flash light
    if (this.scene.lights) {
      const flash = this.scene.lights.addLight(this.x, this.y - 4, 60, 0x00ff88, 0.6);
      this.scene.time.delayedCall(80, () => this.scene.lights.removeLight(flash));
    }

    const bullet = this.scene.physics.add.sprite(this.x, this.y - 4, 'bullet-fire');
    bullet.setTint(0x00ff88);
    bullet.setScale(0.9);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    const dx = this.player.x - this.x;
    const dy = (this.player.y - 10) - this.y;
    const angle = Math.atan2(dy, dx);
    const bulletSpeed = 160;

    bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

    const trail = spawnProjectileTrail(this.scene, bullet.x, bullet.y, [0x00ff88, 0x44ff66], 300);

    bullet.setData('trail', trail);

    this.scene.time.addEvent({
      delay: 30,
      repeat: 100,
      callback: () => {
        if (!bullet.active || !trail.active) return;
        trail.setPosition(bullet.x, bullet.y);
      },
    });

    this.scene.physics.add.overlap(this.player, bullet, () => {
      if (!bullet.active) return;
      const impactX = bullet.x;
      const impactY = bullet.y;
      const trailRef = bullet.getData('trail') as Phaser.GameObjects.Particles.ParticleEmitter;
      if (trailRef?.active) { trailRef.stop(); this.scene.time.delayedCall(400, () => trailRef.destroy()); }
      bullet.destroy();
      spawnProjectileImpact(this.scene, impactX, impactY, [0x00ff88, 0x44ff66], 6);
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);
    });

    this.scene.time.delayedCall(3000, () => {
      if (bullet.active) {
        const trailRef = bullet.getData('trail') as Phaser.GameObjects.Particles.ParticleEmitter;
        if (trailRef?.active) { trailRef.stop(); this.scene.time.delayedCall(400, () => { if (trailRef.active) trailRef.destroy(); }); }
        bullet.destroy();
      }
    });
  }

  protected die(): void {
    spawnAcidSplash(this.scene, this.x, this.y);
    (this.scene as any).gameAudio?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x224422);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }
}
