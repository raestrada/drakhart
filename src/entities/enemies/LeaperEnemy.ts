import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';

export class LeaperEnemy extends BaseEnemy {
  private lastJumpTime = 0;
  private jumpCooldown = 1500; // time between leaps in ms

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
    super(scene, x, y, 'enemy-leaper', player, {
      health: config?.health ?? 40,
      speed: config?.speed ?? 90, // slightly faster base run speed
      detectRange: config?.detectRange ?? 250,
      attackRange: config?.attackRange ?? 45,
      damage: config?.damage ?? 10,
      attackCooldown: config?.attackCooldown ?? 800,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.active || !this.isActive || this.health <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down || body.touching.down;
    
    // Check if player is detected and we can leap
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const isPlayerInSight = dist <= this.detectRange && Math.abs(this.player.y - this.y) < 180;

    if (isPlayerInSight && onGround && time - this.lastJumpTime > this.jumpCooldown) {
      this.lastJumpTime = time;
      
      // Perform leap!
      const dir = this.player.x < this.x ? -1 : 1;
      body.setVelocityX(dir * this.moveSpeed * 1.5);
      body.setVelocityY(-260); // jump upwards
      
      // Play jump sound
      (this.scene as any).gameAudio?.playJump?.();

      // Squash and stretch visual effect
      this.scene.tweens.add({
        targets: this,
        scaleY: 1.25,
        scaleX: 0.8,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }
  }
}
