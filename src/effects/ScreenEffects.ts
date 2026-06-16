import Phaser from 'phaser';
import { SHAKE } from '../utils/constants';

export function playScreenShake(scene: Phaser.Scene, duration = 200, intensity = 0.005): void {
  scene.cameras.main.shake(duration, intensity);
}

export function playFlash(scene: Phaser.Scene, duration = 200, r = 255, g = 255, b = 255): void {
  scene.cameras.main.flash(duration, r, g, b);
}

export function playTransformScreenFx(scene: Phaser.Scene): void {
  scene.cameras.main.flash(400, 255, 100, 0);
  scene.cameras.main.shake(400, SHAKE.TRANSFORM.intensity);

  if (scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
    const pipeline = scene.cameras.main.getPostPipeline('CustomPostFX') as any;
    if (pipeline) {
      pipeline.aberration = 1.5;
      scene.tweens.add({
        targets: pipeline,
        aberration: 0.0,
        duration: 400,
        ease: 'Power2'
      });
    }
  }
}

export function playDamageScreenFx(scene: Phaser.Scene, heavy = false): void {
  if (heavy) {
    scene.cameras.main.shake(SHAKE.HEAVY_HIT.duration, SHAKE.HEAVY_HIT.intensity);
    scene.cameras.main.flash(100, 200, 40, 40);
  } else {
    scene.cameras.main.shake(SHAKE.LIGHT_HIT.duration, SHAKE.LIGHT_HIT.intensity);
    scene.cameras.main.flash(80, 255, 60, 60);
  }
}

export function playHeavyImpactScreenFx(scene: Phaser.Scene): void {
  scene.cameras.main.shake(SHAKE.HEAVY_HIT.duration, SHAKE.HEAVY_HIT.intensity);
  scene.cameras.main.flash(120, 255, 200, 80);
}

export function playBossHitScreenFx(scene: Phaser.Scene): void {
  scene.cameras.main.shake(SHAKE.BOSS_HIT.duration, SHAKE.BOSS_HIT.intensity);
  scene.cameras.main.flash(150, 255, 255, 255);
}

export function playExplosionScreenFx(scene: Phaser.Scene): void {
  scene.cameras.main.shake(SHAKE.EXPLOSION.duration, SHAKE.EXPLOSION.intensity);
  scene.cameras.main.flash(200, 255, 150, 50);
}
