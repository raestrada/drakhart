import Phaser from 'phaser';
import { Player } from './Player';
import { FormState } from '../systems/FormStateMachine';

export class SteamVent extends Phaser.Physics.Arcade.Sprite {
  private lastDamageTime = 0;
  private steamEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'steam-vent');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.steamEmitter = scene.add.particles(x, y, 'particle-smoke', {
      speed: { min: 15, max: 40 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xeeeeee,
      lifespan: { min: 600, max: 1200 },
      frequency: 60,
      follow: this,
      followOffset: { x: 0, y: -12 },
    });
    this.steamEmitter.setDepth(15);
  }

  onPlayerOverlap(player: Player, delta: number): void {
    const state = player.formMachine.state;

    if (state === FormState.MECHA) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      const jumpKeyActive = player.isJumpKeyDown();

      if (jumpKeyActive || !body.blocked.down) {
        body.setVelocityY(-650);
        player.formMachine.heat.addHeat(18 * (delta / 1000));

        this.spawnSteamSparkles(player.x, player.y);
      }
    } else if (state === FormState.HUMAN || state === FormState.EXHAUSTED) {
      const time = this.scene.time.now;
      if (time - this.lastDamageTime > 500) {
        this.lastDamageTime = time;
        player.takeDamage(10, player.x < this.x ? -1 : 1);
        (this.scene as any).gameAudio?.playDamage?.();
      }
    }
  }

  private spawnSteamSparkles(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'particle-smoke', {
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 1.0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xddf0ff,
      lifespan: { min: 300, max: 500 },
      quantity: 8,
      emitting: false,
    });

    emitter.explode(8);
    emitter.setDepth(15);

    this.scene.time.delayedCall(600, () => {
      emitter.destroy();
    });
  }

  destroy(fromScene?: boolean): void {
    const scene = this.scene;
    const emitter = this.steamEmitter;
    if (emitter) {
      emitter.stop();
      if (scene) {
        scene.time.delayedCall(1400, () => {
          if (emitter) emitter.destroy();
        });
      }
    }
    super.destroy(fromScene);
  }
}
