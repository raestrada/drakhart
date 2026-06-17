import Phaser from 'phaser';
import { t } from '../i18n';

export class PauseScene extends Phaser.Scene {
  private resumeBtn!: Phaser.GameObjects.Text;
  private quitBtn!: Phaser.GameObjects.Text;
  private gameSceneKey = 'GameScene';

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: { gameScene: string }): void {
    this.gameSceneKey = data.gameScene || 'GameScene';
  }

  create(): void {
    const { width, height } = this.scale;
    const scale = width / 800;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6).setDepth(0);

    this.add.text(width / 2, height * 0.28, t('ui.paused') || 'PAUSED', {
      fontSize: `${Math.round(36 * scale)}px`,
      fontFamily: 'Georgia, serif',
      color: '#886644',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1);

    this.resumeBtn = this.add.text(width / 2, height * 0.48, t('ui.resume') || 'RESUME', {
      fontSize: `${Math.round(18 * scale)}px`,
      fontFamily: 'monospace',
      color: '#ccaa66',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

    this.resumeBtn.on('pointerover', () => this.resumeBtn.setColor('#ffcc88'));
    this.resumeBtn.on('pointerout', () => this.resumeBtn.setColor('#ccaa66'));
    this.resumeBtn.on('pointerdown', () => this.resumeGame());

    this.quitBtn = this.add.text(width / 2, height * 0.58, t('ui.quitToMenu') || 'QUIT TO MENU', {
      fontSize: `${Math.round(14 * scale)}px`,
      fontFamily: 'monospace',
      color: '#886644',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });

    this.quitBtn.on('pointerover', () => this.quitBtn.setColor('#cc8866'));
    this.quitBtn.on('pointerout', () => this.quitBtn.setColor('#886644'));
    this.quitBtn.on('pointerdown', () => this.quitToMenu());

    this.input.keyboard!.on('keydown-ESC', () => {
      this.resumeGame();
    });
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.resumeGame();
    });
  }

  private resumeGame(): void {
    const gameScene = this.scene.get(this.gameSceneKey);
    if (gameScene) {
      gameScene.physics.world.resume();
      gameScene.scene.resume();
    }
    this.scene.stop();
  }

  private quitToMenu(): void {
    this.scene.stop(this.gameSceneKey);
    this.scene.stop('UIScene');
    this.scene.stop();
    this.scene.start('BootScene');
  }
}
