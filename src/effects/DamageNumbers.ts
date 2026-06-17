import Phaser from 'phaser';

const TEXT_STYLE_BASE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontSize: '16px',
  fontFamily: 'monospace',
  stroke: '#000000',
  strokeThickness: 3,
  fontStyle: 'bold',
};

let comboCount = 0;
let comboTimer = 0;
const COMBO_TIMEOUT = 2000;

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
  const fontSize = heavy ? '22px' : (isCrit ? '20px' : '16px');
  const riseY = heavy ? 55 : (isCrit ? 50 : 40);

  const t = scene.add.text(x + Phaser.Math.Between(-8, 8), y, `-${amount}`, {
    ...TEXT_STYLE_BASE,
    fontSize,
    color,
  }).setOrigin(0.5).setDepth(200);

  if (isCrit) t.setScale(1.5);
  else if (heavy) t.setScale(1.2);

  scene.tweens.add({
    targets: t,
    y: t.y - riseY,
    scaleX: t.scaleX * 1.1,
    scaleY: t.scaleY * 1.1,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => t.destroy(),
  });

  if (isCrit) {
    const critLabel = scene.add.text(x + 14, y - 8, 'CRIT!', {
      ...TEXT_STYLE_BASE,
      fontSize: '14px',
      color: '#ffdd00',
    }).setOrigin(0.5).setDepth(200).setScale(1.3);

    scene.tweens.add({
      targets: critLabel,
      y: critLabel.y - 25,
      alpha: 0,
      duration: 600,
      delay: 100,
      ease: 'Power2',
      onComplete: () => critLabel.destroy(),
    });
  }

  comboCount++;
  comboTimer = COMBO_TIMEOUT;

  if (comboCount >= 3) {
    const comboLabel = scene.add.text(x + 20, y + 14, `x${comboCount}`, {
      ...TEXT_STYLE_BASE,
      fontSize: `${Math.min(12 + comboCount, 22)}px`,
      color: '#ffcc44',
    }).setOrigin(0.5).setDepth(200);

    scene.tweens.add({
      targets: comboLabel,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => comboLabel.destroy(),
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
  const t = scene.add.text(x + Phaser.Math.Between(-4, 4), y, `+${amount}`, {
    ...TEXT_STYLE_BASE,
    fontSize: '14px',
    color: '#44ff88',
  }).setOrigin(0.5).setDepth(200);

  scene.tweens.add({
    targets: t,
    y: t.y - 35,
    alpha: 0,
    duration: 900,
    ease: 'Sine.easeOut',
    onComplete: () => t.destroy(),
  });
}

export function spawnImmuneText(scene: Phaser.Scene, x: number, y: number): void {
  const t = scene.add.text(x, y - 20, 'IMMUNE', {
    ...TEXT_STYLE_BASE,
    fontSize: '10px',
    color: '#3498db',
  }).setOrigin(0.5).setDepth(200);

  scene.tweens.add({
    targets: t,
    y: t.y - 20,
    alpha: 0,
    duration: 700,
    onComplete: () => t.destroy(),
  });
}

export function spawnMissText(scene: Phaser.Scene, x: number, y: number): void {
  const t = scene.add.text(x, y - 15, 'MISS', {
    ...TEXT_STYLE_BASE,
    fontSize: '11px',
    color: '#aaaaaa',
  }).setOrigin(0.5).setDepth(200);

  scene.tweens.add({
    targets: t,
    y: t.y - 15,
    alpha: 0,
    duration: 500,
    onComplete: () => t.destroy(),
  });
}

export function resetCombo(): void {
  comboCount = 0;
  comboTimer = 0;
}
