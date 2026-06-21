import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { getSceneAudio } from '../../scenes/BaseLevelScene';
import { FormState } from '../../systems/FormStateMachine';
import { spawnMetalSparks } from '../../effects/Particles';

export class ShieldEnemy extends BaseEnemy {
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
    super(scene, x, y, 'enemy-shield', player, {
      health: config?.health ?? 70,
      speed: config?.speed ?? 45,
      detectRange: config?.detectRange ?? 200,
      attackRange: config?.attackRange ?? 45,
      damage: config?.damage ?? 15,
      attackCooldown: config?.attackCooldown ?? 1200,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    const isFacingLeft = this.flipX;
    const isPlayerInFront = isFacingLeft ? (this.player.x < this.x) : (this.player.x > this.x);
    const isMecha = this.player.formMachine.state === FormState.MECHA;

    if (isPlayerInFront && !isMecha) {
      // Shield block!
      this.setTint(0x55aaff);
      this.scene.time.delayedCall(80, () => {
        if (this.active) this.clearTint();
      });

      const audio = getSceneAudio(this.scene);
      if (audio) {
        audio.playShieldBlock();
      } else {
        getSceneAudio(this.scene)?.playEnemyHit?.();
      }

      this.spawnShieldSparks();
      return;
    }

    super.takeDamage(amount);
  }

  protected doAttack(): void {
    // Telegraph: flash before melee strike
    this.setTint(0x55aaff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(220, () => {
      if (!this.active || this.health <= 0) return;
      this.clearTint();
      super.doAttack();
      this.scene.cameras.main.shake(60, 0.002);
    });
  }

  private spawnShieldSparks(): void {
    const isFacingLeft = this.flipX;
    const sparkX = this.x + (isFacingLeft ? -12 : 12);
    const sparkY = this.y;

    for (let i = 0; i < 6; i++) {
      const p = this.scene.physics.add.sprite(sparkX, sparkY, 'particle-spark');
      p.setTint(0x88ddff);
      const body = p.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;

      const angle = Phaser.Math.FloatBetween(-Math.PI/2, Math.PI/2) + (isFacingLeft ? Math.PI : 0);
      const speed = Phaser.Math.Between(100, 200);
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.1,
        duration: Phaser.Math.Between(200, 400),
        onComplete: () => p.destroy()
      });
    }
  }

  protected die(): void {
    spawnMetalSparks(this.scene, this.x, this.y, 14);
    getSceneAudio(this.scene)?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x887744);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.6,
      duration: 550,
      onComplete: () => this.destroy(),
    });
  }
}
