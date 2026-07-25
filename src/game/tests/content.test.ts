import { describe, expect, it } from 'vitest';
import { BUILD_PADS, ENEMIES, TOWERS, WAVES, validateContent } from '../content';

describe('Combat Lab content', () => {
  it('passes runtime validation', () => {
    expect(validateContent()).toEqual([]);
  });

  it('contains exactly ten authored waves', () => {
    expect(WAVES).toHaveLength(10);
  });

  it('introduces armor, UFO containment, and all three body tiers', () => {
    const referenced = new Set(WAVES.flatMap((wave) => wave.groups.map((group) => group.enemy)));
    expect([...referenced].some((key) => (ENEMIES[key].armorHp ?? 0) > 0)).toBe(true);
    expect([...referenced].some((key) => Boolean(ENEMIES[key].contained))).toBe(true);
    expect(new Set([...referenced].map((key) => ENEMIES[key].tier))).toEqual(new Set([1, 2, 3]));
  });

  it('ships only the two launch towers and authored pads', () => {
    expect(Object.keys(TOWERS).sort()).toEqual(['cryo', 'pulse']);
    expect(BUILD_PADS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(BUILD_PADS.map((pad) => pad.id)).size).toBe(BUILD_PADS.length);
  });
});
