import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FormState } from '../systems/FormStateMachine';
import { t } from '../i18n';

export class UIScene extends Phaser.Scene {
  private player!: Player;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private transformLabel!: Phaser.GameObjects.Text;
  private coreIndicator!: Phaser.GameObjects.Rectangle;
  private hint!: Phaser.GameObjects.Text;

  private scaleFactor = 1;
  private barW = 150;
  private barH = 8;
  private pad = 12;
  private panelX = 4;
  private panelY = 4;
  private panelW = 150 + 12 * 2;
  private panelH = 80;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { player: Player }): void {
    this.player = data.player;
  }

  create(): void {
    this.scaleFactor = this.scale.width / 800;
    this.barW = 150 * this.scaleFactor;
    this.barH = 8 * this.scaleFactor;
    this.pad = 12 * this.scaleFactor;
    this.panelX = 4 * this.scaleFactor;
    this.panelY = 4 * this.scaleFactor;
    this.panelW = this.barW + this.pad * 2;
    this.panelH = 80 * this.scaleFactor;

    this.drawPanelBackground();
    this.drawHealthBar();
    this.drawEnergyBar();
    this.drawTransformIndicator();
    this.drawControls();
    this.drawCoreHint();
  }

  private drawPanelBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x000000, 0.5);
    g.fillRect(this.panelX, this.panelY, this.panelW, this.panelH);
    g.lineStyle(1.5, 0x332222, 0.6);
    g.strokeRect(this.panelX, this.panelY, this.panelW, this.panelH);
    g.setScrollFactor(0);
    g.setDepth(-1);

    this.add
      .text(this.panelX + this.panelW / 2, this.panelY + 2 * this.scaleFactor, 'DRAKHART', {
        fontSize: `${Math.round(8 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#553333',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
  }

  private drawHealthBar(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 16 * this.scaleFactor;

    this.add
      .text(x, y - 2 * this.scaleFactor, t('ui.health'), {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#aa3333',
      })
      .setScrollFactor(0);

    this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0x1a1111)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.add
      .rectangle(x - 1 * this.scaleFactor, y + 11 * this.scaleFactor, this.barW + 2 * this.scaleFactor, this.barH + 2 * this.scaleFactor, 0x443333)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);

    this.healthFill = this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0xcc3333)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1);

    for (let i = 0; i < 5; i++) {
      const sx = x + (i + 1) * (this.barW / 5) - 1 * this.scaleFactor;
      this.add
        .rectangle(sx, y + 12 * this.scaleFactor, Math.max(1, Math.round(this.scaleFactor)), this.barH, 0x1a1111)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
    }
  }

  private drawEnergyBar(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 42 * this.scaleFactor;

    this.add
      .text(x, y - 2 * this.scaleFactor, t('ui.energy'), {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#aa5511',
      })
      .setScrollFactor(0);

    this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0x1a110a)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.add
      .rectangle(x - 1 * this.scaleFactor, y + 11 * this.scaleFactor, this.barW + 2 * this.scaleFactor, this.barH + 2 * this.scaleFactor, 0x443322)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);

    this.energyFill = this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0xff6600)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  private drawTransformIndicator(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 65 * this.scaleFactor;

    this.coreIndicator = this.add
      .rectangle(x + 2 * this.scaleFactor, y, 6 * this.scaleFactor, 6 * this.scaleFactor, 0x332211)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.transformLabel = this.add
      .text(x + 12 * this.scaleFactor, y - 1 * this.scaleFactor, '', {
        fontSize: `${Math.round(8 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#665544',
      })
      .setScrollFactor(0);
  }

  private drawControls(): void {
    const cx = this.scale.width / 2;
    const y = this.scale.height - 22 * this.scaleFactor;

    this.add
      .text(
        cx,
        y,
        '  ARROWS/WASD : Move    UP/W : Jump (Hold to Hover in Mecha)    X : Attack    C : Cycle Form  ',
        {
          fontSize: `${Math.round(8 * this.scaleFactor)}px`,
          fontFamily: 'monospace',
          color: '#443322',
          backgroundColor: '#00000088',
          padding: { x: 4 * this.scaleFactor, y: 3 * this.scaleFactor },
        }
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.8);
  }

  private drawCoreHint(): void {
    const cx = this.scale.width / 2;
    const y = this.scale.height - 44 * this.scaleFactor;

    this.hint = this.add
      .text(cx, y, '', {
        fontSize: `${Math.round(10 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#ff8800',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
  }

  update(): void {
    if (!this.player || !this.player.active) return;

    const healthRatio = Math.max(0, this.player.health / this.player.maxHealth);
    this.healthFill.width = this.barW * healthRatio;

    const energyRatio = this.player.formMachine.energy.ratio;
    this.energyFill.width = this.barW * energyRatio;

    const { state } = this.player.formMachine;
    const isUnlocked = this.player.formMachine.hasTransform();

    if (state === FormState.DRAGON) {
      this.coreIndicator.setFillStyle(0xff0066); // pink/magenta Energist core
      this.transformLabel.setText(t('ui.dragonActive'));
      this.transformLabel.setColor('#ff0066');
    } else if (state === FormState.MECHA) {
      this.coreIndicator.setFillStyle(0xff5ea2); // lighter pink Energist core
      this.transformLabel.setText(t('ui.mechaActive'));
      this.transformLabel.setColor('#ff5ea2');
    } else if (state === FormState.HUMAN) {
      if (isUnlocked) {
        this.coreIndicator.setFillStyle(0xffcc00); // gold/yellow ready
        this.transformLabel.setText(t('ui.transformReady'));
        this.transformLabel.setColor('#ffcc00');
      } else {
        this.coreIndicator.setFillStyle(0x332211);
        this.transformLabel.setText('');
      }
    } else if (state === FormState.EXHAUSTED) {
      this.coreIndicator.setFillStyle(0x444444);
      this.transformLabel.setText('RECHARGING');
      this.transformLabel.setColor('#555555');
    } else if (state === FormState.TRANSFORMING) {
      this.coreIndicator.setFillStyle(0xff0066);
      this.transformLabel.setText('A W A K E N');
      this.transformLabel.setColor('#ff0066');
    }

    this.updateCoreHint(isUnlocked);
  }

  private updateCoreHint(isUnlocked: boolean): void {
    if (isUnlocked) {
      this.hint.setAlpha(0);
      return;
    }

    const dist = Math.abs(this.player.x - 1320);

    if (dist < 60) {
      this.hint.setText('PICK IT UP !');
      this.hint.setAlpha(0.9);
      this.hint.setColor('#ff6600');
    } else if (dist < 400) {
      this.hint.setText('> > >  DRAGON CORE  > > >');
      this.hint.setAlpha(0.7 + Math.sin(Date.now() * 0.004) * 0.3);
      this.hint.setColor('#ff8800');
    } else if (dist < 800) {
      this.hint.setText('>>  Seek the ruins to the right  >>');
      this.hint.setAlpha(0.5 + Math.sin(Date.now() * 0.003) * 0.2);
      this.hint.setColor('#886644');
    } else {
      this.hint.setAlpha(0);
    }
  }
}
