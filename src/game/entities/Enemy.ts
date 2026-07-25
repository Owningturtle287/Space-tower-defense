import Phaser from 'phaser';
import {
  ENEMIES,
  bodyHealthFor,
  type DamageTag,
  type EnemyDefinition,
  type EnemyKey,
} from '../content';
import { resolveDamage, type DamageResolution } from '../core/combat';

export interface EnemyCallbacks {
  onKilled: (enemy: Enemy, reward: number) => void;
  onLeak: (enemy: Enemy, integrityDamage: number) => void;
  onVehicleBroken: (enemy: Enemy, contained: EnemyKey, progress: number) => void;
  onLayerBroken: (enemy: Enemy, layer: 'armor' | 'vehicle') => void;
}

export class Enemy extends Phaser.GameObjects.Container {
  readonly definition: EnemyDefinition;
  readonly path: Phaser.Curves.Spline;
  readonly pathLength: number;

  progress: number;
  bodyHp: number;
  armorHp: number;
  vehicleHp: number;

  private readonly callbacks: EnemyCallbacks;
  private readonly visual: Phaser.GameObjects.Graphics;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private readonly statusAura: Phaser.GameObjects.Graphics;
  private slowFactor = 1;
  private slowedUntil = 0;
  private maxTotalHealth: number;
  private bobOffset: number;

  constructor(
    scene: Phaser.Scene,
    path: Phaser.Curves.Spline,
    key: EnemyKey,
    progress: number,
    callbacks: EnemyCallbacks,
  ) {
    super(scene, 0, 0);
    this.definition = ENEMIES[key];
    this.path = path;
    this.pathLength = Math.max(1, path.getLength());
    this.progress = progress;
    this.callbacks = callbacks;
    this.bodyHp = bodyHealthFor(this.definition);
    this.armorHp = this.definition.armorHp ?? 0;
    this.vehicleHp = this.definition.vehicleHp ?? 0;
    this.maxTotalHealth = this.bodyHp + this.armorHp + this.vehicleHp;
    this.bobOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);

