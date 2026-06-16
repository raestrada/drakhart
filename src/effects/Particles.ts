import Phaser from 'phaser';

function ensureEmitterTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('px-1')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 1, 1);
    g.generateTexture('px-1', 1, 1);
    g.destroy();
  }
  if (!scene.textures.exists('px-4')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    // Diamond spark shape
    g.fillRect(1, 0, 2, 4);
    g.fillRect(0, 1, 4, 2);
    g.generateTexture('px-4', 4, 4);
    g.destroy();
  }
  if (!scene.textures.exists('px-8')) {
    const g = scene.add.graphics();
    // Soft circular glow drawing radial fading rings
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(4, 4, 2.5);
    g.fillStyle(0xffffff, 1.0);
    g.fillCircle(4, 4, 1.2);
    g.generateTexture('px-8', 8, 8);
    g.destroy();
  }
}

let emitterTexturesEnsured = false;

function ensure(scene: Phaser.Scene): void {
  if (!emitterTexturesEnsured) {
    ensureEmitterTextures(scene);
    emitterTexturesEnsured = true;
  }
}

export function spawnTransformParticles(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 80, max: 250 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.2, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xff4400, 0xffcc00, 0xff8800],
    lifespan: { min: 400, max: 900 },
    quantity: 25,
    emitting: false,
  });

  emitter.explode(25);

  scene.time.delayedCall(1000, () => {
    emitter.destroy();
  });
}

export function spawnHitParticles(scene: Phaser.Scene, x: number, y: number, count = 8): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 60, max: 180 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xffdd88, 0xffaa44],
    lifespan: { min: 150, max: 400 },
    quantity: count,
    emitting: false,
  });

  emitter.explode(count);

  scene.time.delayedCall(500, () => {
    emitter.destroy();
  });
}

export function spawnDeathExplosion(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);

  const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff, 0xff2200, 0x333333];

  for (const tint of colors) {
    const emitter = scene.add.particles(x, y, 'px-8', {
      speed: { min: 60, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: tint,
      lifespan: { min: 500, max: 1400 },
      quantity: 8,
      emitting: false,
    });
    emitter.explode(8);
    scene.time.delayedCall(1600, () => emitter.destroy());
  }
}

export function spawnLandingDust(scene: Phaser.Scene, x: number, y: number, heavy = false): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 20, max: heavy ? 100 : 60 },
    angle: { min: 200, max: 340 },
    scale: { start: heavy ? 1.2 : 0.8, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: heavy ? 0x554433 : 0x887766,
    lifespan: { min: 300, max: 700 },
    quantity: heavy ? 12 : 6,
    emitting: false,
    gravityY: heavy ? 40 : 20,
  });

  emitter.explode(heavy ? 12 : 6);

  scene.time.delayedCall(800, () => {
    emitter.destroy();
  });
}

export function spawnEmbers(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 10, max: 40 },
    angle: { min: 240, max: 300 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.8, end: 0 },
    tint: [0xff4400, 0xff6600, 0xffaa00, 0xffcc00],
    lifespan: { min: 1000, max: 3000 },
    frequency: 120,
    gravityY: -20,
    emitZone: {
      type: 'random',
      source: new Phaser.Geom.Rectangle(-60, -10, 120, 10),
    } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig['emitZone'],
    x: {
      onEmit: (particle: any) => particle.x,
      onUpdate: (particle: any, key: string, t: number, value: number) => {
        // Horizontal sine sway based on particle age
        return value + Math.sin(particle.lifeCurrent * 0.008) * 0.45;
      }
    }
  });

  scene.time.delayedCall(6000, () => {
    emitter.destroy();
  });
}

export function spawnSteamBurst(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-8', {
    speed: { min: 40, max: 120 },
    angle: { min: 250, max: 290 },
    scale: { start: 1.5, end: 3 },
    alpha: { start: 0.5, end: 0 },
    tint: 0xcccccc,
    lifespan: { min: 500, max: 1200 },
    quantity: 10,
    emitting: false,
    gravityY: -30,
  });

  emitter.explode(10);

  scene.time.delayedCall(1500, () => {
    emitter.destroy();
  });
}

export function spawnHoverThrust(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 30, max: 80 },
    angle: { min: 70, max: 110 },
    scale: { start: 1, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint: [0xff4400, 0xff8800, 0xff2200],
    lifespan: { min: 150, max: 350 },
    frequency: 40,
    emitting: true,
    blendMode: Phaser.BlendModes.ADD,
    gravityY: 50,
  });

  scene.time.delayedCall(200, () => {
    if (emitter.active) emitter.stop();
    scene.time.delayedCall(400, () => {
      if (emitter.active) emitter.destroy();
    });
  });
}

