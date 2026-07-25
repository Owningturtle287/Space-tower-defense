import Phaser from 'phaser';
import { TOWERS, type DamageTag, type TargetPriority, type TowerDefinition, type TowerKey } from '../content';
import { chooseTarget } from '../core/combat';
import type { Enemy } from './Enemy';

export interface TowerShot {
  tower: Tower;
  target: Enemy;
  damage: number;
  damageTag: DamageTag;
  slowFactor?: number;
  slowDurationMs?: number;
  splashRadius?: number;
}

const damageMultipliers = [1, 1.62, 2.42];
const rangeMultipliers = [1, 1.08, 1.16];
const cooldownMultipliers = [1, 0.86, 0.73];

export class Tower extends Phaser.GameObjects.Container {
  readonly towerKey: TowerKey;
  readonly definition: TowerDefinition;
  readonly padId: string;
  level = 1;
  priority: TargetPriority = 'first';
  totalInvested: number;

  private readonly rangeVisual: Phaser.GameObjects.Graphics;
  private readonly visual: Phaser.GameObjects.Graphics;
  private readonly levelLabel: Phaser.GameObjects.Text;
  private lastFiredAt = -10000;
  private selected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, towerKey: TowerKey, padId: string) {
    super(scene, x, y);
    this.towerKey = towerKey;
    this.definition = TOWERS[towerKey];
    this.padId = padId;
    this.totalInvested = this.definition.cost;

    this.rangeVisual = scene.add.graphics();
    this.visual = scene.add.graphics();
    this.levelLabel = scene.add
      .text(0, 35, 'I', {
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#dff8ff',
        stroke: '#07142b',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add([this.rangeVisual, this.visual, this.levelLabel]);
    this.setSize(100, 100);
    this.setInteractive(new Phaser.Geom.Circle(0, 0, 48), Phaser.Geom.Circle.Contains);
    this.setDepth(30);
    this.draw();
    scene.add.existing(this);
  }

  get damage(): number {
    return this.definition.baseDamage * damageMultipliers[this.level - 1];
  }

  get range(): number {
    return this.definition.baseRange * rangeMultipliers[this.level - 1];
  }

  get cooldownMs(): number {
    return this.definition.cooldownMs * cooldownMultipliers[this.level - 1];
  }

  get upgradeCost(): number | undefined {
    return this.level < 3 ? this.definition.upgradeCosts[this.level - 1] : undefined;
  }

  get sellValue(): number {
    return Math.floor(this.totalInvested * 0.7);
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.drawRange();
  }

  upgrade(): boolean {
    const cost = this.upgradeCost;
    if (!cost) return false;
    this.totalInvested += cost;
    this.level += 1;
    this.levelLabel.setText(['I', 'II', 'III'][this.level - 1]);
    this.draw();
    return true;
  }

  cyclePriority(): TargetPriority {
    const priorities: TargetPriority[] = ['first', 'strong', 'armor'];
    this.priority = priorities[(priorities.indexOf(this.priority) + 1) % priorities.length];
    return this.priority;
  }

  tryFire(combatTime: number, enemies: Enemy[]): TowerShot | undefined {
    if (!this.active || combatTime - this.lastFiredAt < this.cooldownMs) return undefined;

    const inRange = enemies.filter(
      (enemy) => enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) <= this.range,
    );
    const target = chooseTarget(inRange, this.priority);
    if (!target) return undefined;

    this.lastFiredAt = combatTime;
    this.aimAt(target.x, target.y);
    return {
      tower: this,
      target,
      damage: this.damage,
      damageTag: this.definition.damageTag,
      slowFactor: this.definition.slowFactor,
      slowDurationMs: this.definition.slowDurationMs,
      splashRadius: this.definition.splashRadius,
    };
  }

  private draw(): void {
    this.visual.clear();
    const color = this.definition.color;
    const accent = this.definition.accentColor;

    this.visual.fillStyle(0x020713, 0.38);
    this.visual.fillEllipse(3, 27, 80, 23);
    this.visual.fillStyle(0x172944, 1);
    this.visual.lineStyle(4, 0x4a6a88, 1);
    this.visual.fillCircle(0, 13, 33);
    this.visual.strokeCircle(0, 13, 33);
    this.visual.fillStyle(0x243c5b, 1);
    this.visual.fillCircle(0, 8, 25);

    if (this.towerKey === 'pulse') {
      this.visual.fillStyle(color, 1);
      this.visual.fillRoundedRect(-11, -33, 22, 52, 8);
      this.visual.lineStyle(3, 0xc9f7ff, 0.8);
      this.visual.strokeRoundedRect(-11, -33, 22, 52, 8);
      this.visual.fillStyle(accent, 1);
      this.visual.fillRoundedRect(-6, -45, 12, 20, 5);
      this.visual.fillCircle(0, 7, 8);
    } else {
      this.visual.fillStyle(0x244f72, 1);
      this.visual.fillRoundedRect(-18, -5, 36, 30, 8);
      this.visual.fillStyle(color, 0.95);
      this.visual.fillTriangle(0, -46, -19, 1, 19, 1);
      this.visual.lineStyle(3, 0xd8fbff, 0.85);
      this.visual.strokeTriangle(0, -46, -19, 1, 19, 1);
      this.visual.fillStyle(accent, 0.9);
      this.visual.fillCircle(0, 5, 8 + this.level * 2);
    }

    for (let i = 0; i < this.level; i += 1) {
      const angle = Phaser.Math.DegToRad(135 + i * 45);
      this.visual.fillStyle(accent, 1);
      this.visual.fillCircle(Math.cos(angle) * 27, 13 + Math.sin(angle) * 27, 3.5);
    }

    this.drawRange();
  }

  private drawRange(): void {
    this.rangeVisual.clear();
    if (!this.selected) return;
    this.rangeVisual.fillStyle(this.definition.color, 0.055);
    this.rangeVisual.fillCircle(0, 0, this.range);
    this.rangeVisual.lineStyle(3, this.definition.color, 0.6);
    this.rangeVisual.strokeCircle(0, 0, this.range);
    this.rangeVisual.lineStyle(2, 0xffffff, 0.65);
    this.rangeVisual.strokeCircle(0, 0, 45);
  }

  private aimAt(targetX: number, targetY: number): void {
    if (this.towerKey !== 'pulse') {
      this.scene.tweens.add({ targets: this.visual, scale: 1.1, duration: 70, yoyo: true });
      return;
    }
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY) + Math.PI / 2;
    this.scene.tweens.add({
      targets: this.visual,
      rotation: angle,
      duration: 90,
      ease: 'Sine.Out',
    });
    this.scene.tweens.add({
      targets: this.visual,
      scaleY: 0.88,
      duration: 45,
      yoyo: true,
    });
  }
}
