import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BODY_BASE_HP,
  BUILD_PADS,
  ENEMIES,
  TOWERS,
  WAVES,
  bodyHealthFor,
  validateContent,
} from '../src/game/content.ts';
import { chooseTarget, resolveDamage, seededUnit } from '../src/game/core/combat.ts';

let checks = 0;

function check(name: string, assertion: () => void): void {
  assertion();
  checks += 1;
  process.stdout.write(`✓ ${name}\n`);
}

check('content contracts validate', () => {
  assert.deepEqual(validateContent(), []);
});

check('the Combat Lab contains ten waves', () => {
  assert.equal(WAVES.length, 10);
});

check('every wave references known enemies with positive timings', () => {
  for (const wave of WAVES) {
    assert.ok(wave.groups.length > 0);
    for (const group of wave.groups) {
      assert.ok(ENEMIES[group.enemy]);
      assert.ok(group.count > 0);
      assert.ok(group.intervalMs > 0);
    }
  }
});

check('waves exercise all three durability tiers', () => {
  const referenced = new Set(WAVES.flatMap((wave) => wave.groups.map((group) => group.enemy)));
  assert.deepEqual(new Set([...referenced].map((key) => ENEMIES[key].tier)), new Set([1, 2, 3]));
});

check('waves include armor and containment', () => {
  const referenced = new Set(WAVES.flatMap((wave) => wave.groups.map((group) => group.enemy)));
  assert.ok([...referenced].some((key) => (ENEMIES[key].armorHp ?? 0) > 0));
  assert.ok([...referenced].some((key) => Boolean(ENEMIES[key].contained)));
});

check('only the two launch towers are enabled', () => {
  assert.deepEqual(Object.keys(TOWERS).sort(), ['cryo', 'pulse']);
});

check('build pad identifiers are unique', () => {
  assert.equal(new Set(BUILD_PADS.map((pad) => pad.id)).size, BUILD_PADS.length);
});

check('body colors use authored durability multipliers', () => {
  assert.equal(bodyHealthFor(ENEMIES.scout_green), BODY_BASE_HP);
  assert.equal(bodyHealthFor(ENEMIES.scout_cyan), Math.round(BODY_BASE_HP * 1.8));
  assert.equal(bodyHealthFor(ENEMIES.brute_violet), Math.round(BODY_BASE_HP * 3.2));
});

check('armor resolves before body health with valid overflow', () => {
  const hit = resolveDamage({ bodyHp: 30, armorHp: 10, vehicleHp: 0 }, 20, 'pulse', 3);
  assert.deepEqual(hit.next, { bodyHp: 23, armorHp: 0, vehicleHp: 0 });
  assert.equal(hit.armorBroken, true);
});

check('cryo is less efficient against scrap armor', () => {
  const pulse = resolveDamage({ bodyHp: 30, armorHp: 50, vehicleHp: 0 }, 20, 'pulse', 3);
  const cryo = resolveDamage({ bodyHp: 30, armorHp: 50, vehicleHp: 0 }, 20, 'cryo', 3);
  assert.ok(pulse.armorDamage > cryo.armorDamage);
});

check('a UFO hit stays inside its vehicle layer', () => {
  const hit = resolveDamage({ bodyHp: 0, armorHp: 0, vehicleHp: 100 }, 25, 'pulse');
  assert.equal(hit.vehicleDamage, 25);
  assert.equal(hit.bodyDamage, 0);
  assert.equal(hit.next.vehicleHp, 75);
});

check('target priorities choose the intended candidate', () => {
  const targets = [
    { active: true, progress: 0.8, bodyHp: 10, armorHp: 0, vehicleHp: 0, id: 'front' },
    { active: true, progress: 0.4, bodyHp: 80, armorHp: 0, vehicleHp: 0, id: 'strong' },
    { active: true, progress: 0.3, bodyHp: 20, armorHp: 50, vehicleHp: 0, id: 'armor' },
  ];
  assert.equal(chooseTarget(targets, 'first')?.id, 'front');
  assert.equal(chooseTarget(targets, 'strong')?.id, 'strong');
  assert.equal(chooseTarget(targets, 'armor')?.id, 'armor');
});

check('seeded decoration values are stable', () => {
  assert.equal(seededUnit(42), seededUnit(42));
  assert.ok(seededUnit(42) >= 0 && seededUnit(42) < 1);
});

check('the PWA manifest is installable in landscape', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
    display?: string;
    orientation?: string;
    icons?: Array<{ sizes?: string }>;
  };
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'landscape');
  assert.ok(manifest.icons?.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons?.some((icon) => icon.sizes === '512x512'));
});

process.stdout.write(`\n${checks} deterministic checks passed.\n`);
