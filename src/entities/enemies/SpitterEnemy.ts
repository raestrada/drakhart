import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';

export class SpitterEnemy extends BaseEnemy {
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
      attackRange: config?.attackRange ?? 220, // longer attack range for spitting
      damage: config?.damage ?? 12,
      attackCooldown: config?.attackCooldown ?? 1800,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });
  }

  protected doAttack(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    // Play fireball shoot sound
    (this.scene as any).gameAudio?.playFireball?.();

    const bullet = this.scene.physics.add.sprite(this.x, this.y - 4, 'bullet-fire');
    bullet.setTint(0x00ff88); // Acidic green spit projectile
    bullet.setScale(0.9);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    // Track towards player position
    const dx = this.player.x - this.x;
    const dy = (this.player.y - 10) - this.y; // aim slightly above feet
    const angle = Math.atan2(dy, dx);
    const bulletSpeed = 160; // moderate speed so player can react

    bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

    // Overlap checks
    this.scene.physics.add.overlap(this.player, bullet, () => {
      if (!bullet.active) return;
      bullet.destroy();
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);
    });

    // Timeout cleanup
    this.scene.time.delayedCall(3000, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }
}
