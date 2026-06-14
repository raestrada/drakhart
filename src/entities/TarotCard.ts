import Phaser from 'phaser';
import { Player } from './Player';

export interface TarotDef {
  id: string;
  name: string;
  arcana: string;
  lore: string;
  effect: string; // description of what it does
}

export const TAROT_DEFS: Record<string, TarotDef> = {
  magician: {
    id: 'magician',
    name: 'The Magician',
    arcana: 'I',
    lore: 'He jumped between worlds. The fall taught him everything.',
    effect: 'Human: Double Jump',
  },
  chariot: {
    id: 'chariot',
    name: 'The Chariot',
    arcana: 'VII',
    lore: 'Speed was her armor. The enemy never touched her.',
    effect: 'Mecha: Speed +30%',
  },
  strength: {
    id: 'strength',
    name: 'Strength',
    arcana: 'VIII',
    lore: 'She did not fall. She was pushed.',
    effect: 'Mecha: Claymore +50% damage',
  },
  star: {
    id: 'star',
    name: 'The Star',
    arcana: 'XVII',
    lore: 'The stars were her map. She never flew blind.',
    effect: 'Dragon: Energy regen +50%',
  },
  tower: {
    id: 'tower',
    name: 'The Tower',
    arcana: 'XVI',
    lore: 'He held the line. Alone. For three days.',
    effect: 'Dragon: 3-way fire spread',
  },
};

export class TarotCard extends Phaser.Physics.Arcade.Sprite {
  private cardDef: TarotDef;

  constructor(scene: Phaser.Scene, x: number, y: number, cardId: string) {
    super(scene, x, y, 'destiny-echo');
    this.cardDef = TAROT_DEFS[cardId];
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    scene.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  get cardId(): string { return this.cardDef.id; }

  collect(player: Player): void {
    const card = this.cardDef;

    // Screen flash — gold
    this.scene.cameras.main.flash(300, 255, 200, 50);

    // Card name text
    const nameText = this.scene.add.text(
      this.x, this.y - 40,
      `${card.arcana} — ${card.name}`,
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffcc00',
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Effect text
    const effectText = this.scene.add.text(
      this.x, this.y - 24,
      card.effect,
      {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#ccaa66',
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Lore text
    const loreText = this.scene.add.text(
      this.x, this.y - 8,
      `"${card.lore}"`,
      {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#887755',
        fontStyle: 'italic',
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // Fade all texts
    this.scene.tweens.add({
      targets: [nameText, effectText, loreText],
      y: '-=30',
      alpha: 0,
      duration: 3000,
      delay: 500,
      onComplete: () => {
        nameText.destroy();
        effectText.destroy();
        loreText.destroy();
      },
    });

    // Spin and scale up, then destroy
    this.scene.tweens.add({
      targets: this,
      angle: 360,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 600,
      onComplete: () => this.destroy(),
    });
  }
}
