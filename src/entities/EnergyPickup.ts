import Phaser from 'phaser';
import { Player } from './Player';

export class EnergyPickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'energy-pickup');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body

    // Floating tween
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Rotation/pulsing alpha tween
    scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  collect(player: Player, onCollectBoost?: () => void): void {
    // Add energy to player
    player.formMachine.energy.addEnergy(35);

    // Apply forward push callback
    if (onCollectBoost) {
      onCollectBoost();
    }

    // Floating text feedback
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

    // Play chime sound
    (this.scene as any).gameAudio?.playCardCollect?.();

    // Camera flash (subtle blue flash)
    this.scene.cameras.main.flash(200, 0, 180, 255);

    this.destroy();
  }
}
