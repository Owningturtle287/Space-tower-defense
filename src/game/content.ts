export type EnemyKey =
  | 'scout_green'
  | 'runner_green'
  | 'scout_cyan'
  | 'brute_violet'
  | 'scout_green_scrap'
  | 'scout_cyan_scrap'
  | 'ufo_green';

export type TowerKey = 'pulse' | 'cryo';
export type DamageTag = 'pulse' | 'cryo';
export type TargetPriority = 'first' | 'strong' | 'armor';

export interface EnemyDefinition {
  key: EnemyKey;
  name: string;
  tier: 1 | 2 | 3;
  bodyColor: number;
  accentColor: number;
  bodyMultiplier: number;
  speed: number;
  reward: number;
  leakDamage: number;
  scale: number;
  antennaNotches: number;
  armorHp?: number;
  armorReduction?: number;
  vehicleHp?: number;
  contained?: EnemyKey;
}

export interface TowerDefinition {
  key: TowerKey;
  name: string;
  shortName: string;
  role: string;
  cost: number;
  baseDamage: number;
  baseRange: number;
  cooldownMs: number;
  damageTag: DamageTag;
  slowFactor?: number;
  slowDurationMs?: number;
  splashRadius?: number;
  color: number;
  accentColor: number;
  upgradeCosts: [number, number];
}

export interface WaveGroup {
  enemy: EnemyKey;
  count: number;
  intervalMs: number;
  delayMs?: number;
}

export interface WaveDefinition {
  title: string;
  hint: string;
  clearBonus: number;
  groups: WaveGroup[];
}

export interface BuildPadDefinition {
  id: string;
  x: number;
  y: number;
}

export const BODY_BASE_HP = 28;

export const ENEMIES: Record<EnemyKey, EnemyDefinition> = {
  scout_green: {
    key: 'scout_green',
    name: 'Green Scout',
    tier: 1,
    bodyColor: 0x62ec75,
    accentColor: 0xd8ff87,
    bodyMultiplier: 1,
    speed: 72,
    reward: 9,
    leakDamage: 1,
    scale: 0.92,
    antennaNotches: 1,
  },
  runner_green: {
    key: 'runner_green',
    name: 'Green Runner',
    tier: 1,
    bodyColor: 0x53e468,
    accentColor: 0xffe174,
    bodyMultiplier: 0.82,
    speed: 112,
    reward: 10,
    leakDamage: 1,
    scale: 0.76,
    antennaNotches: 1,
  },
  scout_cyan: {
    key: 'scout_cyan',
    name: 'Cyan Scout',
    tier: 2,
    bodyColor: 0x49d9ef,
    accentColor: 0xc6fbff,
    bodyMultiplier: 1.8,
    speed: 64,
    reward: 14,
    leakDamage: 2,
    scale: 1,
    antennaNotches: 2,
  },
  brute_violet: {
    key: 'brute_violet',
    name: 'Violet Brute',
    tier: 3,
    bodyColor: 0xa270f5,
    accentColor: 0xf4c5ff,
    bodyMultiplier: 3.2,
    speed: 48,
    reward: 24,
    leakDamage: 3,
    scale: 1.18,
    antennaNotches: 3,
  },
  scout_green_scrap: {
    key: 'scout_green_scrap',
    name: 'Scrap-Plated Scout',
    tier: 1,
    bodyColor: 0x62ec75,
    accentColor: 0xd8ff87,
    bodyMultiplier: 1.15,
    speed: 57,
    reward: 18,
    leakDamage: 2,
    scale: 1.02,
    antennaNotches: 1,
    armorHp: 54,
    armorReduction: 3,
  },
  scout_cyan_scrap: {
    key: 'scout_cyan_scrap',
    name: 'Scrap-Plated Cyan',
    tier: 2,
    bodyColor: 0x49d9ef,
    accentColor: 0xc6fbff,
    bodyMultiplier: 1.95,
    speed: 50,
    reward: 26,
    leakDamage: 3,
    scale: 1.08,
    antennaNotches: 2,
    armorHp: 86,
    armorReduction: 4,
  },
  ufo_green: {
    key: 'ufo_green',
    name: 'Scout Saucer',
    tier: 1,
    bodyColor: 0x62ec75,
    accentColor: 0xffd46c,
    bodyMultiplier: 0,
    speed: 70,
    reward: 24,
    leakDamage: 3,
    scale: 1,
    antennaNotches: 1,
    vehicleHp: 128,
    contained: 'scout_green',
  },
};

