import Phaser from 'phaser';

export class BloomSystem {
  private scene: Phaser.Scene;
  private rtBase: Phaser.GameObjects.RenderTexture;
  private rtBlur1: Phaser.GameObjects.RenderTexture;
  private rtBlur2: Phaser.GameObjects.RenderTexture;
  private drawG: Phaser.GameObjects.Graphics;
  private compositeG: Phaser.GameObjects.Graphics;
  private sources: { x: number; y: number; radius: number; color: number; intensity: number }[] = [];
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    this.rtBase = scene.add.renderTexture(0, 0, width, height);
    this.rtBase.setDepth(95);
    this.rtBase.setScrollFactor(0);
    this.rtBase.setVisible(false);

    this.rtBlur1 = scene.add.renderTexture(0, 0, width / 4, height / 4);
    this.rtBlur1.setDepth(95);
    this.rtBlur1.setScrollFactor(0);
    this.rtBlur1.setScale(4);
    this.rtBlur1.setOrigin(0, 0);
    this.rtBlur1.setBlendMode(Phaser.BlendModes.ADD);
    this.rtBlur1.setAlpha(0.55);
    this.rtBlur1.setVisible(false);

    this.rtBlur2 = scene.add.renderTexture(0, 0, width / 4, height / 4);
    this.rtBlur2.setDepth(95);
    this.rtBlur2.setScrollFactor(0);
    this.rtBlur2.setScale(4);
    this.rtBlur2.setOrigin(0, 0);
    this.rtBlur2.setBlendMode(Phaser.BlendModes.ADD);
    this.rtBlur2.setAlpha(0.3);
    this.rtBlur2.setVisible(false);

    this.drawG = scene.add.graphics();
    this.drawG.setVisible(false);

    this.compositeG = scene.add.graphics();
    this.compositeG.setVisible(false);
  }

  add(x: number, y: number, radius: number = 20, color: number = 0xff6600, intensity: number = 1): void {
    this.sources.push({ x, y, radius, color, intensity });
  }

  clearSources(): void {
    this.sources.length = 0;
  }

  update(): void {
    if (!this.enabled) {
      this.rtBlur1.setVisible(false);
      this.rtBlur2.setVisible(false);
      return;
    }

    this.rtBase.clear();
    this.drawG.clear();

    const cam = this.scene.cameras.main;
    let hasSources = false;

    for (const s of this.sources) {
      const sx = s.x - cam.scrollX;
      const sy = s.y - cam.scrollY;
      if (sx < -120 || sx > cam.width + 120 || sy < -120 || sy > cam.height + 120) continue;
      hasSources = true;

      const a = s.intensity * 0.4;

      for (let layer = 4; layer >= 0; layer--) {
        const r = s.radius * (1 + layer * 0.35);
        const la = a * (0.1 + layer * 0.15);
        this.drawG.fillStyle(s.color, la);
        this.drawG.fillCircle(sx, sy, r);
      }

      this.drawG.fillStyle(0xffffff, a * 0.35);
      this.drawG.fillCircle(sx, sy, s.radius * 0.4);
    }

    if (!hasSources) {
      this.rtBlur1.setVisible(false);
      this.rtBlur2.setVisible(false);
      this.sources.length = 0;
      return;
    }

    this.rtBase.draw(this.drawG);

    this.rtBlur1.clear();
    this.rtBlur1.setVisible(true);
    this.compositeG.clear();
    this.compositeG.fillStyle(0xffffff, 1);
    this.rtBase.saveTexture('_bloom_tmp');
    if (this.scene.textures.exists('_bloom_tmp')) {
      this.compositeG.fillStyle(0xffffff, 1);
      this.rtBlur1.drawFrame('_bloom_tmp');
    }

    this.rtBlur2.clear();
    this.rtBlur2.setVisible(true);
    this.rtBlur1.saveTexture('_bloom_tmp2');
    if (this.scene.textures.exists('_bloom_tmp2')) {
      this.rtBlur2.drawFrame('_bloom_tmp2');
    }

    this.sources.length = 0;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.rtBlur1.setVisible(false);
      this.rtBlur2.setVisible(false);
    }
  }

  destroy(): void {
    this.sources.length = 0;
    this.rtBase.destroy();
    this.rtBlur1.destroy();
    this.rtBlur2.destroy();
    this.drawG.destroy();
    this.compositeG.destroy();
  }
}
