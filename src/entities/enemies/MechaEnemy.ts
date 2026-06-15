import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { FormState } from '../../systems/FormStateMachine';
import { spawnHitParticles } from '../../effects/Particles';

export class MechaEnemy extends BaseEnemy {
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
      health: config?.health ?? 120, // High health
      speed: config?.speed ?? 40,   // Slow moving heavy unit
      detectRange: config?.detectRange ?? 240,
      attackRange: config?.attackRange ?? 60,
      damage: config?.damage ?? 20,   // High contact damage
      attackCooldown: config?.attackCooldown ?? 1600,
      patrolMinX: config?.patrolMinX,
      patrolMaxX: config?.patrolMaxX,
    });

    (this.body as Phaser.Physics.Arcade.Body).setSize(32, 32);
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    // Check player state
    const playerState = this.player.formMachine.state;
    if (playerState === FormState.HUMAN || playerState === FormState.EXHAUSTED) {
      // Immune to human attacks!
      (this.scene as any).gameAudio?.playShieldBlock?.();
      
      // Spawn metallic shield block particles
      for (let i = 0; i < 6; i++) {
        const spark = this.scene.add.rectangle(
          this.x + Phaser.Math.Between(-10, 10),
          this.y + Phaser.Math.Between(-10, 10),
          3, 3, 0x00d2d3
        );
        this.scene.tweens.add({
          targets: spark,
          y: spark.y - 20,
          alpha: 0,
          duration: 300,
          onComplete: () => spark.destroy()
        });
      }

      // Show "IMMUNE" warning floating text
      const immuneText = this.scene.add.text(this.x, this.y - 24, 'IMMUNE', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#3498db',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: immuneText,
        y: immuneText.y - 16,
        alpha: 0,
        duration: 600,
        onComplete: () => immuneText.destroy()
      });
      return;
    }

    // Vulnerable to Mecha claymore and Dragon fire
    super.takeDamage(amount);
  }

  protected doAttack(): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);
    if (dist <= this.attackRange + 15) {
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);

      // Mace ground shockwave effect
      this.scene.cameras.main.shake(200, 0.003);
      (this.scene as any).gameAudio?.playLand?.(); // Heavy smash sound

      // Spawn shockwave dust rings on ground
      const dust = this.scene.add.rectangle(this.x, this.y + 16, 8, 4, 0x555555);
      this.scene.tweens.add({
        targets: dust,
        scaleX: 6.0,
        alpha: 0,
        duration: 250,
        onComplete: () => dust.destroy()
      });
    }
  }
}
