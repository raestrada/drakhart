import Phaser from 'phaser';

export function applyBiomePostFX(scene: Phaser.Scene, biome: string): void {
  if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const camera = scene.cameras.main;
  if (!camera || !camera.filters || !camera.filters.internal) return;

  camera.filters.internal.clear();

  const colorMatrix = camera.filters.internal.addColorMatrix();
  const vignette = camera.filters.internal.addVignette();

  colorMatrix.colorMatrix.reset();

  switch (biome) {
    case 'forest':
      colorMatrix.colorMatrix.saturate(-0.15);
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);

      vignette.radius = 1.2;
      vignette.strength = 0.35;
      vignette.setColor(0x08030d);
      break;
    case 'refinery':
      colorMatrix.colorMatrix.saturate(0.05);
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);

      vignette.radius = 1.15;
      vignette.strength = 0.4;
      vignette.setColor(0x140505);
      break;
    case 'gorge':
      colorMatrix.colorMatrix.saturate(-0.3);
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);

      vignette.radius = 1.2;
      vignette.strength = 0.45;
      vignette.setColor(0x0d050f);
      break;
    case 'foundry':
      colorMatrix.colorMatrix.saturate(-0.1);
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);

      vignette.radius = 1.15;
      vignette.strength = 0.35;
      vignette.setColor(0x0d0505);
      break;
  }
}

export function setVignetteFromPlayer(vignette: Phaser.Filters.Vignette, healthRatio: number, heatLevel: string): void {
  if (!vignette) return;

  let strength = 0.15;
  let radius = 1.3;
  let color = 0x000000;

  if (healthRatio < 0.3) {
    strength = 0.5 + 0.15 * Math.sin(Date.now() * 0.005);
    radius = 0.8;
    color = 0x590505;
  } else if (healthRatio < 0.5) {
    strength = 0.3;
    radius = 1.0;
    color = 0x140205;
  }

  if (heatLevel === 'danger') {
    strength = Math.max(strength, 0.45 + 0.15 * Math.sin(Date.now() * 0.015));
    radius = Math.min(radius, 0.9);
    color = 0x801a0d;
  } else if (heatLevel === 'warning') {
    strength = Math.max(strength, 0.25 + 0.1 * Math.sin(Date.now() * 0.008));
    radius = Math.min(radius, 1.1);
    color = 0x4d0c00;
  }

  vignette.radius = radius;
  vignette.strength = strength;
  vignette.setColor(color);
}

export function applyGlow(
  obj: Phaser.GameObjects.GameObject,
  color: number,
  outerStrength = 4,
  innerStrength = 0,
  scale = 2,
  knockout = false,
  quality = 10,
  distance = 10
): Phaser.Filters.Glow | null {
  const external = obj.filters?.external;
  if (!external) return null;
  return external.addGlow(color, outerStrength, innerStrength, scale, knockout, quality, distance);
}
