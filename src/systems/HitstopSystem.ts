import Phaser from 'phaser';

export class HitstopSystem {
  private scene: Phaser.Scene;
  private frozen = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  freeze(duration: number, intensity: number = 0.005): void {
    if (this.frozen) return;
    this.frozen = true;

    this.scene.physics.world.pause();
    this.scene.anims.pauseAll();
    this.scene.tweens.pauseAll();
    this.scene.cameras.main.shake(duration, intensity);

    // Use window.setTimeout instead of scene.time to bypass the paused scene clock
    window.setTimeout(() => {
      if (this.scene && this.scene.sys && this.scene.sys.isActive()) {
        this.scene.physics.world.resume();
        this.scene.anims.resumeAll();
        this.scene.tweens.resumeAll();
      }
      this.frozen = false;
    }, duration);
  }

  destroy(): void {
    if (this.frozen) {
      this.scene.physics.world.resume();
      this.frozen = false;
    }
  }
}

export const HITSTOP = {
  SWORD_LIGHT:    { duration: 40,  intensity: 0.002 },
  SWORD_HEAVY:    { duration: 60,  intensity: 0.005 },
  MECHA_CLAYMORE: { duration: 80,  intensity: 0.008 },
  ELITE_STOMP:    { duration: 120, intensity: 0.012 },
  BOSS_HIT:       { duration: 100, intensity: 0.010 },
  EXPLOSION:      { duration: 100, intensity: 0.015 },
  TRANSFORM:      { duration: 180, intensity: 0.012 },
  DEATH:          { duration: 200, intensity: 0.020 },
  DRAGON_SHOT:    { duration: 25,  intensity: 0.0015 },
};
