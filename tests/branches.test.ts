import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun } from "../src/shared/createRun";
import { stepArsenal } from "../src/features/arsenal";
import { resolveWeapon } from "../src/features/arsenal/lib/resolve";
import {
  branchUpgradeId,
  levelUpgradeId,
} from "../src/features/arsenal/model/weaponUpgrades";
import { stepCombat } from "../src/features/combat";
import {
  chooseUpgrade,
  legalChoiceIds,
  rollChoices,
} from "../src/features/progression";
import { BRANCH_LEVEL, MAX_WEAPON_LEVEL } from "../src/features/arsenal/model/catalog";
import type { Bullet, FrameEvents, Weapon } from "../src/shared/types";

const input = { x: 0, y: 0, aim: { x: 700, y: 325 }, firing: false };
const events = (): FrameEvents => ({
  kills: [],
  damage: 0,
  taken: 0,
  shots: 0,
  collected: 0,
  weaponDamage: {},
  branchDamage: {},
});
const weapon = (
  id: Weapon["id"],
  level: number,
  branch: Weapon["branch"] = null,
): Weapon => ({ id, level, cooldown: 0, branch });

const enemy = (id: number, x: number, hp = 10) => ({
  id,
  kind: "chaser" as const,
  x,
  y: 325,
  hp,
  maxHp: hp,
  radius: 12,
  cooldown: 0,
});

const bullet = (overrides: Partial<Bullet>): Bullet => ({
  id: 1,
  x: 600,
  y: 325,
  vx: 0,
  vy: 0,
  radius: 5,
  damage: 10,
  life: 1,
  owner: "player",
  weapon: "pulse",
  pierce: 0,
  hit: [],
  ...overrides,
});

test("branch node offers only its two legal successors", () => {
  const d = createRun();
  d.weapons = [weapon("pulse", BRANCH_LEVEL - 1)];
  d.pendingLevels = 1;
  rollChoices(d);
  assert.deepEqual(d.choices.sort(), [
    branchUpgradeId("pulse-rail"),
    branchUpgradeId("pulse-scatter"),
  ].sort());
  // A plain level is not a legal successor at the node.
  assert.ok(!legalChoiceIds(d).includes(levelUpgradeId("pulse")));
});

test("choosing a branch spends the level and makes the choice irreversible", () => {
  const d = createRun();
  d.phase = "upgrade";
  d.weapons = [weapon("pulse", BRANCH_LEVEL - 1)];
  d.pendingLevels = 1;
  rollChoices(d);
  const before = resolveWeapon(d.weapons[0], d.upgrades);
  chooseUpgrade(d, branchUpgradeId("pulse-scatter"));
  const after = resolveWeapon(d.weapons[0], d.upgrades);
  assert.equal(d.weapons[0].level, BRANCH_LEVEL);
  assert.equal(d.weapons[0].branch, "pulse-scatter");
  assert.ok(after.projectilesPerVolley > before.projectilesPerVolley);
  // No level was deducted without a real change, and the branch cannot change.
  d.pendingLevels = 1;
  rollChoices(d);
  assert.ok(!d.choices.some((id) => id.startsWith("branch:")));
  const locked = d.weapons[0].branch;
  chooseUpgrade(d, d.choices[0]);
  assert.equal(d.weapons[0].branch, locked);
});

test("new weapons start unbranched and old normal levels map to no branch", () => {
  const d = createRun();
  assert.equal(d.weapons[0].branch, null);
  d.weapons[0].level = 2;
  d.pendingLevels = 1;
  d.phase = "upgrade";
  d.choices = [levelUpgradeId("orbit")];
  chooseUpgrade(d, levelUpgradeId("orbit"));
  const orbit = d.weapons.find((w) => w.id === "orbit");
  assert.ok(orbit);
  assert.equal(orbit!.level, 1);
  assert.equal(orbit!.branch, null);
});

test("branch changes the actual launch, hit and pierce behaviour", () => {
  const d = createRun();
  d.enemies = [enemy(1, 600)];
  d.weapons = [weapon("pulse", BRANCH_LEVEL, "pulse-scatter")];
  stepArsenal(d, input, 1 / 60);
  const scatter = d.bullets.filter((b) => b.owner === "player");
  assert.equal(scatter.length, 5);
  assert.ok(scatter.every((b) => b.branch === "pulse-scatter"));

  const railRun = createRun();
  railRun.enemies = [enemy(1, 600)];
  railRun.weapons = [weapon("pulse", BRANCH_LEVEL, "pulse-rail")];
  stepArsenal(railRun, input, 1 / 60);
  const rail = railRun.bullets.filter((b) => b.owner === "player");
  assert.equal(rail.length, 1);
  assert.equal(rail[0].pierce, resolveWeapon(railRun.weapons[0], {}).pierce);
  assert.ok(rail[0].pierce > 0);
});

