import Phaser from 'phaser';

export class BaseLevelScene extends Phaser.Scene {
  protected parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  protected vignette!: Phaser.GameObjects.Rectangle;
  protected gameAudio: any = null;
  private emberTimer: Phaser.Time.TimerEvent | null = null;

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

  protected updateVignetteFromPlayer(healthRatio: number, heatLevel: string): void {
    if (!this.vignette || !this.vignette.active) return;

    let targetAlpha = 0;

    if (healthRatio < 0.3) {
      targetAlpha = 0.35 + 0.1 * Math.sin(Date.now() * 0.005);
      this.vignette.setFillStyle(0x880000, targetAlpha);
    } else if (healthRatio < 0.5) {
      targetAlpha = 0.15;
      this.vignette.setFillStyle(0x000000, targetAlpha);
    }

    if (heatLevel === 'danger') {
      targetAlpha = Math.max(targetAlpha, 0.3 + 0.15 * Math.sin(Date.now() * 0.015));
      this.vignette.setFillStyle(0xff2200, targetAlpha);
    } else if (heatLevel === 'warning') {
      targetAlpha = Math.max(targetAlpha, 0.12 + 0.06 * Math.sin(Date.now() * 0.008));
      this.vignette.setFillStyle(0x880000, targetAlpha);
    }

    this.vignette.setAlpha(targetAlpha);
  }

  protected startEmberRain(): void {
    const { width, height } = this.scale;
    this.emberTimer = this.time.addEvent({
      delay: 90,
      callback: () => {
        const x = Phaser.Math.Between(50, width + 150) + this.cameras.main.scrollX;
        const y = this.cameras.main.scrollY + height + 10;
        const size = Phaser.Math.Between(2, 6);
        const colors = [0xff0055, 0xcc3300, 0xff5500, 0xff8800];
        const color = Phaser.Utils.Array.GetRandom(colors);

        const ember = this.add.rectangle(x, y, size, size, color, 0.6);
        ember.setBlendMode(Phaser.BlendModes.ADD);
        ember.setDepth(90);
        ember.setScrollFactor(0);

        this.tweens.add({
          targets: ember,
          x: x - Phaser.Math.Between(80, 200),
          y: this.cameras.main.scrollY - 10,
          alpha: 0,
          scale: 0.1,
          duration: Phaser.Math.Between(3000, 6000),
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy(),
        });
      },
      loop: true,
    });
  }

  protected stopEmberRain(): void {
    if (this.emberTimer) {
      this.emberTimer.destroy();
      this.emberTimer = null;
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
