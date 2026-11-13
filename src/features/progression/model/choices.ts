import type { GameDoc, Upgrade, WeaponId } from "../../../shared/types";
import { random } from "../../../shared/math";
import { UPGRADE_CATALOG } from "./catalog";
import {
  applyWeaponUpgrade,
  branchChoices,
  branchIdOf,
  branchUpgradeId,
  canLevelWeapon,
  describeWeaponUpgrade,
  findWeapon,
  levelUpgradeId,
  levelWeaponIdOf,
} from "../../arsenal/model/weaponUpgrades";
import { BRANCH_CATALOG, WEAPON_CATALOG } from "../../arsenal/model/catalog";

export const WEAPONS: WeaponId[] = ["pulse", "orbit", "nova"];

/**
 * Every choice that may legally follow the current loadout.
 * A weapon sitting on its branch node exposes only its two branches, so the
 * node can never be dodged by levelling past it.
 */
export function legalChoiceIds(doc: GameDoc): string[] {
  const branchIds = branchChoices(doc).map(branchUpgradeId);
  if (branchIds.length) return branchIds;
  const ids: string[] = [];
  for (const weaponId of WEAPONS) {
    const weapon = findWeapon(doc, weaponId);
    if (canLevelWeapon(weapon)) ids.push(levelUpgradeId(weaponId));
  }
  for (const passive of UPGRADE_CATALOG) {
    if (passive.id === "recovery") continue;
    if ((doc.upgrades[passive.id] || 0) < passive.max) ids.push(passive.id);
  }
  // A fully maxed loadout would otherwise offer nothing; recovery is always a
  // legal, beneficial replacement so a pending level is never wasted.
  return ids.length ? ids : ["recovery"];
}

/** Human-readable definition for a candidate, whether static or derived. */
export function describeChoice(doc: GameDoc, id: string): Upgrade | null {
  const branchId = branchIdOf(id);
  if (branchId) {
    const branch = BRANCH_CATALOG[branchId];
    if (!branchChoices(doc).includes(branchId)) return null;
    return {
      id,
      name: branch.name,
      description: branch.description,
      category: `分支 · ${WEAPON_CATALOG[branch.weapon].name}`,
      max: 1,
      branchNode: branch.weapon,
    };
  }
  const weaponId = levelWeaponIdOf(id);
  if (weaponId) return describeWeaponUpgrade(doc, id);
  return UPGRADE_CATALOG.find((u) => u.id === id) ?? null;
}

export function isChoiceLegal(doc: GameDoc, id: string): boolean {
  if (!describeChoice(doc, id)) return false;
  const weaponId = levelWeaponIdOf(id);
  if (weaponId) return canLevelWeapon(findWeapon(doc, weaponId));
  if (branchIdOf(id)) return branchChoices(doc).includes(branchIdOf(id)!);
  if (id === "recovery") return true;
  const passive = UPGRADE_CATALOG.find((u) => u.id === id);
  return !!passive && (doc.upgrades[id] || 0) < passive.max;
}

export function rollChoices(doc: GameDoc): void {
  const legal = legalChoiceIds(doc);
  // Branch nodes are a forced decision, not a random draw.
  if (legal.every((id) => branchIdOf(id))) {
    doc.choices = legal;
    doc.phase = "upgrade";
    return;
  }
  const available = legal.slice();
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random(doc) * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  doc.choices = available.slice(0, 3);
  doc.phase = "upgrade";
}

export function chooseUpgrade(doc: GameDoc, id: string): void {
  if (doc.phase !== "upgrade" || doc.pendingLevels <= 0) return;
  if (!doc.choices.includes(id) || !isChoiceLegal(doc, id)) return;
  if (id === "recovery") {
    doc.player.hp = Math.min(doc.player.maxHp, doc.player.hp + 30);
  } else if (levelWeaponIdOf(id) || branchIdOf(id)) {
    if (!applyWeaponUpgrade(doc, id)) return;
  } else {
    const definition = UPGRADE_CATALOG.find((u) => u.id === id);
    if (!definition || (doc.upgrades[id] || 0) >= definition.max) return;
    doc.upgrades[id] = (doc.upgrades[id] || 0) + 1;
    if (id === "speed") doc.player.speed += 190 * 0.12;
    if (id === "vitality") {
      doc.player.maxHp += 20;
      doc.player.hp = Math.min(doc.player.maxHp, doc.player.hp + 20);
    }
  }
  doc.pendingLevels--;
  doc.choices = [];
  if (doc.pendingLevels > 0) rollChoices(doc);
  else {
    doc.phase = "playing";
    doc.notice = "升级完成 · 继续战斗";
  }
}
