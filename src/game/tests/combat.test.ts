import { describe, expect, it } from 'vitest';
import { BODY_BASE_HP, ENEMIES, bodyHealthFor } from '../content';
import { chooseTarget, resolveDamage, seededUnit } from '../core/combat';

describe('alien durability tiers', () => {
  it('applies the authored green, cyan, and violet body multipliers', () => {
    expect(bodyHealthFor(ENEMIES.scout_green)).toBe(BODY_BASE_HP);
    expect(bodyHealthFor(ENEMIES.scout_cyan)).toBe(Math.round(BODY_BASE_HP * 1.8));
    expect(bodyHealthFor(ENEMIES.brute_violet)).toBe(Math.round(BODY_BASE_HP * 3.2));
  });
});

describe('damage pipeline', () => {
  it('breaks armor before body health and passes valid overflow', () => {
    const hit = resolveDamage({ bodyHp: 30, armorHp: 10, vehicleHp: 0 }, 20, 'pulse', 3);
    expect(hit.armorDamage).toBe(10);
    expect(hit.bodyDamage).toBe(7);
    expect(hit.next).toEqual({ bodyHp: 23, armorHp: 0, vehicleHp: 0 });
    expect(hit.armorBroken).toBe(true);
    expect(hit.killed).toBe(false);
  });

  it('keeps a UFO hit inside its vehicle layer', () => {
    const hit = resolveDamage({ bodyHp: 0, armorHp: 0, vehicleHp: 100 }, 25, 'pulse');
    expect(hit.vehicleDamage).toBe(25);
    expect(hit.bodyDamage).toBe(0);
    expect(hit.next.vehicleHp).toBe(75);
  });

  it('makes cryo less efficient against scrap armor', () => {
    const pulse = resolveDamage({ bodyHp: 30, armorHp: 50, vehicleHp: 0 }, 20, 'pulse', 3);
    const cryo = resolveDamage({ bodyHp: 30, armorHp: 50, vehicleHp: 0 }, 20, 'cryo', 3);
    expect(pulse.armorDamage).toBeGreaterThan(cryo.armorDamage);
  });
});

describe('target priorities', () => {
  const targets = [
    { active: true, progress: 0.8, bodyHp: 10, armorHp: 0, vehicleHp: 0, id: 'front' },
    { active: true, progress: 0.4, bodyHp: 80, armorHp: 0, vehicleHp: 0, id: 'strong' },
    { active: true, progress: 0.3, bodyHp: 20, armorHp: 50, vehicleHp: 0, id: 'armor' },
  ];

  it('chooses greatest progress for First', () => {
    expect(chooseTarget(targets, 'first')?.id).toBe('front');
  });

  it('chooses greatest total health for Strong', () => {
    expect(chooseTarget(targets, 'strong')?.id).toBe('strong');
  });

  it('chooses the largest armor or vehicle layer for Layered', () => {
    expect(chooseTarget(targets, 'armor')?.id).toBe('armor');
  });
});

describe('seeded utility', () => {
  it('returns stable values in the unit interval', () => {
    expect(seededUnit(42)).toBe(seededUnit(42));
    expect(seededUnit(42)).toBeGreaterThanOrEqual(0);
    expect(seededUnit(42)).toBeLessThan(1);
  });
});
