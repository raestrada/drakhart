import Phaser from 'phaser';
import { gameConfig } from './config';
import { initI18n } from './i18n';
import { DevPanel } from './systems/DevPanel';
import { AudioMute } from './systems/AudioMute';
import { TransitionScene12 } from './scenes/TransitionScene12';
import { GameScene2 } from './scenes/GameScene2';
import { TransitionScene23 } from './scenes/TransitionScene23';
import { GameScene3 } from './scenes/GameScene3';
import { TransitionScene34 } from './scenes/TransitionScene34';

initI18n();

const game = new Phaser.Game(gameConfig);
(window as any).game = game;

DevPanel.init();

const muteBtn = document.createElement('div');
muteBtn.id = 'drakhart-mute';
muteBtn.textContent = AudioMute.muted ? '🔇' : '🔊';
muteBtn.title = AudioMute.muted ? 'Unmute' : 'Mute';
muteBtn.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  width: 32px;
  height: 32px;
  line-height: 32px;
  text-align: center;
  font-size: 18px;
  cursor: pointer;
  user-select: none;
  opacity: 0.45;
  transition: opacity 0.2s;
`;
muteBtn.addEventListener('mouseenter', () => { muteBtn.style.opacity = '1'; });
muteBtn.addEventListener('mouseleave', () => { muteBtn.style.opacity = '0.45'; });
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const muted = AudioMute.toggle();
  muteBtn.textContent = muted ? '🔇' : '🔊';
  muteBtn.title = muted ? 'Unmute' : 'Mute';
});
document.body.appendChild(muteBtn);