export const TOWERS: Record<TowerKey, TowerDefinition> = {
  pulse: {
    key: 'pulse',
    name: 'Pulse Cannon',
    shortName: 'PULSE',
    role: 'Fast single-target energy fire',
    cost: 120,
    baseDamage: 17,
    baseRange: 205,
    cooldownMs: 590,
    damageTag: 'pulse',
    color: 0x36d5ff,
    accentColor: 0xffcf67,
    upgradeCosts: [130, 220],
  },
  cryo: {
    key: 'cryo',
    name: 'Cryo Beacon',
    shortName: 'CRYO',
    role: 'Slows clustered enemies',
    cost: 150,
    baseDamage: 7,
    baseRange: 182,
    cooldownMs: 930,
    damageTag: 'cryo',
    slowFactor: 0.56,
    slowDurationMs: 1750,
    splashRadius: 72,
    color: 0x79e9ff,
    accentColor: 0xc5a6ff,
    upgradeCosts: [145, 235],
  },
};

export const WAVES: WaveDefinition[] = [
  {
    title: 'First Contact',
    hint: 'Green aliens are the baseline durability tier.',
    clearBonus: 45,
    groups: [{ enemy: 'scout_green', count: 9, intervalMs: 780 }],
  },
  {
    title: 'Quick Feet',
    hint: 'Runners are smaller and faster, but still green-tier.',
    clearBonus: 50,
    groups: [
      { enemy: 'scout_green', count: 8, intervalMs: 680 },
      { enemy: 'runner_green', count: 7, intervalMs: 520, delayMs: 700 },
    ],
  },
  {
    title: 'Cyan Signal',
    hint: 'Two antenna notches identify tougher cyan bodies.',
    clearBonus: 55,
    groups: [
      { enemy: 'scout_green', count: 9, intervalMs: 620 },
      { enemy: 'scout_cyan', count: 5, intervalMs: 920, delayMs: 800 },
    ],
  },
  {
    title: 'Cross Current',
    hint: 'Cryo control gives Pulse Cannons more time to work.',
    clearBonus: 60,
    groups: [
      { enemy: 'runner_green', count: 12, intervalMs: 430 },
      { enemy: 'scout_cyan', count: 7, intervalMs: 760, delayMs: 500 },
    ],
  },
  {
    title: 'Chromacore Push',
    hint: 'Mixed speed and durability test your placement.',
    clearBonus: 65,
    groups: [
      { enemy: 'scout_green', count: 8, intervalMs: 420 },
      { enemy: 'runner_green', count: 10, intervalMs: 390, delayMs: 300 },
      { enemy: 'scout_cyan', count: 7, intervalMs: 720, delayMs: 500 },
    ],
  },
  {
    title: 'Scrap Shells',
    hint: 'Gray armor absorbs hits before the alien body.',
    clearBonus: 75,
    groups: [
      { enemy: 'scout_green_scrap', count: 7, intervalMs: 980 },
      { enemy: 'scout_cyan', count: 8, intervalMs: 680, delayMs: 550 },
    ],
  },
  {
    title: 'Violet Mass',
    hint: 'Three crest points mark the heavy violet tier.',
    clearBonus: 80,
    groups: [
      { enemy: 'scout_cyan', count: 10, intervalMs: 620 },
      { enemy: 'brute_violet', count: 6, intervalMs: 1080, delayMs: 500 },
    ],
  },
  {
    title: 'Objects Above',
    hint: 'Break each UFO to expose the passenger inside.',
    clearBonus: 90,
    groups: [
      { enemy: 'runner_green', count: 10, intervalMs: 430 },
      { enemy: 'ufo_green', count: 4, intervalMs: 1450, delayMs: 700 },
      { enemy: 'scout_cyan', count: 8, intervalMs: 650, delayMs: 500 },
    ],
  },
  {
    title: 'Layered Assault',
    hint: 'Armor, speed, and body tiers arrive together.',
    clearBonus: 100,
    groups: [
      { enemy: 'scout_cyan_scrap', count: 7, intervalMs: 1020 },
      { enemy: 'runner_green', count: 12, intervalMs: 360, delayMs: 450 },
      { enemy: 'brute_violet', count: 7, intervalMs: 940, delayMs: 400 },
    ],
  },
  {
    title: 'Verdara Stand',
    hint: 'The final formation combines every Combat Lab threat.',
    clearBonus: 180,
    groups: [
      { enemy: 'ufo_green', count: 5, intervalMs: 1250 },
      { enemy: 'scout_green_scrap', count: 9, intervalMs: 720, delayMs: 400 },
      { enemy: 'scout_cyan_scrap', count: 6, intervalMs: 1050, delayMs: 550 },
      { enemy: 'brute_violet', count: 9, intervalMs: 820, delayMs: 400 },
    ],
  },
];

