import Phaser from 'phaser';
import {
  BUILD_PADS,
  ENEMIES,
  PATH_POINTS,
  TOWERS,
  WAVES,
  type BuildPadDefinition,
  type EnemyKey,
  type TargetPriority,
  type TowerKey,
} from '../content';
import { seededUnit } from '../core/combat';
import { Enemy, type EnemyCallbacks } from '../entities/Enemy';
import { Tower, type TowerShot } from '../entities/Tower';
import { SaveService } from '../services/SaveService';
import { SoundService } from '../services/SoundService';

const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;
const PLAYFIELD_WIDTH = 1250;
const UI_FONT = '"Trebuchet MS", Arial, sans-serif';
const TITLE_FONT = '"Arial Narrow", "Trebuchet MS", sans-serif';

interface SpawnEntry {
  at: number;
  enemy: EnemyKey;
}

interface BuildPad {
  definition: BuildPadDefinition;
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  tower?: Tower;
}

interface UiButton {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setLabel: (label: string) => void;
  setEnabled: (enabled: boolean) => void;
}

interface TowerCard {
  key: TowerKey;
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
}

export class BattleScene extends Phaser.Scene {
  private path!: Phaser.Curves.Spline;
  private saveData!: SaveService;
  private soundFx!: SoundService;
  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private pads: BuildPad[] = [];
  private towerCards: TowerCard[] = [];

  private energy = 420;
  private integrity = 20;
  private currentWaveIndex = 0;
  private waveActive = false;
  private spawnQueue: SpawnEntry[] = [];
  private spawnCursor = 0;
  private waveStartedAt = 0;
  private combatTime = 0;
  private gameSpeed = 1;
  private paused = false;
  private state: 'briefing' | 'playing' | 'victory' | 'defeat' = 'briefing';
  private selectedBuildKey?: TowerKey;
  private selectedTower?: Tower;

  private integrityText!: Phaser.GameObjects.Text;
  private energyText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private threatsText!: Phaser.GameObjects.Text;
  private selectionTitle!: Phaser.GameObjects.Text;
  private selectionStats!: Phaser.GameObjects.Text;
  private selectionRole!: Phaser.GameObjects.Text;
  private tipText!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private startWaveButton!: UiButton;
  private pauseButton!: UiButton;
  private speedButton!: UiButton;
  private soundButton!: UiButton;
  private motionButton!: UiButton;
  private upgradeButton!: UiButton;
  private priorityButton!: UiButton;
  private sellButton!: UiButton;

  constructor() {
    super('battle');
  }

  create(): void {
    this.saveData = new SaveService();
    this.soundFx = new SoundService(this.saveData.snapshot.soundEnabled);
    this.path = new Phaser.Curves.Spline(PATH_POINTS.map((point) => new Phaser.Math.Vector2(point.x, point.y)));

    this.createBackdrop();
    this.createPathAndLandmarks();
    this.createBuildPads();
    this.createHud();
    this.createSidebar();
    this.createInput();
    this.showBriefing();
    this.refreshHud();
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing' || this.paused) return;

    const clampedDelta = Math.min(delta, 50);
    const scaledDelta = clampedDelta * this.gameSpeed;
    this.combatTime += scaledDelta;

    if (this.waveActive) this.processSpawns();

    for (const enemy of this.enemies) {
      enemy.updateEnemy(clampedDelta, this.combatTime, this.gameSpeed);
    }
    this.enemies = this.enemies.filter((enemy) => enemy.active);
    if (this.state !== 'playing') return;

    for (const tower of this.towers) {
      const shot = tower.tryFire(this.combatTime, this.enemies);
      if (shot) this.resolveTowerShot(shot);
    }

    if (this.waveActive && this.spawnCursor >= this.spawnQueue.length && this.enemies.length === 0) {
      this.completeWave();
    }

    this.refreshHud();
  }

  private createBackdrop(): void {
    const background = this.add.graphics().setDepth(-100);
    background.fillGradientStyle(0x071a35, 0x06142b, 0x030916, 0x020611, 1);
    background.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (let index = 0; index < 105; index += 1) {
      const x = seededUnit(index * 17 + 3) * PLAYFIELD_WIDTH;
      const y = seededUnit(index * 31 + 11) * WORLD_HEIGHT;
      const radius = seededUnit(index * 47 + 7) * 1.8 + 0.4;
      const alpha = seededUnit(index * 59 + 5) * 0.5 + 0.18;
      background.fillStyle(index % 8 === 0 ? 0x78e8ff : 0xffffff, alpha);
      background.fillCircle(x, y, radius);
    }

    background.fillStyle(0x0b3552, 0.8);
    background.fillEllipse(550, 520, 1520, 760);
    background.fillStyle(0x0b4b58, 0.9);
    background.fillEllipse(565, 550, 1450, 680);
    background.fillStyle(0x126663, 0.82);
    background.fillEllipse(570, 585, 1320, 575);

    background.fillStyle(0x123b50, 0.72);
    background.fillPoints(
      [
        new Phaser.Geom.Point(0, 560),
        new Phaser.Geom.Point(150, 320),
        new Phaser.Geom.Point(285, 475),
        new Phaser.Geom.Point(430, 205),
        new Phaser.Geom.Point(620, 465),
        new Phaser.Geom.Point(790, 250),
        new Phaser.Geom.Point(945, 430),
        new Phaser.Geom.Point(1110, 215),
        new Phaser.Geom.Point(1250, 470),
        new Phaser.Geom.Point(1250, 900),
        new Phaser.Geom.Point(0, 900),
      ],
      true,
    );

    for (let index = 0; index < 38; index += 1) {
      const x = seededUnit(800 + index * 23) * 1210 + 20;
      const y = seededUnit(900 + index * 29) * 570 + 260;
      const size = 10 + seededUnit(1000 + index * 13) * 28;
      background.fillStyle(index % 3 === 0 ? 0x83ce77 : 0x2c8d70, 0.72);
      background.fillCircle(x, y, size);
      background.fillStyle(0x0d5b5f, 0.5);
      background.fillCircle(x + size * 0.25, y + size * 0.2, size * 0.65);
    }

    const atmosphericGlow = this.add.graphics().setDepth(-95);
    atmosphericGlow.lineStyle(3, 0x5ceaff, 0.15);
    atmosphericGlow.strokeEllipse(550, 548, 1500, 690);
    atmosphericGlow.lineStyle(8, 0x6cf5d4, 0.055);
    atmosphericGlow.strokeEllipse(550, 548, 1540, 720);
  }

