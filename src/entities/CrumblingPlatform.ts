import Phaser from 'phaser';
import { getSceneAudio } from '../scenes/BaseLevelScene';

export class CrumblingPlatform {
  private scene: Phaser.Scene;
  private sprite: Phaser.Physics.Arcade.Sprite;
  private group: Phaser.Physics.Arcade.StaticGroup;
  private isCrumbling = false;
  private isFallen = false;
  private originalX: number;
  private originalY: number;
  private respawnTimer = 3000;

  constructor(
    scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number
  ) {
    this.scene = scene;
    this.group = group;
    this.originalX = x;
    this.originalY = y;

    this.sprite = group.create(x, y, 'tile-crumbling') as Phaser.Physics.Arcade.Sprite;
    (this.sprite.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
    this.sprite.refreshBody();
  }

  get body(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }

  get active(): boolean {
    return !this.isFallen;
  }

  trigger(): void {
    if (this.isCrumbling || this.isFallen) return;

    this.isCrumbling = true;
    getSceneAudio(this.scene)?.playCrumble?.();

    // Spark glow on edges before crumbling
    for (let i = 0; i < 4; i++) {
      const spark = this.scene.add.rectangle(
        this.sprite.x + Phaser.Math.Between(-20, 20),
        this.sprite.y - 10,
        3, 3, 0xffaa44, 0.8
      );
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(this.sprite.depth + 1);
      this.scene.tweens.add({
        targets: spark,
        y: spark.y - 15,
        alpha: 0,
        duration: 400,
        delay: i * 100,
        onComplete: () => spark.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 3,
      duration: 50,
      yoyo: true,
      repeat: 10,
      ease: 'Sine.easeInOut',
    });

    this.scene.time.delayedCall(1000, () => { this.collapse(); });

    this.scene.time.delayedCall(400, () => { this.sprite.setTint(0x888888); });
    this.scene.time.delayedCall(700, () => { this.sprite.setTint(0x444444); });
  }

  private collapse(): void {
    this.isFallen = true;
    this.sprite.setTint(0x222222);

    getSceneAudio(this.scene)?.playDestruction?.();
    this.scene.cameras.main.shake(80, 0.002);

    // Dust puff
    const dust = this.scene.add.particles(this.sprite.x, this.sprite.y, 'px-4', {
      speed: { min: 20, max: 80 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0x776655, 0x887766, 0x998877],
      lifespan: { min: 300, max: 700 },
      quantity: 12,
      emitting: false,
      gravityY: 30,
    });
    dust.explode(12);
    this.scene.time.delayedCall(800, () => dust.destroy());

    if (this.group && this.group.active && this.sprite && this.sprite.active) {
      try { this.group.remove(this.sprite, true, true); } catch (_) {}
    }

    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y + 200,
      alpha: 0,
      angle: Phaser.Math.Between(-30, 30),
      duration: 600,
      ease: 'Power2',
    });

    // Debris
    for (let i = 0; i < 8; i++) {
      const px = this.sprite.x + Phaser.Math.Between(-16, 16);
      const py = this.sprite.y + Phaser.Math.Between(-4, 4);
      const p = this.scene.add.rectangle(
        px, py,
        Phaser.Math.Between(2, 6),
        Phaser.Math.Between(2, 6),
        Phaser.Math.Between(0, 1) ? 0x776655 : 0x554433
      );
      this.scene.tweens.add({
        targets: p,
        x: px + Phaser.Math.Between(-40, 40),
        y: py + Phaser.Math.Between(40, 120),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(400, 800),
        onComplete: () => p.destroy(),
      });
    }

    this.scene.time.delayedCall(this.respawnTimer, () => {
      this.respawn();
    });
  }

  private respawn(): void {
    this.isFallen = false;
    this.isCrumbling = false;
    this.sprite.clearTint();
    this.sprite.setAlpha(1);
    this.sprite.setAngle(0);
    this.sprite.setPosition(this.originalX, this.originalY);

    if (this.group && this.group.active && this.sprite && this.sprite.active) {
      try {
        this.group.add(this.sprite);
        this.sprite.body!.enable = true;
        (this.sprite.body as Phaser.Physics.Arcade.StaticBody).checkCollision.down = false;
        this.sprite.refreshBody();
      } catch (_) {}
    }

    // Materialization effect
    const ring = this.scene.add.graphics();
    ring.lineStyle(2, 0x888888, 0.6);
    ring.strokeCircle(this.sprite.x, this.sprite.y, 5);
    ring.setDepth(this.sprite.depth + 1);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0, to: 1 },
      duration: 300,
      delay: 100,
    });
  }
}