export const BUILD_PADS: BuildPadDefinition[] = [
  { id: 'north-west', x: 320, y: 238 },
  { id: 'south-west', x: 392, y: 668 },
  { id: 'center-north', x: 650, y: 258 },
  { id: 'center-south', x: 760, y: 710 },
  { id: 'east-north', x: 1006, y: 172 },
  { id: 'east-center', x: 1065, y: 470 },
  { id: 'east-south', x: 1060, y: 710 },
];

export const PATH_POINTS = [
  { x: -40, y: 545 },
  { x: 180, y: 530 },
  { x: 285, y: 430 },
  { x: 480, y: 440 },
  { x: 570, y: 595 },
  { x: 770, y: 594 },
  { x: 855, y: 378 },
  { x: 1038, y: 342 },
  { x: 1148, y: 505 },
  { x: 1280, y: 522 },
];

export function bodyHealthFor(definition: EnemyDefinition): number {
  return Math.round(BODY_BASE_HP * definition.bodyMultiplier);
}

export function validateContent(): string[] {
  const errors: string[] = [];

  for (const [key, enemy] of Object.entries(ENEMIES)) {
    if (enemy.key !== key) errors.push(`Enemy key mismatch: ${key}`);
    if (enemy.speed <= 0) errors.push(`${key} requires positive speed`);
    if (!enemy.vehicleHp && bodyHealthFor(enemy) <= 0) errors.push(`${key} requires body health`);
    if (enemy.contained && !ENEMIES[enemy.contained]) errors.push(`${key} contains an unknown enemy`);
  }

  for (const [key, tower] of Object.entries(TOWERS)) {
    if (tower.key !== key) errors.push(`Tower key mismatch: ${key}`);
    if (tower.cost <= 0 || tower.baseDamage <= 0 || tower.baseRange <= 0) {
      errors.push(`${key} has invalid combat stats`);
    }
  }

  WAVES.forEach((wave, waveIndex) => {
    if (wave.groups.length === 0) errors.push(`Wave ${waveIndex + 1} has no groups`);
    wave.groups.forEach((group) => {
      if (!ENEMIES[group.enemy]) errors.push(`Wave ${waveIndex + 1} references ${group.enemy}`);
      if (group.count <= 0 || group.intervalMs <= 0) errors.push(`Wave ${waveIndex + 1} has an invalid group`);
    });
  });

  return errors;
}
