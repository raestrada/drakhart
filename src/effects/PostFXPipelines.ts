import Phaser from 'phaser';

export function applyBiomePostFX(scene: Phaser.Scene, biome: string): void {
  if (!(scene.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const camera = scene.cameras.main;
  if (!camera || !camera.filters || !camera.filters.internal) return;

  // Clear existing filters
  camera.filters.internal.clear();

  // Add native filters
  const colorMatrix = (camera.filters.internal as any).addColorMatrix();
  const vignette = (camera.filters.internal as any).addVignette();

  // Reset matrix to identity
  colorMatrix.colorMatrix.reset();

  switch (biome) {
    case 'forest':
      // Adjust saturation using native methods
      colorMatrix.colorMatrix.saturate(-0.15); // desaturate slightly
      colorMatrix.colorMatrix.contrast(0.0); // neutral contrast
      colorMatrix.colorMatrix.brightness(1.0); // neutral brightness
      
      // Set vignette properties
      vignette.radius = 1.2;
      vignette.strength = 0.35;
      vignette.color = 0x08030d; // hex representation of [0.03, 0.01, 0.05]
      break;
    case 'refinery':
      colorMatrix.colorMatrix.saturate(0.05); // saturation 1.05
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);
      
      vignette.radius = 1.15;
      vignette.strength = 0.4;
      vignette.color = 0x140505; // [0.08, 0.02, 0.02]
      break;
    case 'gorge':
      colorMatrix.colorMatrix.saturate(-0.3); // saturation 0.7
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);
      
      vignette.radius = 1.2;
      vignette.strength = 0.45;
      vignette.color = 0x0d050f; // [0.05, 0.02, 0.06]
      break;
    case 'foundry':
      colorMatrix.colorMatrix.saturate(-0.1); // saturation 0.9
      colorMatrix.colorMatrix.contrast(0.0);
      colorMatrix.colorMatrix.brightness(1.0);
      
      vignette.radius = 1.15;
      vignette.strength = 0.35;
      vignette.color = 0x0d0505; // [0.05, 0.02, 0.02]
      break;
  }
}

export function setVignetteFromPlayer(vignette: any, healthRatio: number, heatLevel: string): void {
  if (!vignette) return;

  let strength = 0.15;
  let radius = 1.3;
  let color = 0x000000;

  if (healthRatio < 0.3) {
    strength = 0.5 + 0.15 * Math.sin(Date.now() * 0.005);
    radius = 0.8;
    color = 0x590505; // Red pulse
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
  vignette.color = color;
}
