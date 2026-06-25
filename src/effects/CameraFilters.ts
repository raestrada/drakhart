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
    case 'amazon':
      colorMatrix.colorMatrix.saturate(0.2);
      colorMatrix.colorMatrix.contrast(0.05);
      colorMatrix.colorMatrix.brightness(1.05);

      vignette.radius = 1.2;
      vignette.strength = 0.35;
      vignette.setColor(0x04140a);
      break;
  }
}

export function setVignetteFromPlayer(vignette: Phaser.Filters.Vignette, healthRatio: number, heatLevel: string, time: number = Date.now()): void {
  if (!vignette) return;

  let strength = 0.06;
  let radius = 1.3;
  let color = 0x000000;

  if (healthRatio < 0.3) {
    strength = 0.12 + 0.05 * Math.sin(time * 0.005);
    radius = 0.95;
    color = 0x080202;
  } else if (healthRatio < 0.5) {
    strength = 0.08;
    radius = 1.05;
    color = 0x050101;
  }

  if (heatLevel === 'danger') {
    strength = Math.max(strength, 0.15 + 0.05 * Math.sin(time * 0.015));
    radius = Math.min(radius, 0.95);
    color = 0x0a0301;
  } else if (heatLevel === 'warning') {
    strength = Math.max(strength, 0.08 + 0.03 * Math.sin(time * 0.008));
    radius = Math.min(radius, 1.05);
    color = 0x060201;
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