export function spawnDragonExhaust(scene: Phaser.Scene, x: number, y: number, tint: number[]): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 60, max: 180 },
    angle: { min: 150, max: 210 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.8, end: 0 },
    tint: tint,
    lifespan: { min: 150, max: 400 },
    frequency: 30,
    emitting: true,
    blendMode: Phaser.BlendModes.ADD,
  });

  scene.time.delayedCall(150, () => {
    if (emitter.active) emitter.stop();
    scene.time.delayedCall(450, () => {
      if (emitter.active) emitter.destroy();
    });
  });
}

export function spawnLavaSplash(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 40, max: 120 },
    angle: { min: 220, max: 320 },
    scale: { start: 1.0, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint: [0xff3300, 0xff6600, 0xffaa00],
    lifespan: { min: 200, max: 450 },
    quantity: 6,
    emitting: false,
    gravityY: 200,
  });

  emitter.explode(6);

  scene.time.delayedCall(600, () => {
    emitter.destroy();
  });
}

export function spawnProjectileTrail(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint: number | number[],
  lifespan: number = 200,
  blendMode: number = Phaser.BlendModes.ADD
): Phaser.GameObjects.Particles.ParticleEmitter {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 5, max: 25 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 0.8, end: 0 },
    tint,
    lifespan: { min: lifespan * 0.4, max: lifespan },
    frequency: 30,
    emitting: true,
    blendMode,
  });
  return emitter;
}

export function spawnProjectileImpact(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tint: number | number[],
  count: number = 8
): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 40, max: 160 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.9, end: 0 },
    tint,
    lifespan: { min: 100, max: 350 },
    quantity: count,
    emitting: false,
    blendMode: Phaser.BlendModes.ADD,
  });

  emitter.explode(count);

  scene.time.delayedCall(450, () => {
    emitter.destroy();
  });
}

export function spawnAcidSplash(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 20, max: 100 },
    angle: { min: 200, max: 340 },
    scale: { start: 1.0, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: [0x00ff88, 0x44ff66, 0x88dd44],
    lifespan: { min: 200, max: 500 },
    quantity: 12,
    emitting: false,
    gravityY: 80,
  });

  emitter.explode(12);

  scene.time.delayedCall(700, () => {
    emitter.destroy();
  });
}

export function spawnMetalSparks(scene: Phaser.Scene, x: number, y: number, count: number = 10): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-4', {
    speed: { min: 60, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.6, end: 0 },
    alpha: { start: 1, end: 0 },
    tint: [0xffffff, 0xffaa00, 0xffdd88, 0xcccccc],
    lifespan: { min: 250, max: 600 },
    quantity: count,
    emitting: false,
    blendMode: Phaser.BlendModes.ADD,
    gravityY: 120,
  });

  emitter.explode(count);

  scene.time.delayedCall(800, () => {
    emitter.destroy();
  });
}

export function spawnDarkMist(scene: Phaser.Scene, x: number, y: number, count: number = 8): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-8', {
    speed: { min: 30, max: 100 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.0, end: 2.5 },
    alpha: { start: 0.5, end: 0 },
    tint: [0x1a0505, 0x330a0a, 0x220808],
    lifespan: { min: 400, max: 900 },
    quantity: count,
    emitting: false,
  });

  emitter.explode(count);

  scene.time.delayedCall(1100, () => {
    emitter.destroy();
  });
}

export function spawnOilSmoke(scene: Phaser.Scene, x: number, y: number): void {
  ensure(scene);
  const emitter = scene.add.particles(x, y, 'px-8', {
    speed: { min: 20, max: 80 },
    angle: { min: 240, max: 300 },
    scale: { start: 1.0, end: 2.5 },
    alpha: { start: 0.5, end: 0 },
    tint: [0x222222, 0x333333, 0x1a1a1a],
    lifespan: { min: 600, max: 1500 },
    quantity: 10,
    emitting: false,
    gravityY: -15,
  });

  emitter.explode(10);

  scene.time.delayedCall(1800, () => {
    emitter.destroy();
  });
}

export function spawnEnergyShockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number = 0xff6600
): void {
  ensure(scene);
  const ring = scene.add.graphics();
  ring.lineStyle(3, color, 0.9);
  ring.strokeCircle(x, y, 8);
  ring.setDepth(100);
  ring.setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: ring,
    scaleX: 35,
    scaleY: 35,
    alpha: 0,
    duration: 700,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  const ring2 = scene.add.graphics();
  ring2.lineStyle(1, 0xffffff, 0.5);
  ring2.strokeCircle(x, y, 4);
  ring2.setDepth(100);
  ring2.setBlendMode(Phaser.BlendModes.ADD);

  scene.tweens.add({
    targets: ring2,
    scaleX: 50,
    scaleY: 50,
    alpha: 0,
    duration: 1000,
    delay: 100,
    ease: 'Cubic.easeOut',
    onComplete: () => ring2.destroy(),
  });
}
