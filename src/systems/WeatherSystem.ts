import Phaser from 'phaser';

export type BiomeWeather = 'forest' | 'refinery' | 'gorge';

interface FogLayer {
  sprite: Phaser.GameObjects.TileSprite;
  driftSpeed: number;
}

export class WeatherSystem {
  private scene: Phaser.Scene;
  private fogLayers: FogLayer[] = [];
  private rainEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lightningTimer: Phaser.Time.TimerEvent | null = null;
  private biome: BiomeWeather;

  constructor(scene: Phaser.Scene, biome: BiomeWeather, levelWidth: number) {
    this.scene = scene;
    this.biome = biome;
    this.createWeather(levelWidth);
  }

  private createWeather(levelWidth: number): void {
    const { width, height } = this.scene.scale;

    if (this.biome === 'forest') {
      this.fogLayers.push(this.createFogLayer(0.08, -35, 180, 1.0, 0x22aacc, 0.06));
      this.fogLayers.push(this.createFogLayer(0.14, -30, 240, 1.5, 0x33bbdd, 0.04));
    }

    if (this.biome === 'refinery') {
      this.rainEmitter = this.scene.add.particles(0, 0, 'px-4', {
        x: { min: -100, max: width + 100 },
        y: -20,
        speed: { min: 180, max: 320 },
        angle: { min: 95, max: 115 },
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.06, end: 0 },
        tint: [0x88aacc, 0xaabbdd, 0x99bbcc],
        lifespan: { min: 600, max: 1400 },
        frequency: 15,
        quantity: 1,
        gravityY: 0,
        blendMode: Phaser.BlendModes.NORMAL,
        follow: this.scene.cameras.main,
      });
      this.rainEmitter.setDepth(85);
      this.rainEmitter.setScrollFactor(0);

      this.lightningTimer = this.scene.time.addEvent({
        delay: Phaser.Math.Between(6000, 15000),
        callback: () => this.executeLightningStrike(),
        loop: true,
      });
    }

    if (this.biome === 'gorge') {
      this.scene.time.addEvent({
        delay: 70,
        callback: () => this.emitAshParticle(),
        loop: true,
      });
    }
  }

  private createFogLayer(
    scrollFactor: number,
    depth: number,
    y: number,
    driftSpeed: number,
    tint: number,
    alpha: number
  ): FogLayer {
    const { width, height } = this.scene.scale;
    const sprite = this.scene.add
      .tileSprite(0, y, width * 1.5, 200, 'bg-mist')
      .setOrigin(0, 0)
      .setScrollFactor(scrollFactor, 0)
      .setDepth(depth)
      .setAlpha(alpha);
    sprite.setTint(tint);

    return { sprite, driftSpeed };
  }

  private emitAshParticle(): void {
    const cam = this.scene.cameras.main;
    const x = Phaser.Math.Between(cam.scrollX - 50, cam.scrollX + cam.width + 50);
    const y = cam.scrollY + cam.height + 10;
    const colors = [0x2e2e30, 0x3a3a3c, 0xff4411, 0x663322];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const size = Phaser.Math.Between(2, 5);

    const ash = this.scene.add.rectangle(x, y, size, size, color, 0.6);
    ash.setDepth(90);
    ash.setScrollFactor(0);
    if (color === 0xff4411) ash.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: ash,
      x: x + Phaser.Math.Between(-100, 100),
      y: Phaser.Math.Between(0, cam.scrollY),
      alpha: 0,
      scale: 0.1,
      duration: Phaser.Math.Between(3000, 6000),
      ease: 'Sine.easeOut',
      onComplete: () => ash.destroy(),
    });
  }

  private executeLightningStrike(): void {
    if (!this.scene || !this.scene.cameras) return;
    const cam = this.scene.cameras.main;
    const flashStart = cam.scrollX + cam.width * 0.3;
    const flashEnd = cam.scrollX + cam.width * 0.7;

    this.scene.cameras.main.flash(80, 180, 200, 255);
    this.scene.cameras.main.shake(100, 0.002);

    const g = this.scene.add.graphics();
    g.setDepth(100);
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginPath();
    g.moveTo(flashStart, cam.scrollY);
    let cx = flashStart;
    for (let i = 1; i < 8; i++) {
      const targetY = cam.scrollY + (cam.height / 8) * i;
      cx += Phaser.Math.Between(-50, 50);
      g.lineTo(cx, targetY);
    }
    g.strokePath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 150,
      onComplete: () => g.destroy(),
    });

    this.lightningTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(6000, 15000),
      callback: () => this.executeLightningStrike(),
      loop: false,
    });
  }

  update(cameraX: number, time: number): void {
    for (const layer of this.fogLayers) {
      layer.sprite.tilePositionX = cameraX * 0.05 + time * 0.005 * layer.driftSpeed;
    }
  }

  destroy(): void {
    for (const layer of this.fogLayers) {
      layer.sprite.destroy();
    }
    this.fogLayers = [];
    if (this.rainEmitter) {
      this.rainEmitter.stop();
      this.scene.time.delayedCall(1600, () => {
        if (this.rainEmitter) this.rainEmitter.destroy();
      });
    }
    if (this.lightningTimer) {
      this.lightningTimer.destroy();
      this.lightningTimer = null;
    }
  }
}
