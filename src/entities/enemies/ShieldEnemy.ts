import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { FormState } from '../../systems/FormStateMachine';

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
      health: config?.health ?? 70, // sturdier
      speed: config?.speed ?? 45,  // slower
      detectRange: config?.detectRange ?? 200,
      attackRange: config?.attackRange ?? 45,
      damage: config?.damage ?? 15, // hits harder
      attackCooldown: config?.attackCooldown ?? 1200,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    // Sentry flips: setFlipX(true) means facing left, setFlipX(false) means facing right.
    // Check if player is attacking from the front relative to our facing.
    const isFacingLeft = this.flipX;
    const isPlayerInFront = isFacingLeft ? (this.player.x < this.x) : (this.player.x > this.x);
    const isMecha = this.player.formMachine.state === FormState.MECHA;

    if (isPlayerInFront && !isMecha) {
      // Shield block!
      // Flash blue/white to indicate shield hit
      this.setTint(0x55aaff);
      this.scene.time.delayedCall(80, () => {
        if (this.active) this.clearTint();
      });

      // Play block sound if available, else standard hit sound
      if ((this.scene as any).gameAudio && typeof (this.scene as any).gameAudio.playShieldBlock === 'function') {
        (this.scene as any).gameAudio.playShieldBlock();
      } else {
        (this.scene as any).gameAudio?.playEnemyHit?.();
      }

      // Spawn metal spark particles at the front
      this.spawnShieldSparks();
      return;
    }

    // Otherwise, take damage normally
    super.takeDamage(amount);
  }

  private spawnShieldSparks(): void {
    // Spawn blue/gold sparks at the shield position (front of the enemy)
    const isFacingLeft = this.flipX;
    const sparkX = this.x + (isFacingLeft ? -12 : 12);
    const sparkY = this.y;

    for (let i = 0; i < 6; i++) {
      const p = this.scene.physics.add.sprite(sparkX, sparkY, 'particle-spark');
      p.setTint(0x88ddff); // blueish shield sparks
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
}
