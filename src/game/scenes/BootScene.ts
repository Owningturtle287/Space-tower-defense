import Phaser from 'phaser';
import { validateContent } from '../content';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const errors = validateContent();
    if (errors.length > 0) {
      throw new Error(`Combat Lab content validation failed:\n${errors.join('\n')}`);
    }

    const loading = document.querySelector<HTMLDivElement>('#loading-screen');
    loading?.classList.add('hidden');
    this.scene.start('battle');
  }
}
