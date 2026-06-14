import Phaser from 'phaser';
import { Player } from './Player';
import { t } from '../i18n';

export class SkyCore extends Phaser.Physics.Arcade.Sprite {
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
  }

  collect(player: Player): void {
    player.formMachine.unlockDragon();

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

    this.scene.cameras.main.flash(300, 100, 180, 255);
    this.destroy();
  }
}
