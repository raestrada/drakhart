import Phaser from 'phaser';

export class ParallaxManager {
  private scene: Phaser.Scene;
  private layers: {
    sprite: Phaser.GameObjects.TileSprite;
    scrollFactorX: number;
    scrollFactorY: number;
    baseY: number;
  }[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addLayer(
    textureKey: string,
    y: number,
    depth: number,
    scrollFactorX: number = 0,
    scrollFactorY: number = 0,
    tint: number | null = null,
    alpha: number = 1,
    widthMultiplier: number = 1.5
  ): void {
    const { width, height } = this.scene.scale;
    const sprite = this.scene.add
      .tileSprite(0, y, width * widthMultiplier, height, textureKey)
      .setOrigin(0, 0)
      .setScrollFactor(scrollFactorX, scrollFactorY)
      .setDepth(depth)
      .setAlpha(alpha);

    if (tint !== null) {
      sprite.setTint(tint);
    }

    this.layers.push({ sprite, scrollFactorX, scrollFactorY, baseY: y });
  }

  update(cameraX: number, time: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    const { width, height } = this.scene.scale;
    const desiredWidth = width * camera.zoom * 2.0;
    const desiredHeight = height * camera.zoom;

    for (const layer of this.layers) {
      const sprite = layer.sprite;
      if (!sprite || !sprite.active) continue;

      sprite.tilePositionX = cameraX * layer.scrollFactorX;
      sprite.width = desiredWidth;
      sprite.height = desiredHeight;
      sprite.setScale(1.0 / camera.zoom);
      sprite.y = (layer.baseY - camera.centerY) / camera.zoom + camera.centerY;
    }
  }

  destroy(): void {
    for (const layer of this.layers) {
      layer.sprite.destroy();
    }
    this.layers = [];
  }
}
