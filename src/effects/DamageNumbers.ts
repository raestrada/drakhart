import Phaser from 'phaser';

const POOL_SIZE = 30;
const TEXT_STYLE = {
  fontSize: '16px',
  fontFamily: 'monospace',
  stroke: '#000000',
  strokeThickness: 3,
  fontStyle: 'bold',
};

let pool: Phaser.GameObjects.Text[] = [];
let poolInitialized = false;
let comboCount = 0;
let comboTimer = 0;
const COMBO_TIMEOUT = 2000;

function getFromPool(scene: Phaser.Scene): Phaser.GameObjects.Text {
  if (!poolInitialized) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const t = scene.add.text(0, 0, '', TEXT_STYLE).setOrigin(0.5).setDepth(200).setActive(false).setVisible(false);
      pool.push(t);
    }
    poolInitialized = true;
  }

  for (const t of pool) {
    if (!t.active) {
      t.setActive(true).setVisible(true).setAlpha(1).setScale(1).clearTint();
      return t;
    }
  }

  const t = scene.add.text(0, 0, '', TEXT_STYLE).setOrigin(0.5).setDepth(200);
  pool.push(t);
  return t;
}

function releaseToPool(t: Phaser.GameObjects.Text): void {
  t.setActive(false).setVisible(false);
}

export type DamageType = 'physical' | 'fire' | 'acid' | 'mecha' | 'crit';

const TYPE_COLORS: Record<DamageType, string> = {
  physical: '#ff4444',
  fire: '#ff6600',
  acid: '#44ff66',
  mecha: '#ff5ea2',
  crit: '#ffdd00',
};

export function spawnDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  damageType: DamageType = 'physical',
  heavy: boolean = false
): void {
  const isCrit = damageType === 'crit' || amount >= 50;
  const color = isCrit ? TYPE_COLORS.crit : (TYPE_COLORS[damageType] || TYPE_COLORS.physical);
  const fontSize = heavy ? 22 : (isCrit ? 20 : 16);
  const riseY = heavy ? 55 : (isCrit ? 50 : 40);

  const t = getFromPool(scene);
  t.setPosition(x + Phaser.Math.Between(-8, 8), y);
  t.setText(`-${amount}`);
  t.setColor(color);
  t.setFontSize(`${fontSize}px`);
  t.setAlpha(1);
  t.setScale(isCrit ? 1.5 : (heavy ? 1.2 : 1.0));

  scene.tweens.add({
    targets: t,
    y: t.y - riseY,
    scaleX: t.scaleX * 1.1,
    scaleY: t.scaleY * 1.1,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => releaseToPool(t),
  });

  if (isCrit) {
    const critLabel = getFromPool(scene);
    critLabel.setPosition(x + 14, y - 8);
    critLabel.setText('CRIT!');
    critLabel.setColor('#ffdd00');
    critLabel.setFontSize('14px');
    critLabel.setAlpha(1);
    critLabel.setScale(1.3);

    scene.tweens.add({
      targets: critLabel,
      y: critLabel.y - 25,
      alpha: 0,
      duration: 600,
      delay: 100,
      ease: 'Power2',
      onComplete: () => releaseToPool(critLabel),
    });
  }

  comboCount++;
  comboTimer = COMBO_TIMEOUT;

  if (comboCount >= 3) {
    const comboLabel = getFromPool(scene);
    comboLabel.setPosition(x + 20, y + 14);
    comboLabel.setText(`x${comboCount}`);
    comboLabel.setColor('#ffcc44');
    comboLabel.setFontSize(`${12 + Math.min(comboCount, 10)}px`);
    comboLabel.setAlpha(0.9);
    comboLabel.setScale(1.0);

    scene.tweens.add({
      targets: comboLabel,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => releaseToPool(comboLabel),
    });
  }
}

export function updateComboTimer(delta: number): void {
  if (comboTimer > 0) {
    comboTimer -= delta;
    if (comboTimer <= 0) {
      comboCount = 0;
    }
  }
}

export function spawnHealNumber(scene: Phaser.Scene, x: number, y: number, amount: number): void {
  const t = getFromPool(scene);
  t.setPosition(x + Phaser.Math.Between(-4, 4), y);
  t.setText(`+${amount}`);
  t.setColor('#44ff88');
  t.setFontSize('14px');
  t.setAlpha(1);
  t.setScale(1.0);

  scene.tweens.add({
    targets: t,
    y: t.y - 35,
    alpha: 0,
    duration: 900,
    ease: 'Sine.easeOut',
    onComplete: () => releaseToPool(t),
  });
}

export function spawnImmuneText(scene: Phaser.Scene, x: number, y: number): void {
  const t = getFromPool(scene);
  t.setPosition(x, y - 20);
  t.setText('IMMUNE');
  t.setColor('#3498db');
  t.setFontSize('10px');
  t.setAlpha(1);
  t.setScale(1.0);

  scene.tweens.add({
    targets: t,
    y: t.y - 20,
    alpha: 0,
    duration: 700,
    onComplete: () => releaseToPool(t),
  });
}

export function spawnMissText(scene: Phaser.Scene, x: number, y: number): void {
  const t = getFromPool(scene);
  t.setPosition(x, y - 15);
  t.setText('MISS');
  t.setColor('#aaaaaa');
  t.setFontSize('11px');
  t.setAlpha(1);
  t.setScale(1.0);

  scene.tweens.add({
    targets: t,
    y: t.y - 15,
    alpha: 0,
    duration: 500,
    onComplete: () => releaseToPool(t),
  });
}

export function resetCombo(): void {
  comboCount = 0;
  comboTimer = 0;
}
