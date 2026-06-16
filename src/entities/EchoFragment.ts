import Phaser from 'phaser';
import { Player } from './Player';
import { t } from '../i18n';

const LORE_FRAGMENTS = [
  'story.echo1',
  'story.echo2',
  'story.echo3',
];

export class EchoFragment extends Phaser.Physics.Arcade.Sprite {
  private loreIndex: number;
  private glowEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, index: number) {
    super(scene, x, y, 'destiny-echo');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.loreIndex = index;

    this.setAlpha(0.7);

    scene.tweens.add({
      targets: this,
      y: y - 5,
      alpha: 0.45,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createGlow(scene);
  }

  private createGlow(scene: Phaser.Scene): void {
    if (!scene.textures.exists('px-4')) return;
    this.glowEmitter = scene.add.particles(this.x, this.y, 'px-4', {
      speed: { min: 2, max: 10 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.4, end: 0 },
      tint: [0x88aacc, 0xaaccff, 0xccddff],
      lifespan: { min: 400, max: 900 },
      frequency: 120,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.glowEmitter && this.glowEmitter.active) {
      this.glowEmitter.setPosition(this.x, this.y);
    }
  }

  collect(): void {
    if (this.glowEmitter) {
      this.glowEmitter.stop();
      this.scene.time.delayedCall(400, () => {
        if (this.glowEmitter) this.glowEmitter.destroy();
      });
    }

    const loreKey = LORE_FRAGMENTS[this.loreIndex] || LORE_FRAGMENTS[0];
    const loreText = t(loreKey) || 'An echo from the past...';

    const text = this.scene.add.text(
      this.scene.cameras.main.scrollX + this.scene.scale.width / 2,
      this.scene.cameras.main.scrollY + this.scene.scale.height * 0.75,
      `"${loreText}"`,
      {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#aaccee',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'italic',
        wordWrap: { width: this.scene.scale.width * 0.7 },
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0).setAlpha(0);

    this.scene.tweens.add({
      targets: text,
      alpha: { from: 0, to: 0.9 },
      duration: 500,
      hold: 2500,
      yoyo: true,
      onComplete: () => text.destroy(),
    });

    this.scene.cameras.main.flash(150, 100, 160, 220);
    this.destroy();
  }
}
