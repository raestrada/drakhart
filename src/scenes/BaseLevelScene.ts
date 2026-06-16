import Phaser from 'phaser';

export class BaseLevelScene extends Phaser.Scene {
  public currentBiome: 'forest' | 'refinery' | 'gorge' | undefined;
  protected parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  protected vignette!: Phaser.GameObjects.Rectangle;
  protected gameAudio: any = null;
  private emberRainTimer: Phaser.Time.TimerEvent | null = null;

  constructor(key: string | Phaser.Types.Scenes.SettingsConfig) {
    super(typeof key === 'string' ? { key } : key);
  }

  create(): void {
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.scene.isPaused()) return;
      this.physics.world.pause();
      this.scene.pause();
      this.scene.launch('PauseScene', { gameScene: this.scene.key });
    });
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
    this.emberRainTimer = this.time.addEvent({
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
    if (this.emberRainTimer) {
      this.emberRainTimer.destroy();
      this.emberRainTimer = null;
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

  protected irisOut(duration = 800, onComplete?: () => void): void {
    const { width, height } = this.scale;
    const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics();
      g.setDepth(500);
      g.setScrollFactor(0);

      this.tweens.addCounter({
        from: 0,
        to: maxRadius,
        duration: duration + i * 40,
        ease: 'Power3',
        onUpdate: (tween) => {
          const r = tween.getValue();
          if (r == null) return;
          g.clear();
          g.fillStyle(0x000000, 1 - (r / maxRadius) * 0.5);
          g.fillCircle(width / 2, height / 2, r);
        },
        onComplete: () => g.destroy(),
      });
    }

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(499).setScrollFactor(0);

    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: duration + 200,
      delay: duration * 0.4,
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  }

  protected irisIn(duration = 800): void {
    const { width, height } = this.scale;
    const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 1)
      .setDepth(500).setScrollFactor(0);

    this.tweens.add({
      targets: overlay,
      alpha: 0,
      duration: duration * 0.6,
    });

    const g = this.add.graphics();
    g.setDepth(501);
    g.setScrollFactor(0);

    this.tweens.addCounter({
      from: 0,
      to: maxRadius * 3,
      duration: duration,
      ease: 'Power4',
      onUpdate: (tween) => {
        const r = tween.getValue();
        if (r == null) return;
        g.clear();
        g.fillStyle(0x000000, 1 - Math.min(1, (r - maxRadius * 2) / maxRadius));
        g.fillCircle(width / 2, height / 2, maxRadius - r + maxRadius);
      },
      onComplete: () => g.destroy(),
    });
  }

  protected transitionToScene(key: string, data?: object, duration = 800): void {
    this.fadeOutScene(duration, () => {
      this.scene.start(key, data);
    });
  }

  protected wipeIn(duration = 800, direction: 'left' | 'right' | 'up' | 'down' = 'left'): void {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(
      direction === 'right' ? width : (direction === 'down' ? 0 : 0),
      direction === 'down' ? height : (direction === 'up' ? 0 : 0),
      direction === 'left' || direction === 'right' ? width + 4 : width,
      direction === 'up' || direction === 'down' ? height + 4 : height,
      0x000000, 1
    ).setDepth(500).setScrollFactor(0);

    this.tweens.add({
      targets: overlay,
      x: direction === 'right' ? -width : (direction === 'left' ? width : 0),
      y: direction === 'down' ? -height : (direction === 'up' ? height : 0),
      duration,
      ease: 'Power3',
      onComplete: () => overlay.destroy(),
    });
  }

  protected wipeOutAndTransition(
    key: string,
    data?: object,
    duration = 700,
    direction: 'left' | 'right' | 'up' | 'down' = 'right'
  ): void {
    const { width, height } = this.scale;
    const overlay = this.add.rectangle(
      direction === 'left' ? width + 2 : (direction === 'up' ? 0 : -2),
      direction === 'up' ? height + 2 : (direction === 'down' ? 0 : -2),
      direction === 'left' || direction === 'right' ? width + 4 : width,
      direction === 'up' || direction === 'down' ? height + 4 : height,
      0x000000, 0
    ).setDepth(500).setScrollFactor(0);

    this.tweens.add({
      targets: overlay,
      x: direction === 'right' ? width + 2 : (direction === 'left' ? -width - 2 : 0),
      y: direction === 'down' ? height + 2 : (direction === 'up' ? -height - 2 : 0),
      alpha: 1,
      duration,
      ease: 'Power3',
      onComplete: () => {
        this.scene.start(key, data);
      },
    });
  }

  shutdown(): void {
    this.parallaxLayers = [];
  }

  protected checkCombatIntensity(playerX: number, playerY: number, enemies: Phaser.Physics.Arcade.Group): void {
    if (!this.gameAudio?.setCombatActive) return;

    let inCombat = false;
    enemies.getChildren().forEach((e) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
      if (dist < 500) inCombat = true;
    });

    this.gameAudio.setCombatActive(inCombat);
  }
}
