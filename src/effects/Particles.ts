import Phaser from 'phaser';

export function spawnTransformParticles(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  for (let i = 0; i < 20; i++) {
    const particle = scene.add.rectangle(
      x,
      y,
      Phaser.Math.Between(2, 8),
      Phaser.Math.Between(2, 8),
      Phaser.Math.Between(0, 1) ? 0xff4400 : 0xffcc00
    );

    scene.tweens.add({
      targets: particle,
      x: x + Phaser.Math.Between(-80, 80),
      y: y + Phaser.Math.Between(-80, 80),
      alpha: 0,
      scale: 0,
      duration: Phaser.Math.Between(400, 800),
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }
}

export function spawnHitParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count = 5
): void {
  for (let i = 0; i < count; i++) {
    const particle = scene.add.rectangle(x, y, 4, 4, 0xffffff);

    scene.tweens.add({
      targets: particle,
      x: x + Phaser.Math.Between(-30, 30),
      y: y + Phaser.Math.Between(-30, 30),
      alpha: 0,
      duration: Phaser.Math.Between(200, 400),
      onComplete: () => particle.destroy(),
    });
  }
}

export function spawnDeathExplosion(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff, 0x333333];

  for (let i = 0; i < 30; i++) {
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];
    const particle = scene.add.rectangle(
      x,
      y,
      Phaser.Math.Between(4, 12),
      Phaser.Math.Between(4, 12),
      color
    );

    scene.tweens.add({
      targets: particle,
      x: x + Phaser.Math.Between(-120, 120),
      y: y + Phaser.Math.Between(-120, 120),
      alpha: 0,
      angle: Phaser.Math.Between(-180, 180),
      duration: Phaser.Math.Between(500, 1200),
      ease: 'Power3',
      onComplete: () => particle.destroy(),
    });
  }
}
