import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { distanceBetween } from '../../utils/helpers';
import { spawnProjectileTrail, spawnProjectileImpact, spawnDeathExplosion } from '../../effects/Particles';

export class FlyingEnemy extends BaseEnemy {
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'enemy-sentry', player, {
      health: 20,
      speed: 80,
      detectRange: 380,
      attackRange: 280,
      damage: 10,
      attackCooldown: 1800,
    });

    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = distanceBetween(this.x, this.y, this.player.x, this.player.y);
    const dirX = this.player.x < this.x ? -1 : 1;

    this.setFlipX(dirX < 0);

    if (dist <= this.detectRange) {
      const dx = this.player.x - this.x;
      const dy = (this.player.y - 12) - this.y;
      const angle = Math.atan2(dy, dx);

      body.setVelocityX(Math.cos(angle) * this.moveSpeed);
      body.setVelocityY(Math.sin(angle) * this.moveSpeed);

      if (dist <= this.attackRange) {
        if (time - this.lastAttackTime > this.attackCooldown) {
          this.lastAttackTime = time;
          this.doAttack();
        }
      }
    } else {
      body.setVelocityX(0);
      body.setVelocityY(Math.sin(time * 0.0035) * 15);
    }
  }

  protected doAttack(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    // Telegraph: glow briefly
    this.setTint(0xcc00ff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(150, () => {
      if (!this.active || this.health <= 0) return;
      this.clearTint();
      this.fireBullet();
    });
  }

  private fireBullet(): void {
    if (!this.active || !this.isActive || this.health <= 0) return;

    const scene = this.scene;

    if (scene.lights) {
      const flash = scene.lights.addLight(this.x, this.y, 50, 0xcc00ff, 0.6);
      scene.time.delayedCall(80, () => scene.lights.removeLight(flash));
    }

    const bullet = scene.physics.add.sprite(this.x, this.y, 'bullet-fire');
    bullet.setTint(0xcc00ff);
    bullet.setScale(0.8);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    (bullet.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const angle = Math.atan2(dy, dx);
    bullet.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);

    const trail = spawnProjectileTrail(scene, bullet.x, bullet.y, [0xcc00ff, 0xff44ff], 250);
    const trailTimer = scene.time.addEvent({
      delay: 30,
      repeat: 80,
      callback: () => {
        if (!bullet.active || !trail.active) return;
        trail.setPosition(bullet.x, bullet.y);
      },
    });

    scene.physics.add.overlap(this.player, bullet, () => {
      if (!bullet.active) return;
      trailTimer.destroy();
      const impactX = bullet.x;
      const impactY = bullet.y;
      if (trail.active) { trail.stop(); scene.time.delayedCall(400, () => { if (trail.active) trail.destroy(); }); }
      bullet.destroy();
      spawnProjectileImpact(scene, impactX, impactY, [0xcc00ff, 0xff44ff], 6);
      const knockDir = this.player.x < this.x ? -1 : 1;
      this.player.takeDamage(this.attackDamage, knockDir);
    });

    scene.time.delayedCall(2500, () => {
      trailTimer.destroy();
      if (trail.active) { trail.stop(); scene.time.delayedCall(400, () => { if (trail.active) trail.destroy(); }); }
      if (bullet.active) bullet.destroy();
    });
  }

  protected die(): void {
    spawnDeathExplosion(this.scene, this.x, this.y);
    (this.scene as any).gameAudio?.playEnemyDeath();
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x663388);

    const scene = this.scene;
    const ex = this.x;
    const ey = this.y;

    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(i * 60, () => {
        const dx = ex + Phaser.Math.Between(-20, 20);
        const debris = scene.add.rectangle(dx, ey + Phaser.Math.Between(-10, 10), 4, 4, 0x8844cc, 0.8);
        debris.setBlendMode(Phaser.BlendModes.ADD);
        scene.physics.add.existing(debris);
        const dBody = debris.body as Phaser.Physics.Arcade.Body;
        if (dBody) {
          dBody.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-120, -40));
          dBody.setGravityY(200);
        }
        scene.tweens.add({
          targets: debris,
          alpha: 0,
          duration: 800,
          onComplete: () => debris.destroy(),
        });
      });
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
      onComplete: () => this.destroy(),
    });
  }
}
