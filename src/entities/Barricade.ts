import Phaser from 'phaser';
import { spawnImmuneText } from '../effects/DamageNumbers';

export class Barricade extends Phaser.Physics.Arcade.Sprite {
  public health = 75;
  public alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'barricade');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;

    // Gate: only Mecha claymore deals >= 75 damage and can shatter it
    if (amount < 75) {
      // Immune! Spawn sparks and "IMMUNE" text
      this.spawnImmuneEffects();
      return false;
    }

    this.health -= amount;
    this.setTint(0xff4444);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });

    if (this.health <= 0) {
      this.shatter();
      return true; // Destroyed
    }
    return false;
  }

  private spawnImmuneEffects(): void {
    (this.scene as any).gameAudio?.playEnemyHit();
    spawnImmuneText(this.scene, this.x, this.y - 16);

    // Sparks
    for (let i = 0; i < 4; i++) {
      const spark = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-10, 10),
        this.y + Phaser.Math.Between(-20, 20),
        2, 2, 0x888888, 0.8
      );
      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-20, 20),
        y: spark.y + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 400,
        onComplete: () => spark.destroy()
      });
    }

    // Camera shake (very subtle)
    this.scene.cameras.main.shake(50, 0.001);
  }

  private shatter(): void {
    (this.scene as any).gameAudio?.playDestruction();
    this.alive = false;

    this.scene.cameras.main.shake(200, 0.006);
    this.scene.cameras.main.flash(80, 255, 255, 255);

    // Shockwave ring
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0xffaa44, 0.8);
    ring.strokeCircle(this.x, this.y, 8);
    ring.setDepth(100);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 20,
      scaleY: 20,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    // Dust cloud
    const dustEmitter = this.scene.add.particles(this.x, this.y, 'particle-smoke', {
      speed: { min: 40, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.0, end: 2.5 },
      alpha: { start: 0.5, end: 0 },
      tint: [0x888888, 0xaaaaaa, 0x666666],
      lifespan: { min: 500, max: 1000 },
      quantity: 18,
      emitting: false,
    });
    dustEmitter.explode(18);
    this.scene.time.delayedCall(1200, () => dustEmitter.destroy());

    // Rubble particles
    const platforms = (this.scene as any).platforms;
    for (let i = 0; i < 16; i++) {
      const p = this.scene.add.rectangle(
        this.x + Phaser.Math.Between(-12, 12),
        this.y + Phaser.Math.Between(-28, 28),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(3, 7),
        Phaser.Math.Between(0, 1) ? 0x222226 : 0x33333a,
        0.85
      );
      this.scene.physics.add.existing(p);
      const body = p.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.setVelocity(
          Phaser.Math.Between(-120, 120),
          Phaser.Math.Between(-250, -50)
        );
        body.setGravityY(450);
        body.setBounce(0.55, 0.35);
        if (platforms) {
          this.scene.physics.add.collider(p, platforms);
        }
      }

      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(500, 1000),
        onComplete: () => p.destroy()
      });
    }

    this.destroy();
  }
}
