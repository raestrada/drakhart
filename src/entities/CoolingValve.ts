import Phaser from 'phaser';
import { Player } from './Player';
import { BaseEnemy } from './enemies/BaseEnemy';

export class CoolingValve extends Phaser.Physics.Arcade.Sprite {
  public alive = true;
  private isOnCooldown = false;
  private rechargeTime = 5000; // 5 seconds recharge

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'cool-valve');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDepth(5);
  }

  hit(player: Player): void {
    if (this.isOnCooldown) return;

    // Trigger cooldown
    this.isOnCooldown = true;
    this.setAlpha(0.4);
    this.setTint(0x555555); // dim out

    // Reset player's heat instantly
    player.formMachine.heat.clearHeat();

    // Spawn cold steam particles
    this.spawnCoolParticles();

    // Play visual freeze flash in a radius
    this.spawnCoolBlast();

    // Slow down nearby enemies
    const activeEnemies = (this.scene as any).enemies;
    if (activeEnemies) {
      activeEnemies.getChildren().forEach((enemy: any) => {
        const e = enemy as BaseEnemy;
        if (e.active && e.health > 0) {
          const dist = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
          if (dist <= 250) {
            e.applySlow(3000, 0.40); // slow by 60% (speed multiplier 0.40) for 3 seconds
          }
        }
      });
    }

    // Play cool vent hiss sound
    (this.scene as any).gameAudio?.playShieldBlock?.(); // using high metal chime as placeholder/base sound

    // Recharge timer
    this.scene.time.delayedCall(this.rechargeTime, () => {
      if (this.active) {
        this.isOnCooldown = false;
        this.setAlpha(1.0);
        this.clearTint();
        // Play chime to indicate ready
        (this.scene as any).gameAudio?.playCardCollect?.();
      }
    });
  }

  private spawnCoolParticles(): void {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 180);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const p = this.scene.add.image(this.x, this.y, 'particle-smoke');
      p.setTint(0x00d2d3);
      p.setAlpha(0.8);
      p.setDepth(15);
      p.setScale(Phaser.Math.FloatBetween(0.2, 0.6));

      this.scene.tweens.add({
        targets: p,
        x: this.x + vx * 0.8,
        y: this.y + vy * 0.8,
        scale: 1.5,
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        onComplete: () => p.destroy()
      });
    }
  }

  private spawnCoolBlast(): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(2, 0x00d2d3, 0.8);
    ring.strokeCircle(this.x, this.y, 10);
    ring.setDepth(14);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 25, // expand outward to 250px radius
      scaleY: 25,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }
}
