import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FormState } from './FormStateMachine';
import { HitstopSystem, HITSTOP } from './HitstopSystem';
import { spawnProjectileTrail } from '../effects/Particles';
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
  public hitstop: HitstopSystem;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.hitstop = new HitstopSystem(scene);

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



  private swordAttack(facingRight: boolean): void {
    if (this.swordCooldown || this.swordActive) return;

    this.swordActive = true;
    this.swordCooldown = true;
    this.activeDamage = SWORD_DAMAGE;
    (this.scene as any).gameAudio?.playAttack();

    this.hitstop.freeze(HITSTOP.SWORD_LIGHT.duration, HITSTOP.SWORD_LIGHT.intensity);

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
    this.player.play('h-attack');

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

    // Dynamic glowing spark trail along the slash range
    const sparks = this.scene.add.particles(px, py, 'px-4', {
      speed: { min: 20, max: 80 },
      scale: { start: 1.0, end: 0 },
      alpha: { start: 0.85, end: 0 },
      tint: [0xffffff, 0x99ffee, 0x22ffaa],
      lifespan: { min: 100, max: 250 },
      frequency: 15,
      emitting: true,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-SWORD_RANGE / 2, -10, SWORD_RANGE, 20)
      } as any
    });
    this.scene.time.delayedCall(SWORD_DURATION, () => sparks.destroy());

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

    this.hitstop.freeze(HITSTOP.MECHA_CLAYMORE.duration, HITSTOP.MECHA_CLAYMORE.intensity);

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
    this.player.play('m-attack');

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

    // Glowing mechanical energist spark trail along the heavy slash range
    const sparks = this.scene.add.particles(px, py, 'px-4', {
      speed: { min: 40, max: 120 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffffff, 0xff5533, 0xff0000], // Crimson red / orange sparks
      lifespan: { min: 150, max: 350 },
      frequency: 10,
      emitting: true,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-MECHA_SWORD_RANGE / 2, -16, MECHA_SWORD_RANGE, 32)
      } as any
    });
    this.scene.time.delayedCall(MECHA_SWORD_DURATION, () => sparks.destroy());

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
    
    // Rotate offset to match current dragon angle
    const rad = Phaser.Math.DegToRad(this.player.angle);
    const offsetX = dir * 44;
    const offsetY = -4;

    const spawnX = this.player.x + (offsetX * Math.cos(rad) - offsetY * Math.sin(rad));
    const spawnY = this.player.y + (offsetX * Math.sin(rad) + offsetY * Math.cos(rad));

    const bullet = this.fireBullets.get(spawnX, spawnY, 'bullet-fire') as Phaser.Physics.Arcade.Sprite;

    // fireBreathAuto removed – manual fire handled by fireBreath()

    if (!bullet) {
      this.fireCooldown = false;
      return;
    }

    bullet.enableBody(true, spawnX, spawnY, true, true);
    
    // Calculate polar angle for bullet velocity
    const angleDeg = facingRight ? this.player.angle : (180 + this.player.angle);
    const bulletAngleRad = Phaser.Math.DegToRad(angleDeg);

    bullet.setVelocity(FIRE_SPEED * Math.cos(bulletAngleRad), FIRE_SPEED * Math.sin(bulletAngleRad));
    bullet.setRotation(bulletAngleRad);
    bullet.setFlipX(false);
    bullet.setBlendMode(Phaser.BlendModes.ADD);

    const trail = spawnProjectileTrail(this.scene, bullet.x, bullet.y, [0xff4400, 0xff8800, 0xffcc00], 250);
    bullet.setData('trail', trail);

    const trailTimer = this.scene.time.addEvent({
      delay: 30,
      repeat: Math.ceil(FIRE_LIFETIME / 30),
      callback: () => {
        if (!bullet.active) return;
        trail.setPosition(bullet.x, bullet.y);
      },
    });

    this.scene.time.delayedCall(FIRE_LIFETIME, () => {
      trailTimer.destroy();
      if (trail.active) { trail.stop(); this.scene.time.delayedCall(400, () => { if (trail.active) trail.destroy(); }); }
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
    this.hitstop.destroy();
    this.fireBullets.destroy(true);
    if (this.swordHitbox) {
      this.swordHitbox.destroy();
      this.swordHitbox = null;
    }
  }
}
