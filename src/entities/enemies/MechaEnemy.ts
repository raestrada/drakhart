import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { FormState } from '../../systems/FormStateMachine';
import { spawnHitParticles, spawnMetalSparks, spawnOilSmoke } from '../../effects/Particles';

export class MechaEnemy extends BaseEnemy {
  private chargeCooldown = false;

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

    this.setScale(1.4);
    (this.body as Phaser.Physics.Arcade.Body).setSize(44, 30);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(2, 6);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active || !this.isActive || this.health <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const isMoving = Math.abs(body.velocity.x) > 10;
    const isCharging = Math.abs(body.velocity.x) > 150;

    if (isCharging) {
      this.play('em-charge', true);
    } else if (isMoving) {
      this.play('em-walk', true);
    } else {
      this.play('em-idle', true);
    }
  }

  takeDamage(amount: number): void {
    if (this.health <= 0) return;

    const playerState = this.player.formMachine.state;
    if (playerState === FormState.HUMAN || playerState === FormState.EXHAUSTED) {
      (this.scene as any).gameAudio?.playShieldBlock?.();

      spawnHitParticles(this.scene, this.x, this.y, 6);

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

    // Telegraph: engine rev before strike
    this.setTintFill(0xff4422);
    this.scene.time.delayedCall(250, () => {
      if (!this.active || this.health <= 0) return;
      this.clearTint();
      this.executeAttack();
    });
  }

  private executeAttack(): void {
    const knockDir = this.player.x < this.x ? -1 : 1;
    this.player.takeDamage(this.attackDamage, knockDir);

    this.scene.cameras.main.shake(220, 0.004);
    (this.scene as any).gameAudio?.playLand?.();

    const dust = this.scene.add.rectangle(this.x, this.y + 14, 10, 5, 0x444444);
    this.scene.tweens.add({
      targets: dust,
      scaleX: 7.0,
      alpha: 0,
      duration: 280,
      onComplete: () => dust.destroy()
    });

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

  protected die(): void {
    spawnMetalSparks(this.scene, this.x, this.y, 16);
    spawnOilSmoke(this.scene, this.x, this.y);
    (this.scene as any).gameAudio?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x664444);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.5,
      duration: 700,
      onComplete: () => this.destroy(),
    });
  }
}