  private createPathAndLandmarks(): void {
    const pathGraphics = this.add.graphics().setDepth(-20);
    pathGraphics.lineStyle(78, 0x06131e, 0.72);
    this.path.draw(pathGraphics, 96);
    pathGraphics.lineStyle(62, 0x243a44, 1);
    this.path.draw(pathGraphics, 96);
    pathGraphics.lineStyle(48, 0x344f52, 1);
    this.path.draw(pathGraphics, 96);
    pathGraphics.lineStyle(4, 0x8dd8a7, 0.35);
    this.path.draw(pathGraphics, 96);

    for (let i = 0; i <= 28; i += 1) {
      const point = this.path.getPoint(i / 28);
      pathGraphics.fillStyle(i % 2 === 0 ? 0xa9d88f : 0x6d9878, 0.35);
      pathGraphics.fillCircle(point.x, point.y, 3.2);
    }

    const portal = this.add.graphics().setDepth(10);
    portal.fillStyle(0x061225, 0.9);
    portal.fillCircle(18, 545, 50);
    portal.lineStyle(8, 0x63e6ff, 0.8);
    portal.strokeCircle(18, 545, 40);
    portal.lineStyle(3, 0xd0fbff, 0.8);
    portal.strokeCircle(18, 545, 27);
    this.tweens.add({
      targets: portal,
      alpha: { from: 0.72, to: 1 },
      duration: 920,
      yoyo: true,
      repeat: -1,
    });

    const base = this.add.graphics().setDepth(12);
    base.fillStyle(0x071329, 0.92);
    base.fillRoundedRect(1190, 453, 65, 136, 18);
    base.lineStyle(4, 0x5ce5ff, 0.8);
    base.strokeRoundedRect(1190, 453, 65, 136, 18);
    base.fillStyle(0x5ce5ff, 0.9);
    base.fillTriangle(1222, 470, 1203, 535, 1241, 535);
    base.fillStyle(0xffd36a, 1);
    base.fillCircle(1222, 552, 10);
    this.add
      .text(1222, 610, 'BEACON', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#bdefff',
        stroke: '#051024',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  private createBuildPads(): void {
    this.pads = BUILD_PADS.map((definition) => {
      const graphics = this.add.graphics();
      const container = this.add.container(definition.x, definition.y, [graphics]).setDepth(15);
      container.setSize(104, 104);
      container.setInteractive(new Phaser.Geom.Circle(0, 0, 52), Phaser.Geom.Circle.Contains);
      const pad: BuildPad = { definition, container, graphics };
      this.drawPad(pad, false);

      container.on('pointerdown', () => this.handlePadPressed(pad));
      container.on('pointerover', () => this.drawPad(pad, true));
      container.on('pointerout', () => this.drawPad(pad, false));
      return pad;
    });
  }

  private createHud(): void {
    const panel = this.add.graphics().setDepth(200);
    panel.fillStyle(0x06142b, 0.93);
    panel.fillRoundedRect(22, 18, 1205, 76, 20);
    panel.lineStyle(2, 0x4fdcf6, 0.42);
    panel.strokeRoundedRect(22, 18, 1205, 76, 20);

    this.add
      .text(48, 39, 'VERDARA', {
        fontFamily: TITLE_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#83f4d2',
      })
      .setDepth(202);
    this.add
      .text(48, 68, 'COMBAT LAB // BUREAU OUTPOST 01', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#829ab8',
      })
      .setDepth(202);

    this.integrityText = this.hudValue(260, 'INTEGRITY', '#ffcf67');
    this.energyText = this.hudValue(455, 'ENERGY', '#5ce5ff');
    this.waveText = this.hudValue(650, 'WAVE', '#a6f59c');
    this.threatsText = this.hudValue(835, 'THREATS', '#d3b0ff');

    this.pauseButton = this.makeButton(1012, 34, 92, 46, 'PAUSE', () => this.togglePause(), {
      compact: true,
    });
    this.speedButton = this.makeButton(1112, 34, 92, 46, '1×', () => this.toggleSpeed(), {
      compact: true,
    });

    this.tipText = this.add
      .text(624, 116, 'Select a defense, then tap a build pad.', {
        fontFamily: UI_FONT,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#dff8ff',
        backgroundColor: '#06142bdd',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5, 0)
      .setDepth(205);

    this.toastText = this.add
      .text(624, 805, '', {
        fontFamily: UI_FONT,
        fontSize: '23px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#06142bee',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(500);
  }

  private createSidebar(): void {
    const panel = this.add.graphics().setDepth(220);
    panel.fillGradientStyle(0x0b1f3d, 0x07172f, 0x061126, 0x030916, 1);
    panel.fillRect(1250, 0, 350, 900);
    panel.lineStyle(2, 0x54dff6, 0.34);
    panel.lineBetween(1251, 0, 1251, 900);

    this.add
      .text(1275, 28, 'DEFENSE LOADOUT', {
        fontFamily: TITLE_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color: '#eafaff',
      })
      .setDepth(225);
    this.add
      .text(1275, 66, 'TAP A SYSTEM TO DEPLOY', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#6e8aa8',
      })
      .setDepth(225);

    this.towerCards = [
      this.createTowerCard('pulse', 1270, 92),
      this.createTowerCard('cryo', 1270, 207),
    ];

    const divider = this.add.graphics().setDepth(224);
    divider.lineStyle(1, 0x4c7290, 0.35);
    divider.lineBetween(1275, 335, 1575, 335);

    this.selectionTitle = this.add
      .text(1275, 356, 'NO DEFENSE SELECTED', {
        fontFamily: TITLE_FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#9eb4cc',
      })
      .setDepth(225);
    this.selectionRole = this.add
      .text(1275, 394, 'Tap a placed tower to inspect it.', {
        fontFamily: UI_FONT,
        fontSize: '17px',
        color: '#718aa7',
        wordWrap: { width: 295 },
      })
      .setDepth(225);
    this.selectionStats = this.add
      .text(1275, 438, 'Range —\nDamage —\nTarget —', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        lineSpacing: 7,
        color: '#cae2f4',
      })
      .setDepth(225);

    this.upgradeButton = this.makeButton(1273, 522, 145, 50, 'UPGRADE', () => this.upgradeSelected(), {
      accent: 0x35d5ff,
    });
    this.sellButton = this.makeButton(1430, 522, 145, 50, 'SELL', () => this.sellSelected(), {
      accent: 0xffc65d,
    });
    this.priorityButton = this.makeButton(1273, 582, 302, 48, 'TARGET: FIRST', () => this.cyclePriority(), {
      accent: 0xa787f6,
      compact: true,
    });

    this.soundButton = this.makeButton(1273, 654, 145, 45, 'SOUND: ON', () => this.toggleSound(), {
      compact: true,
    });
    this.motionButton = this.makeButton(1430, 654, 145, 45, 'MOTION: FULL', () => this.toggleMotion(), {
      compact: true,
    });

    this.startWaveButton = this.makeButton(1273, 742, 302, 82, 'START WAVE 1', () => this.startWave(), {
      accent: 0x64ef9b,
      large: true,
    });

    this.add
      .text(1424, 846, 'SPACE: WAVE  •  P: PAUSE  •  1/2: SPEED', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: '#68809d',
      })
      .setOrigin(0.5)
      .setDepth(225);

    this.updateSelectionPanel();
    this.updateSettingsButtons();
  }

  private createInput(): void {
    this.input.on('pointerdown', () => this.soundFx.unlock());
    this.input.keyboard?.on('keydown-SPACE', () => this.startWave());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ONE', () => this.setSpeed(1));
    this.input.keyboard?.on('keydown-TWO', () => this.setSpeed(2));
    this.input.keyboard?.on('keydown-ESC', () => this.cancelBuild());
  }

  private showBriefing(): void {
    const modal = this.add.container(0, 0).setDepth(1000);
    const blocker = this.add.graphics();
    blocker.fillStyle(0x020611, 0.88);
    blocker.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT), Phaser.Geom.Rectangle.Contains);

