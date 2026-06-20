import Phaser from 'phaser';
import { Player } from './Player';
import { t } from '../i18n';
import { spawnDeathExplosion, spawnEnergyShockwave } from '../effects/Particles';
import { applyGlow } from '../effects/CameraFilters';

export class SkyCore extends Phaser.Physics.Arcade.Sprite {
  private glowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'sky-core');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this,
      y: y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: this,
      alpha: 0.5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createGlowAura(scene);
    applyGlow(this, 0x44aaff, 3, 0, 2.5, false, 10, 20);
  }

  private createGlowAura(scene: Phaser.Scene): void {
    if (!scene.textures.exists('px-4')) return;

    this.glowEmitter = scene.add.particles(this.x, this.y, 'px-4', {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0x44aaff, 0x66ccff, 0xaaddff],
      lifespan: { min: 600, max: 1200 },
      frequency: 80,
      blendMode: Phaser.BlendModes.ADD,
      follow: this,
      followOffset: { x: 0, y: 0 },
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.glowEmitter && this.glowEmitter.active) {
      this.glowEmitter.setPosition(this.x, this.y);
    }
  }

  collect(player: Player): void {
    player.formMachine.unlockDragon();

    if (this.glowEmitter) {
      this.glowEmitter.stop();
      this.scene.time.delayedCall(600, () => {
        if (this.glowEmitter) this.glowEmitter.destroy();
      });
    }

    spawnDeathExplosion(this.scene, this.x, this.y);
    spawnEnergyShockwave(this.scene, this.x, this.y, 0x44aaff);

    this.scene.cameras.main.flash(400, 100, 180, 255);
    this.scene.cameras.main.shake(500, 0.008);

    const text = this.scene.add.text(
      this.x,
      this.y - 30,
      t('story.skyCoreFound') || 'The sky remembers...',
      {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#44aaff',
      }
    ).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });

    this.destroy();
  }
}
