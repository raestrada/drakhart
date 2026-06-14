import Phaser from 'phaser';

export function playScreenShake(
  scene: Phaser.Scene,
  duration = 200,
  intensity = 0.005
): void {
  scene.cameras.main.shake(duration, intensity);
}

export function playFlash(
  scene: Phaser.Scene,
  duration = 200,
  r = 255,
  g = 255,
  b = 255
): void {
  scene.cameras.main.flash(duration, r, g, b);
}

export function playTransformScreenFx(scene: Phaser.Scene): void {
  scene.cameras.main.flash(400, 255, 100, 0);
  scene.cameras.main.shake(400, 0.005);
}
