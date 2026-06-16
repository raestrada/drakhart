import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';
import { spawnDarkMist } from '../../effects/Particles';

export class LeaperEnemy extends BaseEnemy {
  private lastJumpTime = 0;
  private jumpCooldown = 1500;

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
      speed: config?.speed ?? 90,
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

    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const isPlayerInSight = dist <= this.detectRange && Math.abs(this.player.y - this.y) < 180;

    if (isPlayerInSight && onGround && time - this.lastJumpTime > this.jumpCooldown) {
      this.lastJumpTime = time;

      // Telegraph: crouch briefly
      this.setTintFill(0xff6644);
      this.scene.time.delayedCall(200, () => {
        if (!this.active || this.health <= 0) return;
        this.clearTint();

        const dir = this.player.x < this.x ? -1 : 1;
        body.setVelocityX(dir * this.moveSpeed * 1.5);
        body.setVelocityY(-260);

        (this.scene as any).gameAudio?.playJump?.();

        this.scene.tweens.add({
          targets: this,
          scaleY: 1.25,
          scaleX: 0.8,
          duration: 150,
          yoyo: true,
          ease: 'Quad.easeOut'
        });
      });
    }
  }

  protected die(): void {
    spawnDarkMist(this.scene, this.x, this.y);
    (this.scene as any).gameAudio?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x443333);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 20,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 400,
      onComplete: () => this.destroy(),
    });
  }
}
