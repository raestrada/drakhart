import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GameScene2 } from './scenes/GameScene2';
import { GameScene3 } from './scenes/GameScene3';
import { UIScene } from './scenes/UIScene';
import { TransitionScene12 } from './scenes/TransitionScene12';
import { TransitionScene23 } from './scenes/TransitionScene23';
import { TransitionScene34 } from './scenes/TransitionScene34';
import { TransitionScene45 } from './scenes/TransitionScene45';
import { GameScene4 } from './scenes/GameScene4';
import { PauseScene } from './scenes/PauseScene';
import { TarotCollectionScene } from './scenes/TarotCollectionScene';
import { ManualScene } from './scenes/ManualScene';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  pixelArt: true,
  backgroundColor: '#0a0a12',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 750 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene, GameScene2, GameScene3, GameScene4, UIScene, TransitionScene12, TransitionScene23, TransitionScene34, TransitionScene45, PauseScene, TarotCollectionScene, ManualScene],
};