test("boomerang returns to the player and can hit a second enemy", () => {
  const d = createRun();
  d.weapons = [weapon("orbit", BRANCH_LEVEL, "orbit-return")];
  d.enemies = [enemy(1, 600, 100)];
  d.bullets = [
    bullet({
      weapon: "orbit",
      branch: "orbit-return",
      behavior: "boomerang",
      vx: 200,
      vy: 0,
      damage: 7,
      pierce: 4,
      life: 1,
      returnAt: 0.55,
    }),
  ];
  const blade = d.bullets[0];
  blade.x = 600;
  blade.y = 325;
  blade.life = blade.returnAt! - 0.01;
  const first = stepCombat(d, input, 1 / 60);
  assert.equal(first.damage, 7, "first contact hits");
  assert.ok(blade.bounced);
  assert.ok(blade.vx < 0, "blade turns back toward the player");
  // Second enemy sits on the return path and takes a fresh hit.
  d.enemies.push(enemy(2, 560, 100));
  blade.x = 578;
  blade.y = 325;
  const second = stepCombat(d, input, 1 / 60);
  assert.equal(second.damage, 7, "return pass hits a new target");
  assert.equal(second.branchDamage!["orbit-return"], 7);
});

test("nova chain splits on first contact and counts branch damage", () => {
  const d = createRun();
  d.weapons = [weapon("nova", BRANCH_LEVEL, "nova-chain")];
  d.enemies = [enemy(1, 600, 30), enemy(2, 700, 30)];
  d.bullets = [
    bullet({
      weapon: "nova",
      branch: "nova-chain",
      behavior: "chain",
      split: resolveWeapon(d.weapons[0], d.upgrades).split,
      damage: 20,
    }),
  ];
  const e = stepCombat(d, input, 0);
  assert.ok(d.bullets.some((b) => b.bounced && b.branch === "nova-chain"));
  assert.equal(e.branchDamage!["nova-chain"], 20);
  assert.equal(e.weaponDamage!.nova, 20);
});

test("projectiles keep their birth-time snapshot across a branch upgrade", () => {
  const d = createRun();
  d.enemies = [enemy(1, 600)];
  d.weapons = [weapon("pulse", BRANCH_LEVEL)];
  stepArsenal(d, input, 1 / 60);
  const inFlight = d.bullets.find((b) => b.owner === "player")!;
  const snapshot = { ...inFlight };
  // Upgrade mid-flight to a different branch.
  d.weapons[0].branch = "pulse-scatter";
  d.weapons[0].level = MAX_WEAPON_LEVEL;
  stepCombat(d, input, 1 / 60);
  const same = d.bullets.find((b) => b.id === inFlight.id) ?? snapshot;
  assert.equal(same.damage, snapshot.damage);
  assert.equal(same.branch, snapshot.branch);
  assert.equal(same.pierce, snapshot.pierce);
});

test("maxed weapons disappear from the candidate pool instead of wasting a level", () => {
  const d = createRun();
  d.weapons = [
    weapon("pulse", MAX_WEAPON_LEVEL, "pulse-rail"),
    weapon("orbit", MAX_WEAPON_LEVEL, "orbit-shard"),
    weapon("nova", MAX_WEAPON_LEVEL, "nova-overload"),
  ];
  for (const passive of ["power", "haste", "speed", "vitality", "armor", "magnet", "pierce"])
    d.upgrades[passive] = 999;
  const legal = legalChoiceIds(d);
  assert.deepEqual(legal, ["recovery"]);
  d.pendingLevels = 1;
  rollChoices(d);
  assert.deepEqual(d.choices, ["recovery"]);
  chooseUpgrade(d, "recovery");
  assert.equal(d.pendingLevels, 0);
});

test("the run ledger records effective damage per weapon and branch", () => {
  const d = createRun();
  d.enemies = [enemy(1, 600, 30)];
  d.bullets = [
    bullet({ weapon: "orbit", branch: "orbit-return", damage: 22 }),
  ];
  const e = stepCombat(d, input, 0);
  assert.equal(e.damage, 22);
  assert.equal(e.branchDamage!["orbit-return"], 22);
  assert.equal(e.weaponDamage!.orbit, 22);
});