    const panel = this.add.graphics();
    panel.fillGradientStyle(0x102c50, 0x0a1f3f, 0x06142c, 0x040c1c, 1);
    panel.fillRoundedRect(300, 120, 1000, 660, 36);
    panel.lineStyle(3, 0x58e2ff, 0.6);
    panel.strokeRoundedRect(300, 120, 1000, 660, 36);

    const art = this.add.graphics();
    art.fillStyle(0x4cd9ff, 0.12);
    art.fillCircle(520, 440, 205);
    art.lineStyle(5, 0x61eaff, 0.26);
    art.strokeEllipse(520, 440, 470, 170);
    art.fillStyle(0x1a9b8a, 1);
    art.fillCircle(520, 440, 142);
    art.fillStyle(0x7cdd88, 0.78);
    art.fillEllipse(490, 402, 220, 92);
    art.fillStyle(0x135c72, 0.7);
    art.fillEllipse(555, 505, 170, 70);
    art.lineStyle(8, 0x9cf6d7, 0.35);
    art.strokeCircle(520, 440, 151);
    art.fillStyle(0xffd56f, 1);
    art.fillCircle(680, 298, 10);
    art.fillStyle(0xa580ff, 1);
    art.fillCircle(355, 330, 7);

    const eyebrow = this.add.text(755, 190, 'PLANETARY DEFENSE BUREAU', {
      fontFamily: UI_FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#66e5ff',
    });
    const title = this.add.text(755, 222, 'COMBAT LAB', {
      fontFamily: TITLE_FONT,
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    const subtitle = this.add.text(758, 282, 'VERDARA // FIRST CONTACT', {
      fontFamily: TITLE_FONT,
      fontSize: '29px',
      fontStyle: 'bold',
      color: '#9ff3d3',
    });
    const body = this.add.text(
      758,
      342,
      'The Chromacore Swarm has found Verdara.\n\nHold the extraction beacon through ten waves. Build on marked pads, combine Pulse damage with Cryo control, and watch for layered armor and incoming saucers.',
      {
        fontFamily: UI_FONT,
        fontSize: '23px',
        lineSpacing: 8,
        color: '#c5d9ea',
        wordWrap: { width: 455 },
      },
    );
    const record = this.add.text(
      758,
      524,
      `BEST WAVE  ${this.saveData.snapshot.bestWave}/10     VICTORIES  ${this.saveData.snapshot.victories}`,
      {
        fontFamily: UI_FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: '#ffcf69',
      },
    );
    const note = this.add.text(758, 560, 'PROTOTYPE ART // GAMEPLAY-FIRST MILESTONE', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#6e89a6',
    });
    const deploy = this.makeButton(758, 620, 410, 82, 'DEPLOY TO VERDARA', () => {
      this.soundFx.play('place');
      modal.destroy(true);
      this.state = 'playing';
      this.showToast('Select a defense, then tap a glowing build pad.', 0x73e9ff);
    }, { accent: 0x59eea0, large: true });

    modal.add([blocker, panel, art, eyebrow, title, subtitle, body, record, note, deploy.container]);
  }

