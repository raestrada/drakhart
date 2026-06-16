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
    const cam = this.scene.cameras.main;
    const screenCX = cam.scrollX + cam.width / 2;
    const screenCY = cam.scrollY + cam.height / 2;

    // Stop player input & movement during cinematic card unlock
    player.setInputEnabled(false);
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }

    // Hide and disable the physical world card sprite
    this.disableBody(true, true);

    // Create a large, high-depth screen overlay card for the cinematic display
    const overlayCard = this.scene.add.image(this.x, this.y, 'destiny-echo');
    overlayCard.setDepth(400);
    overlayCard.setBlendMode(Phaser.BlendModes.ADD);

    // 1. Zoom and spin the card to the center of the screen
    this.scene.tweens.add({
      targets: overlayCard,
      x: screenCX,
      y: screenCY,
      scaleX: 2.5,
      scaleY: 3.5,
      angle: 720,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Gold screen flash upon card arrival
        cam.flash(350, 255, 215, 80);

        // Create card title and effect labels below the card
        const nameText = this.scene.add.text(
          screenCX, screenCY + 75,
          `${card.arcana} — ${card.name}`.toUpperCase(),
          {
            fontSize: '16px',
            fontFamily: 'monospace',
            color: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4,
          }
        ).setOrigin(0.5).setDepth(400);

        const effectText = this.scene.add.text(
          screenCX, screenCY + 95,
          card.effect,
          {
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#ccaa66',
            stroke: '#000000',
            strokeThickness: 3,
          }
        ).setOrigin(0.5).setDepth(400);

        const loreText = this.scene.add.text(
          screenCX, screenCY + 115,
          `"${card.lore}"`,
          {
            fontSize: '9px',
            fontFamily: 'monospace',
            color: '#887755',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 2,
          }
        ).setOrigin(0.5).setDepth(400);

        // 2. Pause to allow reading, then fade texts and fly card to HUD
        this.scene.time.delayedCall(1800, () => {
          this.scene.tweens.add({
            targets: [nameText, effectText, loreText],
            alpha: 0,
            y: '+=15',
            duration: 350,
            onComplete: () => {
              nameText.destroy();
              effectText.destroy();
              loreText.destroy();
            }
          });

          // Fly the card toward the Tarot count display in the top-right corner of the HUD
          const destX = cam.scrollX + cam.width - 60;
          const destY = cam.scrollY + 16;

          this.scene.tweens.add({
            targets: overlayCard,
            x: destX,
            y: destY,
            scaleX: 0.12,
            scaleY: 0.18,
            angle: 1440,
            alpha: 0.1,
            duration: 800,
            ease: 'Back.easeIn',
            onComplete: () => {
              overlayCard.destroy();
              // Re-enable player movement/control
              player.setInputEnabled(true);
              this.destroy();
            }
          });
        });
      }
    });
  }
}
