import Phaser from 'phaser';
import { Player } from './Player';
import { BaseEnemy } from './enemies/BaseEnemy';

export class CoolingValve extends Phaser.Physics.Arcade.Sprite {
  public alive = true;
  private isOnCooldown = false;
  private rechargeTime = 5000;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'cool-valve');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(5);
  }

  hit(player: Player): void {
    if (this.isOnCooldown) return;

    this.isOnCooldown = true;
    this.setAlpha(0.4);
    this.setTint(0x555555);

    player.formMachine.heat.clearHeat();

    this.spawnCoolParticles();
    this.spawnCoolBlast();

    const activeEnemies = (this.scene as any).enemies;
    if (activeEnemies) {
      activeEnemies.getChildren().forEach((enemy: any) => {
        const e = enemy as BaseEnemy;
        if (e.active && e.health > 0) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
          if (dist <= 250) {
            e.applySlow(3000, 0.40);
          }
        }
      });
    }

    (this.scene as any).gameAudio?.playShieldBlock?.();

    this.scene.time.delayedCall(this.rechargeTime, () => {
      if (this.active) {
        this.isOnCooldown = false;
        this.setAlpha(1.0);
        this.clearTint();
        (this.scene as any).gameAudio?.playCardCollect?.();
      }
    });
  }

  private spawnCoolParticles(): void {
    const emitter = this.scene.add.particles(this.x, this.y, 'particle-smoke', {
      speed: { min: 50, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 1.5 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00d2d3,
      lifespan: { min: 500, max: 900 },
      quantity: 20,
      emitting: false,
    });

    emitter.explode(20);
    emitter.setDepth(15);

    this.scene.time.delayedCall(1000, () => {
      emitter.destroy();
    });
  }

  private spawnCoolBlast(): void {
    const ring = this.scene.add.image(this.x, this.y, 'px-8');
    ring.setTint(0x00d2d3);
    ring.setAlpha(0.7);
    ring.setDepth(14);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setScale(1.5);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 28,
      scaleY: 28,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });

    const ring2 = this.scene.add.image(this.x, this.y, 'px-8');
    ring2.setTint(0x88ffff);
    ring2.setAlpha(0.4);
    ring2.setDepth(14);
    ring2.setBlendMode(Phaser.BlendModes.ADD);
    ring2.setScale(1.0);

    this.scene.tweens.add({
      targets: ring2,
      scaleX: 20,
      scaleY: 20,
      alpha: 0,
      duration: 450,
      delay: 80,
      ease: 'Quad.easeOut',
      onComplete: () => ring2.destroy(),
    });
  }
}