  private showResult(victory: boolean): void {
    this.state = victory ? 'victory' : 'defeat';
    this.paused = true;
    if (victory) {
      this.saveData.recordVictory();
      this.soundFx.play('victory');
    }

    const modal = this.add.container(0, 0).setDepth(1200);
    const blocker = this.add.graphics();
    blocker.fillStyle(0x020611, 0.9);
    blocker.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    blocker.setInteractive(new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT), Phaser.Geom.Rectangle.Contains);
    const panel = this.add.graphics();
    panel.fillStyle(victory ? 0x0a2d35 : 0x241329, 1);
    panel.fillRoundedRect(430, 190, 740, 520, 34);
    panel.lineStyle(4, victory ? 0x66f0b0 : 0xff708e, 0.8);
    panel.strokeRoundedRect(430, 190, 740, 520, 34);
    const eyebrow = this.add
      .text(800, 270, victory ? 'VERDARA SECURED' : 'BEACON OVERRUN', {
        fontFamily: UI_FONT,
        fontSize: '19px',
        fontStyle: 'bold',
        color: victory ? '#79f2c2' : '#ff8da3',
      })
      .setOrigin(0.5);
    const title = this.add
      .text(800, 320, victory ? 'MISSION COMPLETE' : 'REGROUP', {
        fontFamily: TITLE_FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        800,
        406,
        victory
          ? 'The Combat Lab is stable. Your defenses held through all ten waves.'
          : `You reached wave ${Math.min(this.currentWaveIndex + 1, WAVES.length)}. Reposition, upgrade earlier, and try again.`,
        {
          fontFamily: UI_FONT,
          fontSize: '23px',
          color: '#c8d9e8',
          align: 'center',
          wordWrap: { width: 520 },
        },
      )
      .setOrigin(0.5);
    const stats = this.add
      .text(800, 490, `BEST WAVE  ${this.saveData.snapshot.bestWave}/10`, {
        fontFamily: UI_FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffcf69',
      })
      .setOrigin(0.5);
    const restart = this.makeButton(600, 565, 400, 74, 'RUN COMBAT LAB AGAIN', () => this.scene.restart(), {
      accent: victory ? 0x5be9a3 : 0xff758f,
      large: true,
    });
    modal.add([blocker, panel, eyebrow, title, body, stats, restart.container]);
  }

  private handlePadPressed(pad: BuildPad): void {
    if (this.state !== 'playing' || this.paused) return;
    this.soundFx.unlock();

    if (pad.tower) {
      this.selectTower(pad.tower);
      return;
    }

    if (!this.selectedBuildKey) {
      this.showToast('Choose Pulse or Cryo from the defense tray.', 0xffcf67);
      return;
    }

    const definition = TOWERS[this.selectedBuildKey];
    if (this.energy < definition.cost) {
      this.soundFx.play('leak');
      this.showToast(`Need ${definition.cost - this.energy} more energy.`, 0xff7892);
      return;
    }

    this.energy -= definition.cost;
    const tower = new Tower(this, pad.definition.x, pad.definition.y, this.selectedBuildKey, pad.definition.id);
    tower.on('pointerdown', () => this.selectTower(tower));
    pad.tower = tower;
    this.towers.push(tower);
    this.soundFx.play('place');
    this.emitBurst(tower.x, tower.y, definition.color, 10, 55);
    this.selectTower(tower);
    this.cancelBuild();
    this.drawPad(pad, false);
    this.showToast(`${definition.name} deployed.`, definition.color);
    this.refreshHud();
  }

