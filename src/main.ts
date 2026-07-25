import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene';
import { BattleScene } from './game/scenes/BattleScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1600,
  height: 900,
  backgroundColor: '#02050e',
  transparent: false,
  antialias: true,
  roundPixels: true,
  render: {
    antialias: true,
    pixelArt: false,
    powerPreference: 'high-performance',
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 900,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, BattleScene],
});

window.addEventListener('pagehide', () => {
  game.loop.sleep();
});

window.addEventListener('pageshow', () => {
  game.loop.wake();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { scope: './' });
  });
}
