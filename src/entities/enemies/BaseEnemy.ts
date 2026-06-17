import Phaser from 'phaser';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';
import { spawnDamageNumber, DamageType } from '../../effects/DamageNumbers';

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

  private lastDamageTime = 0;
  private readonly damageCooldown = 400;

  // Health bar UI
  protected hpBarBg: Phaser.GameObjects.Rectangle | null = null;
  protected hpBarFill: Phaser.GameObjects.Rectangle | null = null;
  protected hpBarChip: Phaser.GameObjects.Rectangle | null = null;
  protected hpBarShowTimer = 0;
  protected prevHealthForChip = 0;

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
    this.prevHealthForChip = this.health;
    this.moveSpeed = config?.speed ?? 70;
    this.detectRange = config?.detectRange ?? 220;
    this.attackRange = config?.attackRange ?? 50;
    this.attackDamage = config?.damage ?? 10;
    this.attackCooldown = config?.attackCooldown ?? 900;
    this.patrolMinX = config?.patrolMinX;
    this.patrolMaxX = config?.patrolMaxX;

    this.setCollideWorldBounds(true);

    this.createHealthBar();
  }

  public spawnIn(): void {
    this.setAlpha(0);
    this.setScale(this.scaleX * 0.4, this.scaleY * 0.4);

    (this.scene as any).gameAudio?.playSpawnIn?.();

    const ring = this.scene.add.graphics();
    ring.lineStyle(1.5, 0x9944ff, 0.6);
    ring.strokeCircle(this.x, this.y, 4);
    ring.setDepth(this.depth + 1);
    ring.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 6,
      scaleY: 6,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      duration: 350,
      ease: 'Sine.easeOut',
    });
  }

  private createHealthBar(): void {
    const barW = 30;
    const barH = 3;
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 24, barW, barH, 0x000000)
      .setDepth(this.depth + 10).setAlpha(0);
    this.hpBarFill = this.scene.add.rectangle(this.x - barW / 2, this.y - 24, barW, barH, 0xff2222)
      .setOrigin(0, 0.5).setDepth(this.depth + 11).setAlpha(0);
    this.hpBarChip = this.scene.add.rectangle(this.x - barW / 2, this.y - 24, barW, barH, 0xffffff)
      .setOrigin(0, 0.5).setDepth(this.depth + 12).setAlpha(0);
  }

  private showHealthBar(): void {
    this.hpBarShowTimer = 2500;
    if (this.hpBarBg) this.hpBarBg.setAlpha(0.8);
    if (this.hpBarFill) {
      const ratio = Math.max(0, this.health / this.maxHealth);
      this.hpBarFill.width = 30 * ratio;
      this.hpBarFill.setAlpha(0.9);
    }
    if (this.hpBarChip) {
      const ratio = Math.max(0, this.prevHealthForChip / this.maxHealth);
      this.hpBarChip.width = 30 * ratio;
      this.hpBarChip.setAlpha(0.5);
    }
  }

  private updateHealthBar(delta: number): void {
    if (!this.hpBarBg || !this.hpBarFill || !this.hpBarChip) return;

    if (this.hpBarShowTimer > 0) {
      this.hpBarShowTimer -= delta;
      const x = this.x;
      const y = this.y - 24 + (this.height ? -(this.height / 2) - 4 : -24);
      this.hpBarBg.setPosition(x, y);
      this.hpBarFill.setPosition(x - 15, y);
      this.hpBarChip.setPosition(x - 15, y);

      // Damage chip lerp
      const chipTarget = Math.max(0, this.health / this.maxHealth) * 30;
      if (this.hpBarChip.width > chipTarget + 0.5) {
        this.hpBarChip.width += (chipTarget - this.hpBarChip.width) * 0.08;
      }
    } else {
      this.hpBarBg.setAlpha(Math.max(0, this.hpBarBg.alpha - 0.03));
      this.hpBarFill.setAlpha(Math.max(0, this.hpBarFill.alpha - 0.03));
      this.hpBarChip.setAlpha(Math.max(0, this.hpBarChip.alpha - 0.03));
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.active || !this.isActive || this.health <= 0) return;

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

    this.updateHealthBar(delta);
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

    const now = this.scene.time.now;
    if (now - this.lastDamageTime < this.damageCooldown) return;
    this.lastDamageTime = now;

    this.prevHealthForChip = this.health;
    this.health -= amount;
    this.showHealthBar();
    spawnDamageNumber(this.scene, this.x, this.y - 20, amount, 'physical');
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
    if (this.hpBarBg) this.hpBarBg.setAlpha(0);
    if (this.hpBarFill) this.hpBarFill.setAlpha(0);
    if (this.hpBarChip) this.hpBarChip.setAlpha(0);

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
    this.setTint(0x33aaff);
  }

  destroy(fromScene?: boolean): void {
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.hpBarFill) this.hpBarFill.destroy();
    if (this.hpBarChip) this.hpBarChip.destroy();
    super.destroy(fromScene);
  }
}
