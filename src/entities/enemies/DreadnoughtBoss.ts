import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { spawnDeathExplosion } from '../../effects/Particles';

class DreadnoughtCannon extends BaseEnemy {
  public isTop: boolean;
  private boss: DreadnoughtBoss;
  private fireTimer = 0;
  private hpBar: Phaser.GameObjects.Rectangle | null = null;
  private hpFill: Phaser.GameObjects.Rectangle | null = null;
  private glowLight: any = null;

  constructor(scene: Phaser.Scene, x: number, y: number, isTop: boolean, boss: DreadnoughtBoss, player: Player) {
    super(scene, x, y, 'enemy-mecha', player, {
      health: 120,
      speed: 0,
      detectRange: 9999,
      attackRange: 9999,
      damage: 12,
      attackCooldown: 1500
    });
    this.isTop = isTop;
    this.boss = boss;
    this.setScale(2.5);
    this.setTint(isTop ? 0xff3333 : 0x3399ff);
    this.setDepth(boss.depth + 10);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.body as Phaser.Physics.Arcade.Body).setSize(50, 50);

    // Health bar above cannon
    this.hpBar = scene.add.rectangle(x, y - 40, 60, 5, 0x000000, 0.7).setDepth(boss.depth + 11);
    this.hpFill = scene.add.rectangle(x - 30, y - 40, 60, 5, isTop ? 0xff4444 : 0x44aaff)
      .setOrigin(0, 0.5).setDepth(boss.depth + 12);

    // Pulsing glow light
    if (scene.lights) {
      this.glowLight = scene.lights.addLight(x, y, 100, isTop ? 0xff3333 : 0x3399ff, 0.8);
      scene.tweens.add({
        targets: this.glowLight,
        intensity: { from: 0.5, to: 1.2 },
        radius: { from: 70, to: 110 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Pulsing alpha on the cannon sprite itself
    scene.tweens.add({
      targets: this,
      alpha: { from: 0.8, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.health <= 0) return;

    // Stay fixed relative to boss
    this.x = this.boss.x;
    this.y = this.boss.y + (this.isTop ? -110 : 110);

    // Update health bar
    if (this.hpBar && this.hpFill) {
      this.hpBar.setPosition(this.x, this.y - 40);
      this.hpFill.setPosition(this.x - 30, this.y - 40);
      this.hpFill.width = 60 * Math.max(0, this.health / this.maxHealth);
    }
    if (this.glowLight) {
      this.glowLight.x = this.x;
      this.glowLight.y = this.y;
    }

    // Fire bullets
    if (time - this.fireTimer > this.attackCooldown) {
      this.fireTimer = time;
      this.fireBullet();
    }
  }

  private fireBullet(): void {
    const bulletSpeed = 220;
    const angles = [-0.12, 0, 0.12];
    angles.forEach(angleOffset => {
      const bullet = this.scene.physics.add.sprite(this.x - 50, this.y, 'bullet-fire');
      bullet.setTint(this.isTop ? 0xff3333 : 0x3399ff);
      bullet.setScale(1.0);
      bullet.setBlendMode(Phaser.BlendModes.ADD);
      const body = bullet.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;

      const dx = this.player.x - this.x;
      const dy = this.player.y - this.y;
      const baseAngle = Math.atan2(dy, dx);
      const angle = baseAngle + angleOffset;

      bullet.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);

      this.scene.physics.add.overlap(this.player, bullet, () => {
        if (!bullet.active) return;
        bullet.destroy();
        this.player.takeDamage(this.attackDamage, -1);
      });

      this.scene.time.delayedCall(4000, () => {
        if (bullet.active) bullet.destroy();
      });
    });
  }

  die(): void {
    const scene = this.scene;
    if (this.glowLight && scene?.lights) scene.lights.removeLight(this.glowLight);
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpFill) this.hpFill.destroy();
    spawnDeathExplosion(scene, this.x, this.y);
    this.boss.onCannonDestroyed();
    super.die();
  }

  destroy(fromScene?: boolean): void {
    const scene = this.scene;
    if (this.glowLight && scene?.lights) scene.lights.removeLight(this.glowLight);
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpFill) this.hpFill.destroy();
    super.destroy(fromScene);
  }
}

export class DreadnoughtBoss extends BaseEnemy {
  private topCannon: DreadnoughtCannon | null = null;
  private bottomCannon: DreadnoughtCannon | null = null;
  private cannonsActive = 2;
  public phase: 'intro' | 'shielded' | 'vulnerable' | 'dead' = 'intro';
  private fireTimer = 0;
  private fixedX: number;
  private fixedY: number;
  private coreLight: any = null;
  private bossHpBar: Phaser.GameObjects.Rectangle | null = null;
  private bossHpFill: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'enemy-gunship', player, {
      health: 600,
      speed: 0,
      detectRange: 9999,
      attackRange: 9999,
      damage: 20,
      attackCooldown: 1200
    });

    this.fixedX = x;
    this.fixedY = y;

    this.setScale(5.0);
    this.setAlpha(1);
    this.setTint(0xaabbcc, 0x667788, 0x334455, 0x8899aa);
    this.setDepth(10);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    (this.body as Phaser.Physics.Arcade.Body).setSize(40, 40);
    (this.body as Phaser.Physics.Arcade.Body).enable = false; // Shielded: no collision

    this.bossHpBar = scene.add.rectangle(x, y - 80, 200, 8, 0x000000, 0.8).setDepth(20);
    this.bossHpFill = scene.add.rectangle(x - 100, y - 80, 200, 8, 0x8899aa)
      .setOrigin(0, 0.5).setDepth(21).setVisible(false);
  }

