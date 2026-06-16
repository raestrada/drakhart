import Phaser from 'phaser';

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

    // Shake tween
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 3,
      duration: 50,
      yoyo: true,
      repeat: 10,
      ease: 'Sine.easeInOut',
    });

    // Crack and fall after 1 second
    this.scene.time.delayedCall(1000, () => {
      this.collapse();
    });

    // Crack tint
    this.scene.time.delayedCall(400, () => {
      this.sprite.setTint(0x888888);
    });
    this.scene.time.delayedCall(700, () => {
      this.sprite.setTint(0x444444);
    });
  }

  private collapse(): void {
    this.isFallen = true;
    this.sprite.setTint(0x222222);

    if (this.group && this.group.active && this.sprite && this.sprite.active) {
      try {
        this.group.remove(this.sprite, true, true);
      } catch (_) {
        // Group or sprite may have been destroyed during delayed call
      }
    }

    // Fall tween + particles
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y + 200,
      alpha: 0,
      angle: Phaser.Math.Between(-30, 30),
      duration: 600,
      ease: 'Power2',
    });

    // Debris particles
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

    // Respawn after timer
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

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0, to: 1 },
      duration: 300,
    });
  }
}
