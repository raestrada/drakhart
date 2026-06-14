import Phaser from 'phaser';
import { gameConfig } from './config';
import { initI18n } from './i18n';

initI18n();

new Phaser.Game(gameConfig);
