import Phaser from 'phaser';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';

export class BaseEnemy extends Phaser.Physics.Arcade.Sprite {
  public health: number;
  public maxHealth: number;

  protected player: Player;
  protected moveSpeed: number;
  protected detectRange: number;
  protected attackRange: number;
  public attackDamage: number;
  protected attackCooldown: number;
  protected lastAttackTime = 0;
  public isActive = true;

  protected patrolMinX?: number;
  protected patrolMaxX?: number;
  protected patrolDir = 1;

  protected slowTimer = 0;
  protected slowMultiplier = 1.0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
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
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.player = player;
    this.health = config?.health ?? 40;
    this.maxHealth = this.health;
    this.moveSpeed = config?.speed ?? 70;
    this.detectRange = config?.detectRange ?? 220;
    this.attackRange = config?.attackRange ?? 50;
    this.attackDamage = config?.damage ?? 10;
    this.attackCooldown = config?.attackCooldown ?? 900;
    this.patrolMinX = config?.patrolMinX;
    this.patrolMaxX = config?.patrolMaxX;

    this.setCollideWorldBounds(true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.active || !this.isActive || this.health <= 0) return;

    // Handle slow decay
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1.0;
        this.clearTint();
      }
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const dir = this.player.x < this.x ? -1 : 1;

    const isPlayerInSight = dist <= this.detectRange && Math.abs(this.player.y - this.y) < 180;

    if (dist <= this.attackRange) {
      body.setVelocityX(0);
      this.setFlipX(dir < 0);
      if (time - this.lastAttackTime > this.attackCooldown) {
        this.lastAttackTime = time;
        this.doAttack();
      }
    } else if (isPlayerInSight) {
      body.setVelocityX(dir * this.moveSpeed * this.slowMultiplier);
      this.setFlipX(dir < 0);
    } else {
      // Patrol logic
      if (this.patrolMinX !== undefined && this.patrolMaxX !== undefined) {
        if (this.patrolDir === 1) {
          body.setVelocityX(this.moveSpeed * 0.75 * this.slowMultiplier);
          this.setFlipX(false);
          if (this.x >= this.patrolMaxX) {
            this.patrolDir = -1;
            this.x = this.patrolMaxX;
          }
        } else {
          body.setVelocityX(-this.moveSpeed * 0.75 * this.slowMultiplier);
          this.setFlipX(true);
          if (this.x <= this.patrolMinX) {
            this.patrolDir = 1;
            this.x = this.patrolMinX;
          }
        }
      } else {
        body.setVelocityX(0);
      }
    }
  }

  protected doAttack(): void {
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    if (dist <= this.attackRange + 20) {
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    this.health -= amount;
    this.setTint(0xff0000);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });

    if (this.health <= 0) {
      this.die();
    } else {
      (this.scene as any).gameAudio?.playEnemyHit();
    }
  }

  protected die(): void {
    (this.scene as any).gameAudio?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x333333);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  public applySlow(duration: number, multiplier: number): void {
    this.slowTimer = duration;
    this.slowMultiplier = multiplier;
    this.setTint(0x33aaff); // Ice blue tint for slow effect
  }
}
