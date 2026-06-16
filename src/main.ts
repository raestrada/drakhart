import Phaser from 'phaser';
import { gameConfig } from './config';
import { initI18n } from './i18n';
import { DevPanel } from './systems/DevPanel';
import { TransitionScene12 } from './scenes/TransitionScene12';
import { GameScene2 } from './scenes/GameScene2';
import { TransitionScene23 } from './scenes/TransitionScene23';
import { GameScene3 } from './scenes/GameScene3';
import { TransitionScene34 } from './scenes/TransitionScene34';

initI18n();

const game = new Phaser.Game(gameConfig);
(window as any).game = game;

DevPanel.init();
