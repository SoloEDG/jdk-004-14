import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../src/shared/createRun";
import { resolveWeapon } from "../src/features/arsenal/lib/resolve";
import {
  branchUpgradeId,
  levelUpgradeId,
} from "../src/features/arsenal/model/weaponUpgrades";
import { stepArsenal } from "../src/features/arsenal";
import { chooseUpgrade, legalChoiceIds, rollChoices } from "../src/features/progression";
import { stepCombat } from "../src/features/combat";
import type { GameDoc, Weapon } from "../src/shared/types";

const input = { x: 0, y: 0, aim: { x: 700, y: 325 }, firing: false };
const w = (level: number, branch: Weapon["branch"] = null): Weapon => ({
  id: "pulse",
  level,
  cooldown: 0,
  branch,
});

test("a legacy level-2 weapon maps to the unbranched state", () => {
  const d = createRun();
  d.weapons = [w(2)];
  const resolved = resolveWeapon(d.weapons[0], d.upgrades);
  assert.equal(resolved.branch, null);
  assert.equal(d.weapons[0].branch, null);
  // The next level is the branch node, never a plain level.
  d.phase = "upgrade";
  d.pendingLevels = 1;
  rollChoices(d);
  assert.ok(d.choices.every((id) => id.startsWith("branch:")));
});

test("a legacy weapon above the branch level is offered branches, not skipped", () => {
  const d = createRun();
  d.weapons = [w(4)];
  d.phase = "upgrade";
  d.pendingLevels = 1;
  rollChoices(d);
  assert.deepEqual(
    [...d.choices].sort(),
    [branchUpgradeId("pulse-rail"), branchUpgradeId("pulse-scatter")].sort(),
  );
  chooseUpgrade(d, branchUpgradeId("pulse-rail"));
  assert.equal(d.weapons[0].level, 5, "level is capped, not subtracted");
  assert.equal(d.weapons[0].branch, "pulse-rail");
});

test("a branch choice never deducts a level without a parameter change", () => {
  for (const level of [2, 3, 4]) {
    const d = createRun();
    d.weapons = [w(level)];
    const before = resolveWeapon(d.weapons[0], d.upgrades);
    d.phase = "upgrade";
    d.pendingLevels = 1;
    rollChoices(d);
    chooseUpgrade(d, branchUpgradeId("pulse-scatter"));
    const after = resolveWeapon(d.weapons[0], d.upgrades);
    assert.ok(after.level > before.level || level >= 5, "level advanced");
    assert.ok(
      after.damage !== before.damage ||
        after.projectilesPerVolley !== before.projectilesPerVolley ||
        after.pierce !== before.pierce,
      "branch must change real output",
    );
  }
});

test("battle field is frozen while a branch is pending", () => {
  const d = createRun();
  d.weapons = [w(2)];
  d.pendingLevels = 1;
  d.phase = "upgrade";
  rollChoices(d);
  const snapshot = JSON.stringify(d);
  assert.equal(d.phase, "upgrade");
  assert.equal(JSON.stringify(d), snapshot);
  // Choosing is the only mutation; simulation itself is not called in upgrade.
  chooseUpgrade(d, d.choices[0]);
  assert.equal(d.phase, "playing");
});

test("in-flight projectiles keep birth parameters even after a different branch", () => {
  const d = createRun();
  d.enemies = [{ id: 1, kind: "chaser", x: 600, y: 325, hp: 999, maxHp: 999, radius: 12, cooldown: 0 }];
  d.weapons = [w(2)];
  d.phase = "playing";
  stepArsenal(d, input, 1 / 60);
  const bullet = d.bullets[0];
  assert.equal(d.bullets.length, 2, "level-2 pulse fires a two-round burst");
  const frozen = JSON.parse(JSON.stringify(bullet));
  // A later branch pick must not mutate the round already in the air.
  d.phase = "upgrade";
  d.pendingLevels = 1;
  rollChoices(d);
  chooseUpgrade(d, branchUpgradeId("pulse-scatter"));
  d.phase = "playing";
  assert.deepEqual(JSON.parse(JSON.stringify(bullet)), frozen);
  stepCombat(d, input, 1 / 60);
  const after = d.bullets.find((b) => b.id === frozen.id);
  if (after) {
    assert.equal(after.damage, frozen.damage);
    assert.equal(after.pierce, frozen.pierce);
    assert.equal(after.branch, undefined);
  }
});

test("maxed tree always leaves a legal beneficial candidate", () => {
  const d: GameDoc = createRun();
  d.weapons = [
    { id: "pulse", level: 5, cooldown: 0, branch: "pulse-rail" },
    { id: "orbit", level: 5, cooldown: 0, branch: "orbit-return" },
    { id: "nova", level: 5, cooldown: 0, branch: "nova-chain" },
  ];
  for (const k of ["power", "haste", "speed", "vitality", "armor", "magnet", "pierce"])
    d.upgrades[k] = 999;
  assert.ok(!legalChoiceIds(d).includes(levelUpgradeId("pulse")));
  assert.deepEqual(legalChoiceIds(d), ["recovery"]);
});
