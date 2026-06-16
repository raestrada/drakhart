import Phaser from 'phaser';
import { BaseEnemy } from './BaseEnemy';
import { Player } from '../Player';
import { t } from '../../i18n';
import { spawnDeathExplosion, spawnProjectileTrail } from '../../effects/Particles';

type BossPhase = 'phase1' | 'phase2' | 'dead';

export class Boss extends BaseEnemy {
  private phase: BossPhase = 'phase1';
  private bossPhase1Health = 180;
  private bossPhase2Health = 120;
  private totalMaxHealth = this.bossPhase1Health + this.bossPhase2Health;
  private moveDirection = 1;
  private moveTimer = 0;
  private fireTimer = 0;
  private bossBullets: Phaser.Physics.Arcade.Group;
  private nameText: Phaser.GameObjects.Text | null = null;
  private healthBarBg: Phaser.GameObjects.Rectangle | null = null;
  private healthBarFill: Phaser.GameObjects.Rectangle | null = null;
  private bossActive = false;

  constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
    super(scene, x, y, 'boss', player, {
      health: 300,
      speed: 90,
      detectRange: 9999,
      attackRange: 150,
      damage: 20,
      attackCooldown: 1500,
    });

    this.health = this.totalMaxHealth;
    this.maxHealth = this.totalMaxHealth;
    this.bossPhase1Health = 180;
    this.bossPhase2Health = 120;

    this.bossBullets = scene.physics.add.group({
      allowGravity: false,
      maxSize: 10,
    });

    (this.body as Phaser.Physics.Arcade.Body).setSize(110, 110);
    (this.body as Phaser.Physics.Arcade.Body).setOffset(9, 9);
    (this.body as Phaser.Physics.Arcade.Body).allowGravity = false;
  }

  get bullets(): Phaser.Physics.Arcade.Group {
    return this.bossBullets;
  }

  activate(): void {
    this.bossActive = true;
    this.showUI();
  }

  private showUI(): void {
    const cam = this.scene.cameras.main;
    const uiX = cam.scrollX + 400;
    const uiY = cam.scrollY + 30;

    this.nameText = this.scene.add
      .text(uiX, uiY, t('boss.name'), {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#cc3333',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.healthBarBg = this.scene.add
      .rectangle(uiX, uiY + 20, 200, 10, 0x333333)
      .setScrollFactor(0);

    const barBorder = this.scene.add
      .rectangle(uiX, uiY + 20, 202, 12)
      .setScrollFactor(0)
      .setStrokeStyle(1, 0x886644);

    this.healthBarFill = this.scene.add
      .rectangle(uiX - 100, uiY + 20, 200, 10, 0xcc3333)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
  }

  private updateUI(): void {
    if (!this.healthBarFill || !this.nameText) return;

    const ratio = Math.max(0, this.health / this.totalMaxHealth);
    this.healthBarFill.width = 200 * ratio;

    if (this.phase === 'phase2') {
      this.nameText.setText(t('boss.phase2'));
      this.nameText.setColor('#ff4466');
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.015);
      this.healthBarFill.setFillStyle(0xff2244, pulse);
    } else {
      const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.006);
      this.healthBarFill.setFillStyle(0xcc3333, pulse);
    }

    if (ratio < 0.3) {
      this.healthBarFill.setFillStyle(0xff1111, 0.7 + 0.3 * Math.sin(Date.now() * 0.02));
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    if (!this.bossActive || this.phase === 'dead') return;

    this.updateMovement(delta);
    this.updateFireAttack(time);
    this.updateUI();
  }

  private updateMovement(delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.moveTimer += delta / 1000;

    if (this.moveTimer > 2.0) {
      this.moveTimer = 0;
      this.moveDirection *= -1;
    }

    body.setVelocityX(this.moveDirection * this.moveSpeed);

    const bobSpeed = this.phase === 'phase2' ? 0.0015 : 0.001;
    body.setVelocityY(Math.sin(this.scene.time.now * bobSpeed) * 50);
  }

  private updateFireAttack(time: number): void {
    const cooldown = this.phase === 'phase2' ? 2000 : 3000;
    if (time - this.fireTimer < cooldown) return;

    this.fireTimer = time;

    const dir = this.player.x < this.x ? -1 : 1;
    const spawnX = this.x + dir * 50;
    const spawnY = this.y;
    const bullet = this.bossBullets.get(
      spawnX,
      spawnY,
      'bullet-fire'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!bullet) return;

    bullet.enableBody(true, spawnX, spawnY, true, true);
    bullet.setTint(0xcc00cc);
    bullet.setVelocityX(350 * dir);
    bullet.setFlipX(dir < 0);

    this.scene.time.delayedCall(1200, () => {
      if (bullet.active) {
        bullet.disableBody(true, true);
      }
    });
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);

    if (
      this.health > 0 &&
      this.health <= this.bossPhase2Health &&
      this.phase === 'phase1'
    ) {
      this.phase = 'phase2';
      (this.body as Phaser.Physics.Arcade.Body).setSize(90, 90);
      (this.body as Phaser.Physics.Arcade.Body).setOffset(19, 19);
      this.setTint(0xff4444);
      this.moveSpeed *= 1.3;
      this.attackCooldown *= 0.7;
      this.scene.cameras.main.shake(500, 0.008);
    }
  }

  protected die(): void {
    this.phase = 'dead';
    this.isActive = false;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setTint(0x333333);

    this.scene.cameras.main.shake(1000, 0.015);
    this.scene.cameras.main.flash(500, 255, 100, 0);
    spawnDeathExplosion(this.scene, this.x, this.y);

    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.healthBarFill) this.healthBarFill.destroy();
    if (this.nameText) this.nameText.destroy();

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1000,
      onComplete: () => {
        this.showCompleteMessage();
        this.destroy();
      },
    });
  }

  private showCompleteMessage(): void {
    const cam = this.scene.cameras.main;
    const cx = cam.scrollX + 400;
    const cy = cam.scrollY + 240;

    this.scene.add
      .text(cx, cy, t('ui.prototypeComplete'), {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#cc3333',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
  }

  destroy(fromScene?: boolean): void {
    this.bossBullets.destroy(true);
    if (this.healthBarBg) this.healthBarBg.destroy();
    if (this.healthBarFill) this.healthBarFill.destroy();
    if (this.nameText) this.nameText.destroy();
    super.destroy(fromScene);
  }
}
