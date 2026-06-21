import Phaser from 'phaser';
import { getSceneAudio } from '../scenes/BaseLevelScene';
import { Player } from './Player';

export class EnergyPickup extends Phaser.Physics.Arcade.Sprite {
  private glowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'energy-pickup');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.createGlow(scene);
  }

  private createGlow(scene: Phaser.Scene): void {
    if (!scene.textures.exists('px-4')) return;
    this.glowEmitter = scene.add.particles(this.x, this.y, 'px-4', {
      speed: { min: 4, max: 16 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: [0x00ccff, 0x44ddff, 0x88eeff],
      lifespan: { min: 500, max: 1000 },
      frequency: 100,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.glowEmitter && this.glowEmitter.active) {
      this.glowEmitter.setPosition(this.x, this.y);
    }
  }

  collect(player: Player, onCollectBoost?: () => void): void {
    if (this.glowEmitter) {
      this.glowEmitter.stop();
      this.scene.time.delayedCall(400, () => {
        if (this.glowEmitter) this.glowEmitter.destroy();
      });
    }

    player.formMachine.energy.addEnergy(35);

    if (onCollectBoost) {
      onCollectBoost();
    }

    const text = this.scene.add.text(
      this.x,
      this.y - 24,
      '+35 ENERGY',
      {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#00ffff',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1200,
      onComplete: () => text.destroy()
    });

    getSceneAudio(this.scene)?.playCardCollect?.();
    this.scene.cameras.main.flash(200, 0, 180, 255);

    this.destroy();
  }
}