  public activate(): void {
    this.phase = 'shielded';
    this.topCannon = new DreadnoughtCannon(this.scene, this.x, this.y - 110, true, this, this.player);
    this.bottomCannon = new DreadnoughtCannon(this.scene, this.x, this.y + 110, false, this, this.player);

    const gameScene = this.scene as any;
    if (gameScene.addEnemyObject) {
      gameScene.addEnemyObject(this.topCannon);
      gameScene.addEnemyObject(this.bottomCannon);
    } else if (gameScene.enemies) {
      gameScene.enemies.add(this.topCannon);
      gameScene.enemies.add(this.bottomCannon);
    }
  }

  public onCannonDestroyed(): void {
    this.cannonsActive--;
    if (this.cannonsActive <= 0 && this.phase === 'shielded') {
      this.phase = 'vulnerable';
      this.setAlpha(1);
      this.setTint(0xff5500);
      (this.body as Phaser.Physics.Arcade.Body).enable = true; // Now hittable!
      this.scene.cameras.main.flash(500, 255, 100, 0);
      this.scene.cameras.main.shake(800, 0.02);

      // Permanent pulsing glow on core
      this.scene.tweens.add({
        targets: this,
        alpha: { from: 1, to: 0.5 },
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      if (this.scene.lights) {
        this.coreLight = this.scene.lights.addLight(this.x, this.y, 250, 0xff6600, 2.0);
        this.scene.tweens.add({
          targets: this.coreLight,
          intensity: { from: 1.5, to: 3.0 },
          radius: { from: 180, to: 280 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      const cam = this.scene.cameras.main;
      const hint = this.scene.add.text(
        cam.scrollX + cam.width / 2, cam.scrollY + cam.height * 0.2,
        'CORE EXPOSED — DESTROY IT!',
        { fontSize: '20px', fontFamily: 'monospace', color: '#ff6600', stroke: '#000000', strokeThickness: 4 }
      ).setOrigin(0.5).setScrollFactor(0).setDepth(500).setAlpha(0);

      this.scene.tweens.add({
        targets: hint,
        alpha: { from: 0, to: 1 },
        y: hint.y - 10,
        duration: 200,
        yoyo: true,
        hold: 2500,
        onComplete: () => hint.destroy(),
      });
    }
  }

  takeDamage(amount: number, knockDir: number = 0): void {
    if (this.phase === 'shielded') {
      // Bullets pass through — no spark, no damage, no pierce consumed
      return;
    }

    if (this.phase !== 'vulnerable') return;

    super.takeDamage(amount);

    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active && this.phase === 'vulnerable') this.setTint(0xff7700);
    });
  }

  preUpdate(time: number, delta: number): void {
    if (!this.active || this.phase === 'dead') return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // COMPLETELY STATIONARY — no movement at all
    body.setVelocityX(0);
    body.setVelocityY(0);
    this.x = this.fixedX;
    this.y = this.fixedY;

    if (this.coreLight) {
      this.coreLight.x = this.x;
      this.coreLight.y = this.y;
    }
    if (this.bossHpBar) {
      this.bossHpBar.setPosition(this.x, this.y - 90);
      this.bossHpFill?.setPosition(this.x - 100, this.y - 90);
      this.bossHpFill!.width = 200 * Math.max(0, this.health / this.maxHealth);
      const show = this.phase === 'vulnerable';
      this.bossHpBar.setVisible(show);
      this.bossHpFill?.setVisible(show);
    }

    if (this.phase === 'vulnerable') {
      if (time - this.fireTimer > this.attackCooldown) {
        this.fireTimer = time;
        this.fireCoreLaser();
      }
    }
  }

  private fireCoreLaser(): void {
    const laser = this.scene.add.rectangle(this.x - 100, this.y, 100, 30, 0xff4400);
    laser.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.physics.add.existing(laser);
    const body = laser.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setVelocityX(-500);

    this.scene.tweens.add({
      targets: laser,
      width: 300,
      duration: 200
    });

    this.scene.physics.add.overlap(this.player, laser, () => {
      if (!laser.active) return;
      this.player.takeDamage(this.attackDamage, -1);
    });

    this.scene.time.delayedCall(1500, () => {
      if (laser.active) laser.destroy();
    });
  }

  protected die(): void {
    this.phase = 'dead';
    this.isActive = false;
    if (this.coreLight && this.scene.lights) this.scene.lights.removeLight(this.coreLight);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x222222);

    this.scene.cameras.main.shake(2000, 0.03);
    this.scene.cameras.main.flash(1000, 255, 50, 0);

    for (let i = 0; i < 15; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        spawnDeathExplosion(this.scene, this.x + Phaser.Math.Between(-100, 100), this.y + Phaser.Math.Between(-100, 100));
      });
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 2500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  destroy(fromScene?: boolean): void {
    const scene = this.scene;
    if (this.coreLight && scene?.lights) scene.lights.removeLight(this.coreLight);
    if (this.bossHpBar) this.bossHpBar.destroy();
    if (this.bossHpFill) this.bossHpFill.destroy();
    super.destroy(fromScene);
  }
}
