import type { DamageTag, TargetPriority } from '../content';

export interface CombatLayers {
  bodyHp: number;
  armorHp: number;
  vehicleHp: number;
}

export interface DamageResolution {
  next: CombatLayers;
  bodyDamage: number;
  armorDamage: number;
  vehicleDamage: number;
  armorBroken: boolean;
  vehicleBroken: boolean;
  killed: boolean;
}

export interface TargetCandidate {
  active: boolean;
  progress: number;
  bodyHp: number;
  armorHp: number;
  vehicleHp: number;
}

const armorTagMultiplier: Record<DamageTag, number> = {
  pulse: 1,
  cryo: 0.72,
};

const vehicleTagMultiplier: Record<DamageTag, number> = {
  pulse: 1,
  cryo: 0.82,
};

export function resolveDamage(
  current: CombatLayers,
  rawDamage: number,
  tag: DamageTag,
  armorReduction = 0,
): DamageResolution {
  const next = { ...current };
  let remaining = Math.max(0, rawDamage);
  let bodyDamage = 0;
  let armorDamage = 0;
  let vehicleDamage = 0;
  let armorBroken = false;
  let vehicleBroken = false;

  if (next.vehicleHp > 0 && remaining > 0) {
    const adjusted = remaining * vehicleTagMultiplier[tag];
    vehicleDamage = Math.min(next.vehicleHp, adjusted);
    next.vehicleHp = Math.max(0, next.vehicleHp - adjusted);
    vehicleBroken = current.vehicleHp > 0 && next.vehicleHp <= 0;
    remaining = 0;
  } else if (next.armorHp > 0 && remaining > 0) {
    const adjusted = Math.max(1, remaining * armorTagMultiplier[tag] - armorReduction);
    armorDamage = Math.min(next.armorHp, adjusted);
    const overflow = Math.max(0, adjusted - next.armorHp);
    next.armorHp = Math.max(0, next.armorHp - adjusted);
    armorBroken = current.armorHp > 0 && next.armorHp <= 0;
    remaining = overflow;
  }

  if (next.vehicleHp <= 0 && next.armorHp <= 0 && remaining > 0) {
    bodyDamage = Math.min(next.bodyHp, remaining);
    next.bodyHp = Math.max(0, next.bodyHp - remaining);
  }

  return {
    next,
    bodyDamage,
    armorDamage,
    vehicleDamage,
    armorBroken,
    vehicleBroken,
    killed: next.vehicleHp <= 0 && next.armorHp <= 0 && next.bodyHp <= 0,
  };
}

export function chooseTarget<T extends TargetCandidate>(candidates: T[], priority: TargetPriority): T | undefined {
  const active = candidates.filter((candidate) => candidate.active);
  if (active.length === 0) return undefined;

  return [...active].sort((a, b) => {
    if (priority === 'armor') {
      const layerDifference = b.armorHp + b.vehicleHp - (a.armorHp + a.vehicleHp);
      if (layerDifference !== 0) return layerDifference;
    }

    if (priority === 'strong') {
      const healthDifference =
        b.bodyHp + b.armorHp + b.vehicleHp - (a.bodyHp + a.armorHp + a.vehicleHp);
      if (healthDifference !== 0) return healthDifference;
    }

    return b.progress - a.progress;
  })[0];
}

export function seededUnit(seed: number): number {
  let value = seed | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 4_294_967_296;
}
