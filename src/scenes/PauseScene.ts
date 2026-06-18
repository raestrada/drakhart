import Phaser from 'phaser';
import { t } from '../i18n';
import { AudioMute } from '../systems/AudioMute';

const ZONE_TRACKS: Record<string, string> = {
  GameScene: 'Beneath_the_Weight',
  GameScene2: 'Iron_Arteries',
  GameScene3: 'Orbit_Unbound',
  TransitionScene12: 'Silentium_Draconis',
  TransitionScene23: 'Silentium_Draconis',
};

const SCENE_BGM_RESTART: Record<string, { level: number; ambientZone: number } | 'altar'> = {
  GameScene: { level: 1, ambientZone: 1 },
  GameScene2: { level: 2, ambientZone: 2 },
  GameScene3: { level: 3, ambientZone: 3 },
  TransitionScene12: 'altar',
  TransitionScene23: 'altar',
};

export class PauseScene extends Phaser.Scene {
  private resumeBtn!: Phaser.GameObjects.Text;
  private quitBtn!: Phaser.GameObjects.Text;
  private gameSceneKey = 'GameScene';
  private pauseAudio: HTMLAudioElement | null = null;

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

    const gameScene = this.scene.get(this.gameSceneKey) as any;
    gameScene?.gameAudio?.stopBGM?.();
    gameScene?.gameAudio?.stopAmbient?.();

    const track = ZONE_TRACKS[this.gameSceneKey];
    if (track) {
      this.pauseAudio = new Audio(`./soundtrack/${track}.mp3`);
      this.pauseAudio.volume = 0.45;
      AudioMute.register(this.pauseAudio);
      this.pauseAudio.addEventListener('ended', () => {
        if (this.pauseAudio) {
          this.pauseAudio.currentTime = 0;
          this.pauseAudio.play().catch(() => {});
        }
      });
      this.pauseAudio.play().catch(() => {});
    }
  }

  private stopAudio(): void {
    if (this.pauseAudio) {
      this.pauseAudio.pause();
      this.pauseAudio = null;
    }
  }

  private restartSceneBGM(): void {
    const gameScene = this.scene.get(this.gameSceneKey) as any;
    const audio = gameScene?.gameAudio;
    if (!audio) return;

    const restart = SCENE_BGM_RESTART[this.gameSceneKey];
    if (!restart) return;

    if (restart === 'altar') {
      audio.playSacredAltarBGM?.();
    } else {
      audio.playBGM?.(restart.level);
      audio.playAmbientZone?.(restart.ambientZone);
    }
  }

  private resumeGame(): void {
    this.stopAudio();
    this.restartSceneBGM();
    const gameScene = this.scene.get(this.gameSceneKey);
    if (gameScene) {
      gameScene.physics.world.resume();
      gameScene.scene.resume();
    }
    this.scene.stop();
  }

  private quitToMenu(): void {
    this.stopAudio();
    this.scene.stop(this.gameSceneKey);
    this.scene.stop('UIScene');
    this.scene.stop();
    this.scene.start('BootScene');
  }
}
