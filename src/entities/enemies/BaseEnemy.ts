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
  protected attackDamage: number;
  protected attackCooldown: number;
  protected lastAttackTime = 0;
  protected isActive = true;

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

    this.setCollideWorldBounds(true);
  }

  preUpdate(time: number, _delta: number): void {
    super.preUpdate(time, _delta);

    if (!this.active || !this.isActive || this.health <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const dir = this.player.x < this.x ? -1 : 1;

    this.setFlipX(dir < 0);

    if (dist <= this.attackRange) {
      body.setVelocityX(0);
      if (time - this.lastAttackTime > this.attackCooldown) {
        this.lastAttackTime = time;
        this.doAttack();
      }
    } else if (dist <= this.detectRange) {
      body.setVelocityX(dir * this.moveSpeed);
    } else {
      body.setVelocityX(0);
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
    }
  }

  protected die(): void {
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
}
