import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';

export class FlyingEnemy extends BaseEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'enemy-sentry', player, {
      health: 20,         // Low health for shmup phase
      speed: 80,          // Flight chase speed
      detectRange: 380,
      attackRange: 280,   // Shoots from afar
      damage: 10,
      attackCooldown: 1800,
    });

    // Disable gravity for flight
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  preUpdate(time: number, delta: number): void {
    // We override preUpdate to support 2D flight towards the player instead of just horizontal walk
    if (!this.active || !this.isActive || this.health <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const dirX = this.player.x < this.x ? -1 : 1;

    this.setFlipX(dirX < 0);

    if (dist <= this.detectRange) {
      // Fly directly towards player
      const dx = this.player.x - this.x;
      const dy = (this.player.y - 12) - this.y; // Aim slightly above player center
      const angle = Math.atan2(dy, dx);

      body.setVelocityX(Math.cos(angle) * this.moveSpeed);
      body.setVelocityY(Math.sin(angle) * this.moveSpeed);

      if (dist <= this.attackRange) {
        if (time - this.lastAttackTime > this.attackCooldown) {
          this.lastAttackTime = time;
          this.doAttack();
        }
      }
    } else {
      // Passive hovering drift
      body.setVelocityX(0);
      body.setVelocityY(Math.sin(time * 0.0035) * 15);
    }
  }

  protected doAttack(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    // Spawn flying enemy bullet
    const bullet = this.scene.physics.add.sprite(this.x, this.y, 'bullet-fire');
    bullet.setTint(0xcc00ff); // Purple energy bolt
    bullet.setScale(0.8);
    bullet.setBlendMode(Phaser.BlendModes.ADD);

    const body = bullet.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;

    // Track towards player position
    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const angle = Math.atan2(dy, dx);
    const bulletSpeed = 200;

    bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

    // Overlap checks
    this.scene.physics.add.overlap(this.player, bullet, () => {
      if (!bullet.active) return;
      bullet.destroy();
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);
    });

    // Timeout cleanup
    this.scene.time.delayedCall(2500, () => {
      if (bullet.active) {
        bullet.destroy();
      }
    });
  }
}