  private selectBuildType(key: TowerKey): void {
    if (this.state !== 'playing' || this.paused) return;
    this.selectedTower?.setSelected(false);
    this.selectedTower = undefined;
    this.selectedBuildKey = this.selectedBuildKey === key ? undefined : key;
    this.soundFx.play('tap');
    this.redrawTowerCards();
    this.pads.forEach((pad) => this.drawPad(pad, false));
    this.updateSelectionPanel();
    if (this.selectedBuildKey) {
      this.showToast(`Tap an empty pad to place ${TOWERS[key].name}.`, TOWERS[key].color);
    }
  }

  private cancelBuild(): void {
    this.selectedBuildKey = undefined;
    this.redrawTowerCards();
    this.pads.forEach((pad) => this.drawPad(pad, false));
  }

  private selectTower(tower: Tower): void {
    if (this.state !== 'playing') return;
    this.cancelBuild();
    this.selectedTower?.setSelected(false);
    this.selectedTower = tower;
    tower.setSelected(true);
    this.soundFx.play('tap');
    this.updateSelectionPanel();
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower;
    if (!tower?.active || this.state !== 'playing') return;
    const cost = tower.upgradeCost;
    if (!cost) {
      this.showToast('This defense is at maximum level.', 0xb79cff);
      return;
    }
    if (this.energy < cost) {
      this.showToast(`Need ${cost - this.energy} more energy.`, 0xff7892);
      return;
    }
    this.energy -= cost;
    tower.upgrade();
    this.soundFx.play('place');
    this.emitBurst(tower.x, tower.y, tower.definition.accentColor, 14, 68);
    this.updateSelectionPanel();
    this.refreshHud();
  }

  private sellSelected(): void {
    const tower = this.selectedTower;
    if (!tower?.active || this.state !== 'playing') return;
    const value = tower.sellValue;
    this.energy += value;
    const pad = this.pads.find((candidate) => candidate.definition.id === tower.padId);
    if (pad) {
      pad.tower = undefined;
      this.drawPad(pad, false);
    }
    this.towers = this.towers.filter((candidate) => candidate !== tower);
    this.emitBurst(tower.x, tower.y, 0xffcf67, 10, 50);
    tower.destroy();
    this.selectedTower = undefined;
    this.soundFx.play('tap');
    this.showToast(`Defense reclaimed for ${value} energy.`, 0xffcf67);
    this.updateSelectionPanel();
    this.refreshHud();
  }

  private cyclePriority(): void {
    if (!this.selectedTower?.active || this.state !== 'playing') return;
    const priority = this.selectedTower.cyclePriority();
    this.soundFx.play('tap');
    this.showToast(`Target priority: ${this.priorityLabel(priority)}.`, 0xb79cff);
    this.updateSelectionPanel();
  }

