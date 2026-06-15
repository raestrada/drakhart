import Phaser from 'phaser';
import { TarotSystem } from '../systems/TarotSystem';

const CARD_NAMES: Record<string, { name: string; lore: string; effect: string }> = {
  magician: { name: 'I — THE MAGICIAN', lore: 'He jumped between worlds.', effect: 'Double Jump' },
  chariot:  { name: 'VII — THE CHARIOT', lore: 'Speed was her armor.', effect: 'Mecha Speed +30%' },
  strength: { name: 'VIII — STRENGTH', lore: 'She did not fall.', effect: 'Mecha Damage +50%' },
  star:     { name: 'XVII — THE STAR', lore: 'The stars were her map.', effect: 'Dragon Energy Regen +50%' },
  tower:    { name: 'XVI — THE TOWER', lore: 'He held the line alone.', effect: 'Dragon 3-Way Fire' },
};

export class TarotCollectionScene extends Phaser.Scene {
  private tarotSystem!: TarotSystem;
  private allCards = ['magician', 'chariot', 'strength', 'star', 'tower'];

  constructor() {
    super({ key: 'TarotCollectionScene' });
  }

  init(data: { tarotSystem: TarotSystem }): void {
    this.tarotSystem = data.tarotSystem;
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x06040c, 0.92);

    this.add.text(width / 2, 40, 'WAR ECHOES', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#ccaa44',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, 70, `Collected: ${this.tarotSystem.count} / 5`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#887744',
    }).setOrigin(0.5);

    const startY = 110;
    const cardH = 90;

    this.allCards.forEach((cardId, i) => {
      const y = startY + i * (cardH + 12);
      const collected = this.tarotSystem.collectedCards.includes(cardId);
      const info = CARD_NAMES[cardId] || { name: cardId, lore: '', effect: '' };

      const color = collected ? '#ccaa44' : '#333322';
      const bgColor = collected ? 0x1a1508 : 0x0a0804;
      const borderColor = collected ? 0x887744 : 0x222211;

      const bg = this.add.rectangle(width / 2, y + cardH / 2, width - 60, cardH, bgColor);
      bg.setStrokeStyle(1, borderColor);

      this.add.text(40, y + 8, info.name, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: color,
      });

      if (collected) {
        this.add.text(40, y + 30, `"${info.lore}"`, {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#887755',
          fontStyle: 'italic',
        });

        this.add.text(40, y + 54, info.effect, {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#44aa44',
        });

        const dot = this.add.rectangle(width - 50, y + cardH / 2, 8, 8, 0xccaa44);
        this.tweens.add({
          targets: dot,
          alpha: 0.3,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      } else {
        this.add.text(40, y + 35, '???', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#222211',
        });

        this.add.rectangle(width - 50, y + cardH / 2, 8, 8, 0x222211);
      }
    });

    this.add.text(width / 2, height - 50, '[ESC] or [ENTER] to close', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#554433',
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.close());
    this.input.keyboard?.on('keydown-ENTER', () => this.close());
    this.input.keyboard?.on('keydown-T', () => this.close());
  }

  private close(): void {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.physics.world.resume();
      gameScene.scene.resume();
    }
    this.scene.stop();
  }
}
