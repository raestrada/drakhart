import Phaser from 'phaser';
import { gameConfig } from './config';
import { initI18n } from './i18n';
import { DevPanel } from './systems/DevPanel';

initI18n();

const game = new Phaser.Game(gameConfig);
(window as any).game = game;

DevPanel.init();
