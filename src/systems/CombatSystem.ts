import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FormState } from './FormStateMachine';
import {
  SWORD_DAMAGE,
  SWORD_RANGE,
  SWORD_DURATION,
  SWORD_COOLDOWN,
  MECHA_SWORD_DAMAGE,
  MECHA_SWORD_RANGE,
  MECHA_SWORD_DURATION,
  MECHA_SWORD_COOLDOWN,
  FIRE_DAMAGE,
  FIRE_SPEED,
  FIRE_LIFETIME,
  FIRE_COOLDOWN,
} from '../utils/constants';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private swordActive = false;
  private swordCooldown = false;
  private fireCooldown = false;
  private fireBullets: Phaser.Physics.Arcade.Group;
  private swordHitbox: Phaser.GameObjects.Image | null = null;
  private activeDamage = SWORD_DAMAGE;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.fireBullets = scene.physics.add.group({
      allowGravity: false,
      maxSize: 15,
    });
  }

  get bullets(): Phaser.Physics.Arcade.Group {
    return this.fireBullets;
  }

  attack(state: FormState, facingRight: boolean): void {
    if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
      this.swordAttack(facingRight);
    } else if (state === FormState.MECHA) {
      this.mechaSwordAttack(facingRight);
    } else if (state === FormState.DRAGON) {
      this.fireBreath(facingRight);
    }
  }

  fireBreathAuto(facingRight: boolean): void {
    if (this.fireCooldown) return;
    if (!this.player.formMachine.energy.canShoot()) return;

    this.fireCooldown = true;
    this.player.formMachine.energy.consumeShoot();
    (this.scene as any).gameAudio?.playFireball();

    const dir = facingRight ? 1 : -1;
    const bullet = this.fireBullets.get(
      this.player.x + dir * 44,
      this.player.y - 4,
      'bullet-fire'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!bullet) {
      this.fireCooldown = false;
      return;
    }

    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setVelocityX(FIRE_SPEED * dir);
    bullet.setFlipX(!facingRight);
    bullet.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.time.delayedCall(FIRE_LIFETIME, () => {
      if (bullet.active) {
        bullet.setActive(false);
        bullet.setVisible(false);
      }
    });

    this.scene.time.delayedCall(FIRE_COOLDOWN, () => {
      this.fireCooldown = false;
    });
  }

  private swordAttack(facingRight: boolean): void {
    if (this.swordCooldown || this.swordActive) return;

    this.swordActive = true;
    this.swordCooldown = true;
    this.activeDamage = SWORD_DAMAGE;
    (this.scene as any).gameAudio?.playAttack();

    // Trigger slide tween
    const dir = facingRight ? 1 : -1;
    this.scene.tweens.add({
      targets: this.player,
      x: this.player.x + dir * 12,
      duration: 60,
      yoyo: true,
      ease: 'Power3',
    });

    // Animation locking & texture cycling
    this.player.isAnimatingAttack = true;
    this.player.setTexture('h-attack-0');
    
    this.scene.time.delayedCall(SWORD_DURATION / 3, () => {
      if (this.player.active && this.player.isAnimatingAttack) {
        this.player.setTexture('h-attack-1');
      }
    });

    this.scene.time.delayedCall((2 * SWORD_DURATION) / 3, () => {
      if (this.player.active && this.player.isAnimatingAttack) {
        this.player.setTexture('h-attack-2');
      }
    });

    this.scene.time.delayedCall(SWORD_DURATION, () => {
      this.player.isAnimatingAttack = false;
    });

    // Spawn slash image
    const px = this.player.x + dir * (SWORD_RANGE / 2);
    const py = this.player.y;

    const slash = this.scene.add.image(px, py, 'sword-slash');
    slash.setDisplaySize(SWORD_RANGE + 12, 26);
    slash.setAlpha(0.85);
    slash.setBlendMode(Phaser.BlendModes.ADD);
    if (!facingRight) slash.setFlipX(true);

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 1.2,
      duration: SWORD_DURATION,
      onComplete: () => {
        slash.destroy();
      },
    });

    this.swordHitbox = slash;

    this.scene.time.delayedCall(SWORD_DURATION, () => {
      if (this.swordHitbox) {
        this.swordHitbox.destroy();
        this.swordHitbox = null;
      }
      this.swordActive = false;
    });

    this.scene.time.delayedCall(SWORD_COOLDOWN, () => {
      this.swordCooldown = false;
    });
  }

  private mechaSwordAttack(facingRight: boolean): void {
    if (this.swordCooldown || this.swordActive) return;
    if (!this.player.formMachine.heat.canAct) return;

    this.swordActive = true;
    this.swordCooldown = true;
    this.activeDamage = MECHA_SWORD_DAMAGE;
    (this.scene as any).gameAudio?.playHeavyAttack();

    this.player.formMachine.heat.addHeat(15);

    // Trigger heavy mecha slide
    const dir = facingRight ? 1 : -1;
    this.scene.tweens.add({
      targets: this.player,
      x: this.player.x + dir * 18,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
    });

    // Mecha Screenshake on swing landing
    this.scene.time.delayedCall(120, () => {
      this.scene.cameras.main.shake(140, 0.005);
    });

    // Animation locking & texture cycling
    this.player.isAnimatingAttack = true;
    this.player.setTexture('m-attack-0');
    
    this.scene.time.delayedCall(MECHA_SWORD_DURATION / 3, () => {
      if (this.player.active && this.player.isAnimatingAttack) {
        this.player.setTexture('m-attack-1');
      }
    });

    this.scene.time.delayedCall((2 * MECHA_SWORD_DURATION) / 3, () => {
      if (this.player.active && this.player.isAnimatingAttack) {
        this.player.setTexture('m-attack-2');
      }
    });

    this.scene.time.delayedCall(MECHA_SWORD_DURATION, () => {
      this.player.isAnimatingAttack = false;
    });

    // Spawn giant mecha slash image
    const px = this.player.x + dir * (MECHA_SWORD_RANGE / 2);
    const py = this.player.y;

    const slash = this.scene.add.image(px, py, 'sword-slash-heavy');
    slash.setDisplaySize(MECHA_SWORD_RANGE + 20, 40);
    slash.setAlpha(0.9);
    slash.setBlendMode(Phaser.BlendModes.ADD);
    if (!facingRight) slash.setFlipX(true);

    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: MECHA_SWORD_DURATION,
      onComplete: () => {
        slash.destroy();
      },
    });

    this.swordHitbox = slash;

    this.scene.time.delayedCall(MECHA_SWORD_DURATION, () => {
      if (this.swordHitbox) {
        this.swordHitbox.destroy();
        this.swordHitbox = null;
      }
      this.swordActive = false;
    });

    this.scene.time.delayedCall(MECHA_SWORD_COOLDOWN, () => {
      this.swordCooldown = false;
    });
  }

  isSwordActive(): boolean {
    return this.swordActive;
  }

  getSwordBounds(): Phaser.Geom.Rectangle | null {
    if (!this.swordActive || !this.swordHitbox) return null;
    return this.swordHitbox.getBounds();
  }

  getSwordDamage(): number {
    return this.activeDamage;
  }

  private fireBreath(facingRight: boolean): void {
    if (this.fireCooldown) return;
    if (!this.player.formMachine.energy.canShoot()) return;

    this.fireCooldown = true;
    this.player.formMachine.energy.consumeShoot();
    (this.scene as any).gameAudio?.playFireball();

    const dir = facingRight ? 1 : -1;
    const spawnX = this.player.x + dir * 44;
    const spawnY = this.player.y - 4;

    const bullet = this.fireBullets.get(spawnX, spawnY, 'bullet-fire') as Phaser.Physics.Arcade.Sprite;

    if (!bullet) return;

    bullet.enableBody(true, spawnX, spawnY, true, true);
    bullet.setVelocityX(FIRE_SPEED * dir);
    bullet.setFlipX(!facingRight);
    bullet.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.time.delayedCall(FIRE_LIFETIME, () => {
      if (bullet.active) {
        bullet.disableBody(true, true);
      }
    });

    this.scene.time.delayedCall(FIRE_COOLDOWN, () => {
      this.fireCooldown = false;
    });
  }

  getFireDamage(): number {
    return FIRE_DAMAGE;
  }

  update(): void {
    const cam = this.scene.cameras.main;
    this.fireBullets.getChildren().forEach((bullet) => {
      const b = bullet as Phaser.Physics.Arcade.Sprite;
      if (!b.active) return;
      if (
        b.x < cam.scrollX - 100 ||
        b.x > cam.scrollX + cam.width + 100 ||
        b.y < cam.scrollY - 100 ||
        b.y > cam.scrollY + cam.height + 100
      ) {
        b.disableBody(true, true);
      }
    });
  }

  destroy(): void {
    this.fireBullets.destroy(true);
    if (this.swordHitbox) {
      this.swordHitbox.destroy();
      this.swordHitbox = null;
    }
  }
}
