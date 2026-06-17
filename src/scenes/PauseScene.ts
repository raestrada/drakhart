import Phaser from 'phaser';
import { t } from '../i18n';

export class PauseScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Darken + blur effect via black overlay
    const overlay = this.add.rectangle(cx, cy, width, height, 0x000000, 0.55)
      .setScrollFactor(0).setDepth(0);

    // Panel background
    const panelW = 280;
    const panelH = 200;
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1520, 0.9)
      .setScrollFactor(0).setDepth(1);
    const panelBorder = this.add.rectangle(cx, cy, panelW, panelH)
      .setScrollFactor(0).setDepth(1)
      .setStrokeStyle(2, 0x665544);

    // Title
    this.add.text(cx, cy - 70, t('ui.paused') || 'PAUSED', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#cc8855',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2);

    // Buttons
    const resumeLabel = t('ui.resume') || 'RESUME';
    const quitLabel = t('ui.quitToMenu') || 'QUIT TO MENU';

    const resume = this.add.text(cx, cy - 10, resumeLabel, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#cccccc',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2);

    const quit = this.add.text(cx, cy + 30, quitLabel, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2);

    this.buttons = [resume, quit];

    this.input.keyboard?.on('keydown-UP', () => {
      this.gameAudio()?.playMenuCursor?.();
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateSelection();
    });

    this.input.keyboard?.on('keydown-DOWN', () => {
      this.gameAudio()?.playMenuCursor?.();
      this.selectedIndex = Math.min(this.buttons.length - 1, this.selectedIndex + 1);
      this.updateSelection();
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      this.executeSelection();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.resumeGame();
    });

    this.updateSelection();

    this.gameAudio()?.playPause?.();

    this.tweens.add({
      targets: [overlay, panel, panelBorder, resume, quit],
      alpha: { from: 0, to: resume === this.buttons[0] ? undefined : undefined },
      duration: 200,
    });
  }

  private gameAudio(): any {
    const scenes = this.scene.manager.getScenes(false);
    for (const s of scenes) {
      if ((s as any).gameAudio) return (s as any).gameAudio;
    }
    return null;
  }

  private updateSelection(): void {
    this.buttons.forEach((btn, i) => {
      if (i === this.selectedIndex) {
        btn.setColor('#ffcc66');
        btn.setText(`> ${btn.text.replace(/^> /, '')} <`);
        btn.setScale(1.06);
      } else {
        btn.setColor('#888888');
        btn.setText(btn.text.replace(/^> /, '').replace(/ <$/, ''));
        btn.setScale(1.0);
      }
    });
  }

  private executeSelection(): void {
    if (this.selectedIndex === 0) {
      this.resumeGame();
    } else if (this.selectedIndex === 1) {
      const gameScenes = this.scene.manager.getScenes(false);
      gameScenes.forEach(s => {
        if (s.scene.key !== 'BootScene' && s.scene.key !== 'PauseScene') {
          s.scene.stop();
        }
      });
      this.scene.stop('UIScene');
      this.scene.stop();
      this.scene.start('BootScene');
    }
  }

  private resumeGame(): void {
    const gameAudio = this.gameAudio();
    gameAudio?.playUnpause?.();
    const gameScenes = this.scene.manager.getScenes(false);
    gameScenes.forEach(s => {
      if (s.scene.key !== 'PauseScene' && s.scene.isPaused()) {
        s.scene.resume();
      }
    });
    this.scene.stop();
  }
}
