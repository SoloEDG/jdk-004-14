import type {
  GameDoc,
  Upgrade,
  Weapon,
  WeaponBranchId,
  WeaponId,
} from "../../../shared/types";
import {
  BRANCH_CATALOG,
  BRANCH_LEVEL,
  MAX_WEAPON_LEVEL,
  WEAPON_BRANCHES,
  WEAPON_CATALOG,
} from "./catalog";

/**
 * Weapon upgrade ids are derived, never stored in the random upgrade pool:
 * - `weapon:level:<id>` raises a normal level (or unlocks the weapon)
 * - `branch:<branchId>` commits a weapon to a permanent ballistic branch
 */
export const levelUpgradeId = (id: WeaponId) => `weapon:level:${id}`;
export const branchUpgradeId = (id: WeaponBranchId) => `branch:${id}`;

export function branchIdOf(upgradeId: string): WeaponBranchId | null {
  if (!upgradeId.startsWith("branch:")) return null;
  const id = upgradeId.slice("branch:".length) as WeaponBranchId;
  return id in BRANCH_CATALOG ? id : null;
}

export function levelWeaponIdOf(upgradeId: string): WeaponId | null {
  const match = /^weapon:level:(pulse|orbit|nova)$/.exec(upgradeId);
  return match ? (match[1] as WeaponId) : null;
}

export function findWeapon(doc: GameDoc, id: WeaponId): Weapon | undefined {
  return doc.weapons.find((w) => w.id === id);
}

/** True while the weapon is at its branch node and no branch is chosen yet. */
export function isAtBranchNode(weapon: Weapon | undefined): boolean {
  return !!weapon && weapon.level >= BRANCH_LEVEL - 1 && !weapon.branch;
}

/** Weapon can still receive a normal level. Branch nodes spend the level. */
export function canLevelWeapon(weapon: Weapon | undefined): boolean {
  if (!weapon) return true; // not unlocked yet
  if (weapon.level >= MAX_WEAPON_LEVEL) return false;
  return !isAtBranchNode(weapon);
}

/**
 * Legal branch choices across the whole loadout. A weapon that is at its node
 * always offers its two branches; these are never mixed with the random pool.
 */
export function branchChoices(doc: GameDoc): WeaponBranchId[] {
  const ids: WeaponBranchId[] = [];
  for (const weapon of doc.weapons)
    if (isAtBranchNode(weapon))
      ids.push(...WEAPON_BRANCHES[weapon.id]);
  return ids;
}

/** A branch can only be taken from its own weapon's node, exactly once. */
export function canTakeBranch(doc: GameDoc, id: WeaponBranchId): boolean {
  const branch = BRANCH_CATALOG[id];
  return isAtBranchNode(findWeapon(doc, branch.weapon));
}

export function describeWeaponUpgrade(
  doc: GameDoc,
  upgradeId: string,
): Upgrade | null {
  const weaponId = levelWeaponIdOf(upgradeId);
  if (weaponId) {
    const weapon = findWeapon(doc, weaponId);
    const name = WEAPON_CATALOG[weaponId].name;
    const next = (weapon?.level ?? 0) + 1;
    return {
      id: upgradeId,
      name: weapon ? `${name} 强化` : `装配 ${name}`,
      description: weapon
        ? `等级 ${weapon.level} → ${next}：伤害与射速提升`
        : "解锁新武器并提升至 Lv.1",
      category: "武器",
      max: MAX_WEAPON_LEVEL,
    };
  }
  const branchId = branchIdOf(upgradeId);
  if (!branchId) return null;
  const branch = BRANCH_CATALOG[branchId];
  if (!canTakeBranch(doc, branchId)) return null;
  return {
    id: upgradeId,
    name: branch.name,
    description: branch.description,
    category: "分支",
    max: 1,
    branchNode: branch.weapon,
  };
}

export function applyWeaponUpgrade(doc: GameDoc, upgradeId: string): boolean {
  const weaponId = levelWeaponIdOf(upgradeId);
  if (weaponId) {
    const weapon = findWeapon(doc, weaponId);
    if (weapon) {
      if (!canLevelWeapon(weapon)) return false;
      weapon.level++;
      return true;
    }
    doc.weapons.push({ id: weaponId, level: 1, cooldown: 0, branch: null });
    return true;
  }
  const branchId = branchIdOf(upgradeId);
  if (!branchId) return false;
  const branch = BRANCH_CATALOG[branchId];
  const weapon = findWeapon(doc, branch.weapon);
  if (!isAtBranchNode(weapon)) return false;
  // Committing the branch spends the branch-node level: the weapon advances
  // to BRANCH_LEVEL, so the choice always comes with a real parameter change.
  // Legacy weapons already above the cap keep their level; the branch itself
  // still remaps their ballistics, so no level is silently subtracted.
  weapon!.branch = branchId;
  weapon!.level = Math.min(
    MAX_WEAPON_LEVEL,
    Math.max(weapon!.level + 1, BRANCH_LEVEL),
  );
  return true;
}

export { BRANCH_LEVEL, MAX_WEAPON_LEVEL };
