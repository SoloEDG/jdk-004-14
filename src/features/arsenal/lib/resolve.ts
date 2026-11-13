import type {
  BulletBehavior,
  BulletSplit,
  GameDoc,
  Weapon,
  WeaponBranchId,
  WeaponId,
} from "../../../shared/types";
import { BRANCH_CATALOG, WEAPON_CATALOG } from "../model/catalog";

export { BRANCH_LEVEL, MAX_WEAPON_LEVEL } from "../model/catalog";

export interface ResolvedWeapon {
  id: WeaponId;
  level: number;
  branch: WeaponBranchId | null;
  branchName: string | null;
  /** Seconds between volleys, including haste and weapon level. */
  interval: number;
  /** Volleys per second, derived from interval. */
  rate: number;
  /** Damage of a single projectile. */
  damage: number;
  /** Raw damage of one volley before enemy mitigation. */
  volleyDamage: number;
  speed: number;
  projectileCount: number;
  /** Projectiles released per volley including extra branch layers. */
  projectilesPerVolley: number;
  pierce: number;
  radius: number;
  life: number;
  spread: number;
  salvo: number;
  behavior?: BulletBehavior;
  split?: BulletSplit;
}

const BASE_DAMAGE: Record<WeaponId, number> = {
  pulse: 16,
  orbit: 13,
  nova: 12,
};
const BASE_SPEED: Record<WeaponId, number> = {
  pulse: 440,
  orbit: 150,
  nova: 240,
};
const BASE_LIFE: Record<WeaponId, number> = {
  pulse: 2.1,
  orbit: 1.25,
  nova: 2.1,
};
const BASE_PIERCE: Record<WeaponId, number> = {
  pulse: 0,
  orbit: 3,
  nova: 1,
};

/**
 * Single source of truth for both firing and the loadout panel, so the numbers
 * shown to the player are the numbers that are actually used.
 */
export function resolveWeapon(
  weapon: Weapon,
  upgrades: GameDoc["upgrades"],
): ResolvedWeapon {
  const power = 1 + (upgrades.power || 0) * 0.2,
    haste = 1 + (upgrades.haste || 0) * 0.13,
    bonusPierce = upgrades.pierce || 0;
  const level = weapon.level;
  const levelScale = 1 + (level - 1) * 0.3;
  const branch = weapon.branch ? BRANCH_CATALOG[weapon.branch] : null;
  const branchId = weapon.branch ?? null;

  const damage =
    BASE_DAMAGE[weapon.id] *
    power *
    levelScale *
    (branch?.damageMultiplier ?? 1);
  const life =
    BASE_LIFE[weapon.id] * (branchId === "orbit-return" ? 1.35 : 1);
  let pierce =
    BASE_PIERCE[weapon.id] + bonusPierce + (branch?.pierceBonus ?? 0);
  // Chain rounds detonate on first contact, so pierce would never apply.
  if (branchId === "nova-chain") pierce = 0;

  let projectileCount = 0,
    spread = 0,
    salvo = 1,
    speed = BASE_SPEED[weapon.id],
    radius = weapon.id === "nova" ? 6 : 4,
    behavior: BulletBehavior | undefined;
  if (weapon.id === "pulse") {
    if (branchId === "pulse-scatter") {
      projectileCount = 5;
      spread = 0.24;
    } else {
      projectileCount = level >= 4 ? 3 : level >= 2 ? 2 : 1;
      spread = branchId === "pulse-rail" ? 0.024 : 0.12;
    }
    if (branchId === "pulse-rail") {
      projectileCount = 1;
      speed *= 1.7;
    }
  } else if (weapon.id === "orbit") {
    projectileCount = Math.min(
      23,
      4 + level + (branch?.targetBonus ?? 0),
    );
    if (branchId === "orbit-shard") salvo = 2;
    if (branchId === "orbit-return") behavior = "boomerang";
  } else {
    if (branchId === "nova-overload") {
      projectileCount = Math.max(4, 10 + level * 2 - 4);
      speed *= 1.3;
      radius += 2;
    } else if (branchId === "nova-chain") {
      projectileCount = Math.max(8, Math.min(20, 10 + level * 2 - 2));
    } else {
      projectileCount = 10 + level * 2;
    }
    if (branchId === "nova-chain") behavior = "chain";
  }

  const interval =
    Math.max(
      0.08,
      WEAPON_CATALOG[weapon.id].interval / haste / (1 + (level - 1) * 0.12),
    ) * (branchId === "pulse-scatter" ? 1.1 : 1);
  const projectilesPerVolley = projectileCount * salvo;
  const split: BulletSplit | undefined =
    branchId === "nova-chain"
      ? {
          count: 3,
          spread: Math.PI * 2,
          damage: damage * 0.65,
          speed: speed * 1.15,
          pierce: 0,
          radius: Math.max(3, radius - 1),
          life: Math.max(0.5, life * 0.7),
        }
      : undefined;

  return {
    id: weapon.id,
    level,
    branch: branchId,
    branchName: branch?.name ?? null,
    interval,
    rate: 1 / interval,
    damage,
    volleyDamage: damage * projectilesPerVolley,
    speed,
    projectileCount,
    projectilesPerVolley,
    pierce,
    radius,
    life,
    spread,
    salvo,
    behavior,
    split,
  };
}
