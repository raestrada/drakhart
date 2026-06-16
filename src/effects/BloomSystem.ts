import Phaser from 'phaser';

export class BloomSystem {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private drawG: Phaser.GameObjects.Graphics;
  private sources: { x: number; y: number; radius: number; color: number; intensity: number }[] = [];
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    this.rt = scene.add.renderTexture(0, 0, width, height);
    this.rt.setDepth(95);
    this.rt.setScrollFactor(0);
    this.rt.setBlendMode(Phaser.BlendModes.ADD);
    this.rt.setAlpha(0.55);

    this.drawG = scene.add.graphics();
    this.drawG.setVisible(false);
  }

  add(x: number, y: number, radius: number = 20, color: number = 0xff6600, intensity: number = 1): void {
    this.sources.push({ x, y, radius, color, intensity });
  }

  clearSources(): void {
    this.sources.length = 0;
  }

  update(): void {
    if (!this.enabled) {
      this.rt.setVisible(false);
      return;
    }

    this.rt.clear();
    this.drawG.clear();

    const cam = this.scene.cameras.main;

    for (const s of this.sources) {
      const sx = s.x - cam.scrollX;
      const sy = s.y - cam.scrollY;
      if (sx < -80 || sx > cam.width + 80 || sy < -80 || sy > cam.height + 80) continue;

      const a = s.intensity * 0.35;

      for (let layer = 3; layer >= 0; layer--) {
        const r = s.radius + layer * s.radius * 0.55;
        const la = a * (0.15 + layer * 0.18);
        this.drawG.fillStyle(s.color, la);
        this.drawG.fillCircle(sx, sy, r);
      }

      this.drawG.fillStyle(0xffffff, a * 0.25);
      this.drawG.fillCircle(sx, sy, s.radius * 0.3);
    }

    this.rt.draw(this.drawG);

    // Erase sources each frame — callers must re-add
    this.sources.length = 0;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.rt.setVisible(false);
    else this.rt.setVisible(true);
  }

  destroy(): void {
    this.sources.length = 0;
    this.rt.destroy();
    this.drawG.destroy();
  }
}
