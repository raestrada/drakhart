import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { FormState } from '../systems/FormStateMachine';
import { TarotSystem } from '../systems/TarotSystem';
import { t } from '../i18n';
import { lerp } from '../utils/helpers';

export class UIScene extends Phaser.Scene {
  private player!: Player;
  private tarotSystem!: TarotSystem;
  private healthFill!: Phaser.GameObjects.Rectangle;
  private healthBorder!: Phaser.GameObjects.Rectangle;
  private healthFillOrigX = 0;
  private healthFillOrigY = 0;
  private energyFill!: Phaser.GameObjects.Rectangle;
  private heatFill!: Phaser.GameObjects.Rectangle;
  private transformLabel!: Phaser.GameObjects.Text;
  private tarotDisplay!: Phaser.GameObjects.Text;
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

  private displayHealthW = 0;
  private displayEnergyW = 0;
  private displayHeatW = 0;

  private prevHealth = 100;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { player: Player; tarotSystem: TarotSystem }): void {
    this.player = data.player;
    this.tarotSystem = data.tarotSystem;
  }

  create(): void {
    this.scaleFactor = this.scale.width / 800;
    this.barW = 150 * this.scaleFactor;
    this.barH = 8 * this.scaleFactor;
    this.pad = 12 * this.scaleFactor;
    this.panelX = 4 * this.scaleFactor;
    this.panelY = 4 * this.scaleFactor;
    this.panelW = this.barW + this.pad * 2;
    this.panelH = 108 * this.scaleFactor;

    this.displayHealthW = this.barW;
    this.displayEnergyW = this.barW;
    this.displayHeatW = 0;

    this.drawPanelBackground();
    this.drawHealthBar();
    this.drawEnergyBar();
    this.drawHeatBar();
    this.drawTransformIndicator();
    this.drawTarotDisplay();
    this.drawControls();
    this.drawCoreHint();
  }

  private drawPanelBackground(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x06040c, 0.65);
    g.fillRect(this.panelX, this.panelY, this.panelW, this.panelH);

    // Top gold accent line
    g.fillStyle(0xaa8844, 0.4);
    g.fillRect(this.panelX, this.panelY, this.panelW, 2 * this.scaleFactor);

    // Border
    g.lineStyle(1, 0x332a22, 0.5);
    g.strokeRect(this.panelX, this.panelY, this.panelW, this.panelH);

    g.setScrollFactor(0);
    g.setDepth(-1);

    this.add
      .text(this.panelX + this.panelW / 2, this.panelY + 3 * this.scaleFactor, 'DRAKHART', {
        fontSize: `${Math.round(7 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#665533',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);
  }

  private drawHealthBar(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 18 * this.scaleFactor;

    this.add
      .text(x, y - 2 * this.scaleFactor, t('ui.health'), {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#cc4444',
      })
      .setScrollFactor(0);

    this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0x140808)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.healthBorder = this.add
      .rectangle(x - 1 * this.scaleFactor, y + 11 * this.scaleFactor, this.barW + 2 * this.scaleFactor, this.barH + 2 * this.scaleFactor, 0x332211)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);

    this.healthFill = this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0xcc3333)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1);

    this.healthFillOrigX = this.healthFill.x;
    this.healthFillOrigY = this.healthFill.y;

    for (let i = 0; i < 5; i++) {
      const sx = x + (i + 1) * (this.barW / 5) - 1 * this.scaleFactor;
      this.add
        .rectangle(sx, y + 12 * this.scaleFactor, Math.max(1, Math.round(this.scaleFactor)), this.barH, 0x140808)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2);
    }
  }

  private drawEnergyBar(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 44 * this.scaleFactor;

    this.add
      .text(x, y - 2 * this.scaleFactor, t('ui.energy'), {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#cc7733',
      })
      .setScrollFactor(0);

    this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0x140a04)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.add
      .rectangle(x - 1 * this.scaleFactor, y + 11 * this.scaleFactor, this.barW + 2 * this.scaleFactor, this.barH + 2 * this.scaleFactor, 0x332211)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);

    this.energyFill = this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0xff6600)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  private drawHeatBar(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 70 * this.scaleFactor;

    this.add
      .text(x, y - 2 * this.scaleFactor, 'HEAT', {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#cc5533',
      })
      .setScrollFactor(0);

    this.add
      .rectangle(x, y + 12 * this.scaleFactor, this.barW, this.barH, 0x140503)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.add
      .rectangle(x - 1 * this.scaleFactor, y + 11 * this.scaleFactor, this.barW + 2 * this.scaleFactor, this.barH + 2 * this.scaleFactor, 0x332211)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);

    this.heatFill = this.add
      .rectangle(x, y + 12 * this.scaleFactor, 0, this.barH, 0xff4400)
      .setOrigin(0, 0)
      .setScrollFactor(0);
  }

  private drawTransformIndicator(): void {
    const x = this.pad + this.panelX;
    const y = this.pad + this.panelY + 96 * this.scaleFactor;

    this.coreIndicator = this.add
      .rectangle(x + 2 * this.scaleFactor, y, 5 * this.scaleFactor, 5 * this.scaleFactor, 0x332211)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.transformLabel = this.add
      .text(x + 10 * this.scaleFactor, y - 1 * this.scaleFactor, '', {
        fontSize: `${Math.round(8 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#665544',
      })
      .setScrollFactor(0);
  }

  private drawTarotDisplay(): void {
    const x = this.scale.width - 100 * this.scaleFactor;
    const y = 8 * this.scaleFactor;

    this.tarotDisplay = this.add
      .text(x, y, 'CARDS: 0/5', {
        fontSize: `${Math.round(9 * this.scaleFactor)}px`,
        fontFamily: 'monospace',
        color: '#665544',
      })
      .setScrollFactor(0)
      .setDepth(200);
  }

  private drawControls(): void {
    const cx = this.scale.width / 2;
    const y = this.scale.height - 22 * this.scaleFactor;

    this.add
      .text(
        cx,
        y,
        '  ARROWS/WASD : Move    UP/W : Jump (Hold to Hover in Mecha)    X : Attack    C : Cycle Form    T : Tarot    ESC : Pause  ',
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

    // Smooth health bar lerp
    const healthTarget = this.barW * Math.max(0, this.player.health / this.player.maxHealth);
    this.displayHealthW = lerp(this.displayHealthW, healthTarget, 0.15);
    this.healthFill.width = this.displayHealthW;

    // Health color shift on low HP
    const healthRatio = this.player.health / this.player.maxHealth;
    if (healthRatio < 0.3) {
      const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
      this.healthFill.setFillStyle(0xff1111, pulse);
    } else if (healthRatio < 0.6) {
      this.healthFill.setFillStyle(0xdd4422);
    } else {
      this.healthFill.setFillStyle(0xcc3333);
    }

    // Damage flash: pulse panel border and shake UI camera on damage
    if (this.player.health < this.prevHealth) {
      this.healthFill.setFillStyle(0xffffff);
      this.healthBorder.setFillStyle(0xffffff, 0.7);
      this.cameras.main.shake(150, 0.007);

      // Scale+position tween — physical impact on the health bar
      const baseX = this.healthFillOrigX;
      const baseY = this.healthFillOrigY;
      this.tweens.add({
        targets: [this.healthFill, this.healthBorder],
        scaleX: 1.12,
        scaleY: 1.25,
        y: baseY - 3 * this.scaleFactor,
        duration: 60,
        yoyo: true,
        ease: 'Power2',
      });

      this.time.delayedCall(80, () => {
        if (this.healthFill && this.healthFill.active) {
          this.healthFill.setFillStyle(0xcc3333);
        }
        if (this.healthBorder && this.healthBorder.active) {
          this.healthBorder.setFillStyle(0x332211);
        }
      });
    }
    this.prevHealth = this.player.health;

    // Smooth energy bar lerp
    const energyTarget = this.barW * this.player.formMachine.energy.ratio;
    this.displayEnergyW = lerp(this.displayEnergyW, energyTarget, 0.18);
    this.energyFill.width = this.displayEnergyW;

    // Smooth heat bar lerp
    const heatRatio = this.player.formMachine.heat.ratio;
    const heatTarget = this.barW * heatRatio;
    this.displayHeatW = lerp(this.displayHeatW, heatTarget, 0.12);
    this.heatFill.width = this.displayHeatW;

    const heatLevel = this.player.formMachine.heat.level;
    if (heatLevel === 'warning') {
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
      this.heatFill.setFillStyle(0xff8800, pulse);
    } else if (heatLevel === 'danger') {
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.015);
      this.heatFill.setFillStyle(0xff2200, pulse);
    } else {
      this.heatFill.setFillStyle(0xff4400);
    }

    // Overheat steam venting particles from HUD heat bar
    if (heatLevel === 'warning' || heatLevel === 'danger') {
      if (Math.random() > 0.78) {
        const hX = this.pad + this.panelX + this.displayHeatW;
        const hY = this.pad + this.panelY + (70 + 12) * this.scaleFactor;
        const size = Phaser.Math.Between(2, 4) * this.scaleFactor;
        const steam = this.add.rectangle(hX, hY, size, size, 0xcccccc, 0.55);
        steam.setDepth(200);

        this.tweens.add({
          targets: steam,
          x: hX + Phaser.Math.Between(-8, 8) * this.scaleFactor,
          y: hY - Phaser.Math.Between(15, 30) * this.scaleFactor,
          alpha: 0,
          scale: 1.6,
          duration: Phaser.Math.Between(550, 950),
          onComplete: () => steam.destroy()
        });
      }
    }

    const { state } = this.player.formMachine;
    const hasMecha = this.player.formMachine.hasTransform();
    const hasDragon = this.player.formMachine.hasDragon();

    if (state === FormState.DRAGON) {
      this.coreIndicator.setFillStyle(0xff0066);
      this.transformLabel.setText(t('ui.dragonActive'));
      this.transformLabel.setColor('#ff0066');
    } else if (state === FormState.MECHA) {
      this.coreIndicator.setFillStyle(0xff5ea2);
      if (hasDragon) {
        this.transformLabel.setText('C: DRAGON');
      } else {
        this.transformLabel.setText(t('ui.mechaActive'));
      }
      this.transformLabel.setColor('#ff5ea2');
    } else if (state === FormState.HUMAN) {
      if (hasMecha) {
        this.coreIndicator.setFillStyle(0xffcc00);
        this.transformLabel.setText('C: MECHA');
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

    // Core indicator pulse on transform ready
    if (hasMecha && state === FormState.HUMAN) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      this.coreIndicator.setAlpha(pulse);
    } else {
      this.coreIndicator.setAlpha(1);
    }

    this.updateCoreHint();
    this.updateTarotDisplay();
  }

  private updateTarotDisplay(): void {
    if (!this.tarotSystem) return;
    const count = this.tarotSystem.count;
    const color = count > 0 ? '#ccaa66' : '#665544';
    this.tarotDisplay.setText(`CARDS: ${count}/5`);
    this.tarotDisplay.setColor(color);
  }

  private updateCoreHint(): void {
    const hasMecha = this.player.formMachine.hasTransform();

    if (hasMecha) {
      this.hint.setAlpha(0);
      return;
    }

    const dist = Math.abs(this.player.x - 7478);

    if (dist < 60) {
      this.hint.setText(t('story.hintPickUp'));
      this.hint.setAlpha(0.9);
      this.hint.setColor('#ff6600');
    } else if (dist < 400) {
      this.hint.setText(t('story.hintDragonCore'));
      this.hint.setAlpha(0.7 + Math.sin(Date.now() * 0.004) * 0.3);
      this.hint.setColor('#ff8800');
    } else if (dist < 1000) {
      this.hint.setText(t('story.hintSeekAltar'));
      this.hint.setAlpha(0.5 + Math.sin(Date.now() * 0.003) * 0.2);
      this.hint.setColor('#886644');
    } else {
      this.hint.setAlpha(0);
    }
  }
}