  private startWave(): void {
    if (this.state !== 'playing' || this.paused || this.waveActive || this.currentWaveIndex >= WAVES.length) return;
    if (this.towers.length === 0) {
      this.showToast('Deploy at least one defense before starting.', 0xffcf67);
      return;
    }

    const wave = WAVES[this.currentWaveIndex];
    this.spawnQueue = [];
    this.spawnCursor = 0;
    let cursor = 0;
    for (const group of wave.groups) {
      cursor += group.delayMs ?? 0;
      for (let index = 0; index < group.count; index += 1) {
        this.spawnQueue.push({ at: cursor + index * group.intervalMs, enemy: group.enemy });
      }
      cursor += group.count * group.intervalMs;
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.waveStartedAt = this.combatTime;
    this.waveActive = true;
    this.tipText.setText(`WAVE ${this.currentWaveIndex + 1}: ${wave.title.toUpperCase()}  //  ${wave.hint}`);
    this.soundFx.play('place');
    this.startWaveButton.setEnabled(false);
    this.refreshHud();
  }

  private processSpawns(): void {
    const elapsed = this.combatTime - this.waveStartedAt;
    while (this.spawnCursor < this.spawnQueue.length && this.spawnQueue[this.spawnCursor].at <= elapsed) {
      this.spawnEnemy(this.spawnQueue[this.spawnCursor].enemy, 0);
      this.spawnCursor += 1;
    }
  }

  private spawnEnemy(key: EnemyKey, progress: number): Enemy {
    const callbacks: EnemyCallbacks = {
      onKilled: (enemy, reward) => this.handleEnemyKilled(enemy, reward),
      onLeak: (enemy, damage) => this.handleEnemyLeak(enemy, damage),
      onVehicleBroken: (_enemy, contained, currentProgress) => {
        const passenger = this.spawnEnemy(contained, Math.min(0.985, currentProgress + 0.006));
        this.emitBurst(passenger.x, passenger.y, ENEMIES[contained].bodyColor, 12, 72);
      },
      onLayerBroken: (enemy, layer) => {
        this.soundFx.play('break');
        this.emitBurst(enemy.x, enemy.y, layer === 'armor' ? 0xb7c4d8 : 0x66e9ff, 14, 66);
        this.showToast(layer === 'armor' ? 'SCRAP ARMOR BROKEN' : 'UFO SHELL BREACHED', 0xc8efff);
      },
    };
    const enemy = new Enemy(this, this.path, key, progress, callbacks);
    this.enemies.push(enemy);
    return enemy;
  }

  private handleEnemyKilled(enemy: Enemy, reward: number): void {
    this.energy += reward;
    this.soundFx.play('impact');
    this.emitBurst(enemy.x, enemy.y, enemy.definition.bodyColor, 8, 42);
  }

  private handleEnemyLeak(enemy: Enemy, damage: number): void {
    if (this.state !== 'playing') return;
    this.integrity = Math.max(0, this.integrity - damage);
    this.soundFx.play('leak');
    this.cameras.main.shake(this.saveData.snapshot.reducedMotion ? 0 : 120, 0.005);
    this.showToast(`BEACON HIT  −${damage} INTEGRITY`, 0xff718e);
    if (this.integrity <= 0) {
      this.saveData.setBestWave(this.currentWaveIndex);
      this.showResult(false);
    }
  }

  private completeWave(): void {
    const completedNumber = this.currentWaveIndex + 1;
    const bonus = WAVES[this.currentWaveIndex].clearBonus;
    this.energy += bonus;
    this.waveActive = false;
    this.currentWaveIndex += 1;
    this.saveData.setBestWave(completedNumber);
    this.showToast(`WAVE ${completedNumber} CLEAR  +${bonus} ENERGY`, 0x6ff0aa);

    if (this.currentWaveIndex >= WAVES.length) {
      this.showResult(true);
      return;
    }

    this.tipText.setText(
      `NEXT: ${WAVES[this.currentWaveIndex].title.toUpperCase()}  //  ${WAVES[this.currentWaveIndex].hint}`,
    );
    this.startWaveButton.setEnabled(true);
    this.refreshHud();
  }

  private resolveTowerShot(shot: TowerShot): void {
    if (shot.damageTag === 'pulse') {
      this.soundFx.play('pulse');
      const projectile = this.add.circle(shot.tower.x, shot.tower.y - 22, 7, shot.tower.definition.color, 1);
      projectile.setStrokeStyle(3, 0xd8fbff, 0.8).setDepth(60);
      const targetX = shot.target.x;
      const targetY = shot.target.y;
      this.tweens.add({
        targets: projectile,
        x: targetX,
        y: targetY,
        scale: 0.55,
        duration: 125,
        ease: 'Quad.In',
        onComplete: () => {
          projectile.destroy();
          if (!shot.target.active) return;
          shot.target.takeHit(shot.damage, shot.damageTag);
          this.emitBurst(shot.target.x, shot.target.y, shot.tower.definition.color, 4, 24);
        },
      });
      return;
    }

    this.soundFx.play('cryo');
    const line = this.add.graphics().setDepth(59);
    line.lineStyle(8, 0x73e9ff, 0.22);
    line.lineBetween(shot.tower.x, shot.tower.y - 20, shot.target.x, shot.target.y);
    line.lineStyle(3, 0xe8ffff, 0.88);
    line.lineBetween(shot.tower.x, shot.tower.y - 20, shot.target.x, shot.target.y);
    const ring = this.add.circle(shot.target.x, shot.target.y, shot.splashRadius ?? 60, 0x6fe8ff, 0.08);
    ring.setStrokeStyle(3, 0x9cf0ff, 0.72).setDepth(58);
    this.tweens.add({
      targets: [line, ring],
      alpha: 0,
      scale: 1.14,
      duration: this.saveData.snapshot.reducedMotion ? 80 : 230,
      onComplete: () => {
        line.destroy();
        ring.destroy();
      },
    });

    const radius = shot.splashRadius ?? 0;
    const targets = this.enemies.filter(
      (enemy) =>
        enemy.active && Phaser.Math.Distance.Between(shot.target.x, shot.target.y, enemy.x, enemy.y) <= radius,
    );
    for (const enemy of targets) {
      enemy.takeHit(shot.damage, shot.damageTag);
      if (shot.slowFactor && shot.slowDurationMs) {
        enemy.applySlow(shot.slowFactor, shot.slowDurationMs, this.combatTime);
      }
    }
  }

  private createTowerCard(key: TowerKey, x: number, y: number): TowerCard {
    const definition = TOWERS[key];
    const graphics = this.add.graphics();
    const container = this.add.container(x, y, [graphics]).setDepth(225);
    container.setSize(305, 102).setInteractive(new Phaser.Geom.Rectangle(0, 0, 305, 102), Phaser.Geom.Rectangle.Contains);

    const icon = this.add.graphics();
    icon.fillStyle(definition.color, 0.18);
    icon.fillCircle(50, 51, 34);
    icon.lineStyle(3, definition.color, 0.9);
    icon.strokeCircle(50, 51, 30);
    icon.fillStyle(definition.color, 1);
    if (key === 'pulse') {
      icon.fillRoundedRect(43, 22, 14, 48, 6);
      icon.fillStyle(definition.accentColor, 1);
      icon.fillCircle(50, 19, 7);
    } else {
      icon.fillTriangle(50, 18, 31, 65, 69, 65);
      icon.fillStyle(definition.accentColor, 0.9);
      icon.fillCircle(50, 62, 7);
    }
    const name = this.add.text(94, 20, definition.name, {
      fontFamily: TITLE_FONT,
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#effaff',
    });
    const role = this.add.text(94, 52, definition.role, {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#829bb6',
      wordWrap: { width: 150 },
    });
    const cost = this.add
      .text(276, 38, `${definition.cost}`, {
        fontFamily: UI_FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffcf67',
      })
      .setOrigin(1, 0);
    const energyLabel = this.add
      .text(276, 64, 'ENERGY', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7b91aa',
      })
      .setOrigin(1, 0);
    container.add([icon, name, role, cost, energyLabel]);
    container.on('pointerdown', () => this.selectBuildType(key));
    container.on('pointerover', () => this.drawTowerCard({ key, container, graphics }, true));
    container.on('pointerout', () => this.drawTowerCard({ key, container, graphics }, false));
    const card = { key, container, graphics };
    this.drawTowerCard(card, false);
    return card;
  }

