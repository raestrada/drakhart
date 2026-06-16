import Phaser from 'phaser';

export function drawLightningBolt(
  scene: Phaser.Scene,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  style: { color1: number; color2: number },
  groundBlast: boolean = false,
  duration: number = 350
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.setDepth(100);

  const drawBolt = (color: number, width: number, alpha: number) => {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(startX, startY);

    let cx = startX;
    const steps = 12;
    const distY = (endY - startY) / steps;

    for (let j = 1; j < steps; j++) {
      const targetY = startY + j * distY;
      const targetX = cx + Phaser.Math.Between(-35, 35) + (endX - cx) * 0.15;
      g.lineTo(targetX, targetY);
      cx = targetX;
    }

    g.lineTo(endX, endY);
    g.strokePath();
  };

  drawBolt(style.color2, 10, 0.45);
  drawBolt(style.color1, 4, 1.0);

  if (groundBlast) {
    for (let i = 0; i < 15; i++) {
      const smX = endX + Phaser.Math.Between(-25, 25);
      const smY = endY + 25 + Phaser.Math.Between(-5, 5);
      const size = Phaser.Math.Between(8, 20);
      const smoke = scene.add.rectangle(smX, smY, size, size, 0xaaaaaa);
      smoke.setAlpha(0.6);
      scene.tweens.add({
        targets: smoke,
        x: smX + Phaser.Math.Between(-40, 40),
        y: smY - Phaser.Math.Between(10, 40),
        alpha: 0,
        scale: 1.5,
        duration: Phaser.Math.Between(800, 1400),
        ease: 'Sine.easeOut',
        onComplete: () => smoke.destroy(),
      });
    }
  }

  scene.tweens.add({
    targets: g,
    alpha: 0,
    duration,
    onComplete: () => g.destroy(),
  });

  return g;
}
