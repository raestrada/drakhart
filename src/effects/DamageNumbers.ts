import Phaser from 'phaser';

export function spawnDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  heavy = false
): void {
  const color = heavy ? '#ff8800' : '#ff4444';
  const fontSize = heavy ? 22 : 16;

  const text = scene.add.text(
    x + Phaser.Math.Between(-12, 12),
    y - Phaser.Math.Between(10, 20),
    `-${amount}`,
    {
      fontSize: `${fontSize}px`,
      fontFamily: 'monospace',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }
  );
  text.setOrigin(0.5);
  text.setDepth(200);

  scene.tweens.add({
    targets: text,
    y: text.y - 45,
    alpha: 0,
    scale: heavy ? 1.2 : 1.1,
    duration: 800,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

export function spawnHealNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number
): void {
  const text = scene.add.text(
    x + Phaser.Math.Between(-8, 8),
    y - Phaser.Math.Between(10, 20),
    `+${amount}`,
    {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#44ff88',
      stroke: '#000000',
      strokeThickness: 2,
      fontStyle: 'bold',
    }
  );
  text.setOrigin(0.5);
  text.setDepth(200);

  scene.tweens.add({
    targets: text,
    y: text.y - 35,
    alpha: 0,
    duration: 700,
    ease: 'Power2',
    onComplete: () => text.destroy(),
  });
}

export function spawnImmuneText(
  scene: Phaser.Scene,
  x: number,
  y: number
): void {
  const text = scene.add.text(x, y - 28, 'IMMUNE', {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#3498db',
    stroke: '#000000',
    strokeThickness: 2,
    fontStyle: 'bold',
  });
  text.setOrigin(0.5);
  text.setDepth(200);

  scene.tweens.add({
    targets: text,
    y: text.y - 20,
    alpha: 0,
    duration: 650,
    onComplete: () => text.destroy(),
  });
}