  private drawTowerCard(card: TowerCard, hovered: boolean): void {
    const selected = this.selectedBuildKey === card.key;
    const definition = TOWERS[card.key];
    card.graphics.clear();
    card.graphics.fillStyle(selected ? 0x123c54 : hovered ? 0x102d48 : 0x091a33, 0.96);
    card.graphics.fillRoundedRect(0, 0, 305, 102, 16);
    card.graphics.lineStyle(selected ? 3 : 2, definition.color, selected ? 0.95 : hovered ? 0.62 : 0.25);
    card.graphics.strokeRoundedRect(0, 0, 305, 102, 16);
  }

  private redrawTowerCards(): void {
    this.towerCards.forEach((card) => this.drawTowerCard(card, false));
  }

  private drawPad(pad: BuildPad, hovered: boolean): void {
    const occupied = Boolean(pad.tower);
    const buildMode = Boolean(this.selectedBuildKey);
    const color = this.selectedBuildKey ? TOWERS[this.selectedBuildKey].color : 0x72e8ff;
    pad.graphics.clear();
    pad.graphics.fillStyle(0x04101e, occupied ? 0.45 : 0.75);
    pad.graphics.fillCircle(0, 0, 45);
    pad.graphics.lineStyle(
      hovered || (buildMode && !occupied) ? 4 : 2,
      occupied ? 0x36526b : color,
      occupied ? 0.25 : buildMode ? 0.82 : 0.35,
    );
    pad.graphics.strokeCircle(0, 0, hovered ? 48 : 44);
    pad.graphics.lineStyle(2, 0xffffff, occupied ? 0.08 : 0.18);
    pad.graphics.strokeCircle(0, 0, 31);
    if (!occupied) {
      pad.graphics.fillStyle(color, buildMode ? 0.82 : 0.3);
      pad.graphics.fillRoundedRect(-15, -3, 30, 6, 3);
      pad.graphics.fillRoundedRect(-3, -15, 6, 30, 3);
    }
  }

  private hudValue(x: number, label: string, color: string): Phaser.GameObjects.Text {
    this.add
      .text(x, 34, label, {
        fontFamily: UI_FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#6f88a5',
      })
      .setDepth(202);
    return this.add
      .text(x, 51, '—', {
        fontFamily: TITLE_FONT,
        fontSize: '30px',
        fontStyle: 'bold',
        color,
      })
      .setDepth(202);
  }