    this.statusAura = scene.add.graphics();
    this.visual = scene.add.graphics();
    this.healthBar = scene.add.graphics();
    this.add([this.statusAura, this.visual, this.healthBar]);
    this.setDepth(40);
    this.draw();
    this.updatePosition(0);
    scene.add.existing(this);
  }

  updateEnemy(deltaMs: number, now: number, speedMultiplier: number): void {
    if (!this.active) return;

    if (now >= this.slowedUntil) {
      this.slowFactor = 1;
      this.statusAura.clear();
    }

    const distance = this.definition.speed * this.slowFactor * speedMultiplier * (deltaMs / 1000);
    this.progress += distance / this.pathLength;
    this.updatePosition(now);

    if (this.progress >= 1) {
      this.callbacks.onLeak(this, this.definition.leakDamage);
      this.destroy();
    }
  }

  applySlow(factor: number, durationMs: number, now: number): void {
    if (!this.active) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowedUntil = Math.max(this.slowedUntil, now + durationMs);
    this.drawSlowAura();
  }

  takeHit(rawDamage: number, tag: DamageTag): DamageResolution | undefined {
    if (!this.active) return undefined;

    const resolution = resolveDamage(
      { bodyHp: this.bodyHp, armorHp: this.armorHp, vehicleHp: this.vehicleHp },
      rawDamage,
      tag,
      this.definition.armorReduction ?? 0,
    );
    this.bodyHp = resolution.next.bodyHp;
    this.armorHp = resolution.next.armorHp;
    this.vehicleHp = resolution.next.vehicleHp;

    if (resolution.armorBroken) this.callbacks.onLayerBroken(this, 'armor');
    if (resolution.vehicleBroken) this.callbacks.onLayerBroken(this, 'vehicle');

    this.draw();
    this.scene.tweens.add({
      targets: this.visual,
      alpha: 0.42,
      duration: 45,
      yoyo: true,
    });

    if (resolution.killed) {
      if (this.definition.contained && resolution.vehicleBroken) {
        this.callbacks.onVehicleBroken(this, this.definition.contained, this.progress);
      }
      this.callbacks.onKilled(this, this.definition.reward);
      this.destroy();
    }

    return resolution;
  }

  get totalHealth(): number {
    return this.bodyHp + this.armorHp + this.vehicleHp;
  }

  private updatePosition(now: number): void {
    const point = this.path.getPoint(Phaser.Math.Clamp(this.progress, 0, 1));
    const isVehicle = Boolean(this.definition.vehicleHp);
    const bob = Math.sin(now * 0.004 + this.bobOffset) * (isVehicle ? 5 : 2);
    this.setPosition(point.x, point.y + bob - (isVehicle ? 58 : 0));
  }

  private draw(): void {
    this.visual.clear();
    this.healthBar.clear();

    if (this.definition.vehicleHp) {
      this.drawUfo();
    } else {
      this.drawAlien();
    }

    this.drawHealth();
  }

  private drawAlien(): void {
    const scale = this.definition.scale;
    const bodyColor = this.definition.bodyColor;
    const accent = this.definition.accentColor;

    this.visual.fillStyle(0x020713, 0.32);
    this.visual.fillEllipse(3, 23 * scale, 52 * scale, 18 * scale);

    this.visual.fillStyle(bodyColor, 1);
    this.visual.lineStyle(4, 0x08152a, 0.9);
    this.visual.fillEllipse(0, 2, 44 * scale, 50 * scale);
    this.visual.strokeEllipse(0, 2, 44 * scale, 50 * scale);

    this.visual.fillStyle(accent, 0.95);
    this.visual.fillEllipse(-8 * scale, -4 * scale, 10 * scale, 13 * scale);
    this.visual.fillEllipse(8 * scale, -4 * scale, 10 * scale, 13 * scale);
    this.visual.fillStyle(0x08152a, 1);
    this.visual.fillCircle(-7 * scale, -3 * scale, 2.3 * scale);
    this.visual.fillCircle(9 * scale, -3 * scale, 2.3 * scale);

    this.visual.lineStyle(3, 0x08152a, 0.9);
    this.visual.beginPath();
    this.visual.moveTo(-6 * scale, 11 * scale);
    this.visual.lineTo(0, 14 * scale);
    this.visual.lineTo(7 * scale, 10 * scale);
    this.visual.strokePath();

    const notchCount = this.definition.antennaNotches;
    for (let i = 0; i < notchCount; i += 1) {
      const x = (i - (notchCount - 1) / 2) * 9 * scale;
      this.visual.lineStyle(3, accent, 1);
      this.visual.lineBetween(x, -24 * scale, x * 1.15, -34 * scale);
      this.visual.fillStyle(accent, 1);
      this.visual.fillCircle(x * 1.15, -36 * scale, 3.3 * scale);
    }

    if (this.armorHp > 0) {
      this.visual.fillStyle(0x77849a, 1);
      this.visual.lineStyle(3, 0xd5e0ed, 0.8);
      this.visual.fillRoundedRect(-26 * scale, -8 * scale, 15 * scale, 29 * scale, 5);
      this.visual.strokeRoundedRect(-26 * scale, -8 * scale, 15 * scale, 29 * scale, 5);
      this.visual.fillRoundedRect(11 * scale, -8 * scale, 15 * scale, 29 * scale, 5);
      this.visual.strokeRoundedRect(11 * scale, -8 * scale, 15 * scale, 29 * scale, 5);
      this.visual.fillStyle(0xb8c4d3, 0.95);
      this.visual.fillTriangle(-16 * scale, -22 * scale, 0, -29 * scale, 16 * scale, -22 * scale);
    }
  }

  private drawUfo(): void {
    const alive = this.vehicleHp > 0;
    this.visual.fillStyle(0x030817, 0.4);
    this.visual.fillEllipse(3, 28, 100, 23);
    this.visual.fillStyle(0x5e6f8c, 1);
    this.visual.lineStyle(4, 0x17243d, 1);
    this.visual.fillEllipse(0, 8, 102, 40);
    this.visual.strokeEllipse(0, 8, 102, 40);
    this.visual.fillStyle(alive ? 0x72eaff : 0x7f8aa0, 0.9);
    this.visual.fillEllipse(0, -5, 56, 45);
    this.visual.lineStyle(3, 0xc9f8ff, 0.72);
    this.visual.strokeEllipse(0, -5, 56, 45);
    this.visual.fillStyle(this.definition.bodyColor, 0.95);
    this.visual.fillCircle(0, -4, 13);
    this.visual.fillStyle(0x08152a, 1);
    this.visual.fillCircle(-4, -6, 2.2);
    this.visual.fillCircle(4, -6, 2.2);

    for (let i = -2; i <= 2; i += 1) {
      this.visual.fillStyle(i % 2 === 0 ? 0xffcf67 : 0x4de0ff, 1);
      this.visual.fillCircle(i * 18, 10, 4);
    }

    this.visual.lineStyle(3, 0x5ee9ff, 0.38);
    this.visual.strokeEllipse(0, 8, 118, 52);
  }

  private drawHealth(): void {
    const ratio = Phaser.Math.Clamp(this.totalHealth / this.maxTotalHealth, 0, 1);
    const width = this.definition.vehicleHp ? 88 : 50 * this.definition.scale;
    const y = this.definition.vehicleHp ? -43 : -51 * this.definition.scale;
    this.healthBar.fillStyle(0x020713, 0.82);
    this.healthBar.fillRoundedRect(-width / 2 - 2, y - 2, width + 4, 8, 4);
    this.healthBar.fillStyle(
      this.vehicleHp > 0 ? 0x62dfff : this.armorHp > 0 ? 0xc3cedd : this.definition.bodyColor,
      1,
    );
    this.healthBar.fillRoundedRect(-width / 2, y, width * ratio, 4, 2);
  }

  private drawSlowAura(): void {
    this.statusAura.clear();
    this.statusAura.lineStyle(3, 0x9cecff, 0.65);
    this.statusAura.strokeCircle(0, this.definition.vehicleHp ? 4 : 2, this.definition.vehicleHp ? 60 : 31);
    this.statusAura.lineStyle(1, 0xffffff, 0.35);
    this.statusAura.strokeCircle(0, this.definition.vehicleHp ? 4 : 2, this.definition.vehicleHp ? 67 : 36);
  }
}
