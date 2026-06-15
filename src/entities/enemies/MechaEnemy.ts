import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { FormState } from '../../systems/FormStateMachine';
import { spawnHitParticles } from '../../effects/Particles';

export class MechaEnemy extends BaseEnemy {
  private chargeCooldown = false;
  private chargeTimer = 0;

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
    super(scene, x, y, 'enemy-mecha', player, {
      health: config?.health ?? 350,
      speed: config?.speed ?? 65,
      detectRange: config?.detectRange ?? 320,
      attackRange: config?.attackRange ?? 80,
      damage: config?.damage ?? 35,
      attackCooldown: config?.attackCooldown ?? 2000,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });

    // Match new wide 48×36 sprite
    this.setScale(1.4);
    (this.body as Phaser.Physics.Arcade.Body).setSize(44, 30);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(2, 6);
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    const playerState = this.player.formMachine.state;
    if (playerState === FormState.HUMAN || playerState === FormState.EXHAUSTED) {
      // Immune to human attacks
      (this.scene as any).gameAudio?.playShieldBlock?.();

      for (let i = 0; i < 6; i++) {
        const spark = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-12, 12),
          this.y + Phaser.Math.Between(-8, 8),
          3, 3, 0x00d2d3
        );
        this.scene.tweens.add({
          targets: spark,
          y: spark.y - 24,
          alpha: 0,
          duration: 320,
          onComplete: () => spark.destroy()
        });
      }

      const immuneText = this.scene.add.text(this.x, this.y - 28, 'IMMUNE', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#3498db',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: immuneText,
        y: immuneText.y - 18,
        alpha: 0,
        duration: 650,
        onComplete: () => immuneText.destroy()
      });
      return;
    }

    super.takeDamage(amount);
  }

  protected doAttack(): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    if (dist > this.attackRange + 20) return;

    const knockDir = this.player.x < this.x ? -1 : 1;
    this.player.takeDamage(this.attackDamage, knockDir);

    // Camera shake — heavy impact
    this.scene.cameras.main.shake(220, 0.004);
    (this.scene as any).gameAudio?.playLand?.();

    // Mace ground shockwave ring
    const dust = this.scene.add.rectangle(this.x, this.y + 14, 10, 5, 0x444444);
    this.scene.tweens.add({
      targets: dust,
      scaleX: 7.0,
      alpha: 0,
      duration: 280,
      onComplete: () => dust.destroy()
    });

    // Thruster exhaust burst on attack
    for (let i = 0; i < 4; i++) {
      const exhaust = this.scene.add.rectangle(
        this.x - knockDir * 16 + Phaser.Math.Between(-6, 6),
        this.y + 12 + Phaser.Math.Between(-4, 4),
        4, 4, 0x0066cc
      );
      exhaust.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: exhaust,
        x: exhaust.x - knockDir * Phaser.Math.Between(20, 40),
        y: exhaust.y + Phaser.Math.Between(8, 20),
        alpha: 0,
        duration: 250,
        onComplete: () => exhaust.destroy()
      });
    }

    // Charge dash — short burst velocity toward player
    if (!this.chargeCooldown) {
      this.chargeCooldown = true;
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityX(knockDir * 320);

      this.scene.time.delayedCall(180, () => {
        if (this.active && this.body) {
          (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
        }
      });

      this.scene.time.delayedCall(900, () => {
        this.chargeCooldown = false;
      });
    }
  }
}
