import Phaser from 'phaser';

export class BaseLevelScene extends Phaser.Scene {
  protected parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  protected vignette!: Phaser.GameObjects.Rectangle;
  protected gameAudio: any = null;

  constructor(key: string) {
    super({ key });
  }

  protected createVignette(): void {
    const { width, height } = this.scale;
    this.vignette = this.add.rectangle(
      width / 2, height / 2, width, height,
      0x000000, 0
    );
    this.vignette.setDepth(100);
    this.vignette.setScrollFactor(0);
  }

  protected updateVignette(alpha: number = 0): void {
    if (this.vignette && this.vignette.active) {
      this.vignette.setAlpha(alpha);
    }
  }

  protected updateParallaxLayers(cameraX: number): void {
    const factors = [0.05, 0.08, 0.12, 0.20, 0.28, 0.35, 0.45];
    for (let i = 0; i < this.parallaxLayers.length; i++) {
      const layer = this.parallaxLayers[i];
      if (layer && layer.active) {
        const factor = factors[i] || 0.5;
        layer.tilePositionX = cameraX * factor;
      }
    }
  }

  protected fadeInScene(duration = 1000): void {
    this.cameras.main.fadeIn(duration, 0, 0, 0);
  }

  protected fadeOutScene(duration = 1000, onComplete?: () => void): void {
    this.cameras.main.fadeOut(duration, 0, 0, 0);
    if (onComplete) {
      this.time.delayedCall(duration, onComplete);
    }
  }

  protected transitionToScene(key: string, data?: object, duration = 800): void {
    this.fadeOutScene(duration, () => {
      this.scene.start(key, data);
    });
  }

  shutdown(): void {
    this.parallaxLayers = [];
  }
}