  private makeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    initialLabel: string,
    onPressed: () => void,
    options: { accent?: number; compact?: boolean; large?: boolean } = {},
  ): UiButton {
    const accent = options.accent ?? 0x5fdcf4;
    const background = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2, initialLabel, {
        fontFamily: TITLE_FONT,
        fontSize: options.large ? '25px' : options.compact ? '20px' : '20px',
        fontStyle: 'bold',
        color: '#effbff',
        align: 'center',
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [background, label]).setDepth(230);
    container.setSize(width, height);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    let enabled = true;
    let hovered = false;

    const redraw = (): void => {
      background.clear();
      background.fillStyle(hovered && enabled ? 0x173a50 : 0x0b2039, enabled ? 0.98 : 0.5);
      background.fillRoundedRect(0, 0, width, height, options.large ? 16 : 12);
      background.lineStyle(enabled ? 2.5 : 1.5, accent, enabled ? (hovered ? 0.95 : 0.65) : 0.18);
      background.strokeRoundedRect(0, 0, width, height, options.large ? 16 : 12);
      if (options.large && enabled) {
        background.fillStyle(accent, 0.12);
        background.fillRoundedRect(5, 5, width - 10, height - 10, 12);
      }
      label.setAlpha(enabled ? 1 : 0.45);
    };

    container.on('pointerdown', () => {
      if (!enabled) return;
      this.soundFx?.play('tap');
      onPressed();
    });
    container.on('pointerover', () => {
      hovered = true;
      redraw();
    });
    container.on('pointerout', () => {
      hovered = false;
      redraw();
    });
    redraw();

    return {
      container,
      label,
      setLabel: (nextLabel: string) => label.setText(nextLabel),
      setEnabled: (nextEnabled: boolean) => {
        enabled = nextEnabled;
        redraw();
      },
    };
  }

  private updateSelectionPanel(): void {
    const tower = this.selectedTower;
    if (!tower?.active) {
      this.selectionTitle?.setText('NO DEFENSE SELECTED').setColor('#9eb4cc');
      this.selectionRole?.setText(
        this.selectedBuildKey ? `Deploying ${TOWERS[this.selectedBuildKey].name}.` : 'Tap a placed tower to inspect it.',
      );
      this.selectionStats?.setText('Range —\nDamage —\nTarget —');
      this.upgradeButton?.setLabel('UPGRADE');
      this.upgradeButton?.setEnabled(false);
      this.sellButton?.setLabel('SELL');
      this.sellButton?.setEnabled(false);
      this.priorityButton?.setLabel('TARGET: FIRST');
      this.priorityButton?.setEnabled(false);
      return;
    }

    this.selectionTitle
      .setText(`${tower.definition.name.toUpperCase()}  //  MK ${tower.level}`)
      .setColor(`#${tower.definition.color.toString(16).padStart(6, '0')}`);
    this.selectionRole.setText(tower.definition.role);
    this.selectionStats.setText(
      `Range  ${Math.round(tower.range)}\nDamage  ${tower.damage.toFixed(0)}\nTarget  ${this.priorityLabel(tower.priority)}`,
    );
    const upgradeCost = tower.upgradeCost;
    this.upgradeButton.setLabel(upgradeCost ? `UPGRADE  ${upgradeCost}` : 'MAX LEVEL');
    this.upgradeButton.setEnabled(Boolean(upgradeCost));
    this.sellButton.setLabel(`SELL  +${tower.sellValue}`);
    this.sellButton.setEnabled(true);
    this.priorityButton.setLabel(`TARGET: ${this.priorityLabel(tower.priority).toUpperCase()}`);
    this.priorityButton.setEnabled(true);
  }

  private updateSettingsButtons(): void {
    this.soundButton?.setLabel(`SOUND: ${this.saveData.snapshot.soundEnabled ? 'ON' : 'OFF'}`);
    this.motionButton?.setLabel(`MOTION: ${this.saveData.snapshot.reducedMotion ? 'LOW' : 'FULL'}`);
  }

  private refreshHud(): void {
    this.integrityText?.setText(`${this.integrity} / 20`);
    this.energyText?.setText(`${this.energy}`);
    this.waveText?.setText(
      this.currentWaveIndex >= WAVES.length
        ? '10 / 10'
        : `${this.currentWaveIndex + (this.waveActive ? 1 : 0)} / ${WAVES.length}`,
    );
    const remaining = this.enemies.length + Math.max(0, this.spawnQueue.length - this.spawnCursor);
    this.threatsText?.setText(`${remaining}`);
    if (this.startWaveButton) {
      this.startWaveButton.setLabel(
        this.waveActive
          ? `WAVE ${this.currentWaveIndex + 1} ACTIVE`
          : this.currentWaveIndex >= WAVES.length
            ? 'SECTOR SECURE'
            : `START WAVE ${this.currentWaveIndex + 1}`,
      );
      this.startWaveButton.setEnabled(!this.waveActive && this.currentWaveIndex < WAVES.length && !this.paused);
    }
  }

  private togglePause(): void {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    this.pauseButton.setLabel(this.paused ? 'RESUME' : 'PAUSE');
    this.tipText.setText(
      this.paused
        ? 'SIMULATION PAUSED'
        : this.waveActive
          ? `WAVE ${this.currentWaveIndex + 1}: ${WAVES[this.currentWaveIndex].title.toUpperCase()}`
          : `NEXT: ${WAVES[this.currentWaveIndex]?.title.toUpperCase() ?? 'SECTOR SECURE'}`,
    );
    this.refreshHud();
  }

  private toggleSpeed(): void {
    this.setSpeed(this.gameSpeed === 1 ? 2 : 1);
  }

  private setSpeed(speed: 1 | 2): void {
    if (this.state !== 'playing') return;
    this.gameSpeed = speed;
    this.speedButton.setLabel(`${speed}×`);
    this.showToast(`Simulation speed ${speed}×.`, 0x73e9ff);
  }

  private toggleSound(): void {
    const enabled = !this.saveData.snapshot.soundEnabled;
    this.saveData.setSoundEnabled(enabled);
    this.soundFx.setEnabled(enabled);
    if (enabled) this.soundFx.play('place');
    this.updateSettingsButtons();
  }

  private toggleMotion(): void {
    const reduced = !this.saveData.snapshot.reducedMotion;
    this.saveData.setReducedMotion(reduced);
    this.updateSettingsButtons();
    this.showToast(reduced ? 'Reduced motion enabled.' : 'Full motion enabled.', 0xb79cff);
  }

  private showToast(message: string, color: number): void {
    if (!this.toastText) return;
    this.toastText.setText(message).setColor(`#${color.toString(16).padStart(6, '0')}`);
    this.toastText.setAlpha(1).setScale(0.96);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({
      targets: this.toastText,
      alpha: 0,
      scale: 1,
      delay: 1250,
      duration: this.saveData.snapshot.reducedMotion ? 80 : 320,
    });
  }

  private emitBurst(x: number, y: number, color: number, count: number, radius: number): void {
    const reducedCount = this.saveData.snapshot.reducedMotion ? Math.min(3, count) : count;
    for (let index = 0; index < reducedCount; index += 1) {
      const angle = (Math.PI * 2 * index) / reducedCount + seededUnit(index + Math.round(this.combatTime)) * 0.5;
      const distance = radius * (0.55 + seededUnit(index * 17 + 4) * 0.45);
      const particle = this.add.circle(x, y, 2.5 + (index % 3), color, 0.9).setDepth(70);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: this.saveData.snapshot.reducedMotion ? 90 : 280 + index * 8,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private priorityLabel(priority: TargetPriority): string {
    if (priority === 'armor') return 'Layered';
    return priority[0].toUpperCase() + priority.slice(1);
  }
}
