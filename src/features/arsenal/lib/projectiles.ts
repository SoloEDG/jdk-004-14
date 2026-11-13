import type {
  BulletBehavior,
  BulletSplit,
  GameDoc,
  Vec,
  WeaponBranchId,
  WeaponId,
} from "../../../shared/types";
export interface FireOptions {
  damage: number;
  speed: number;
  pierce: number;
  radius?: number;
  life?: number;
  origin?: Vec;
  branch?: WeaponBranchId | null;
  behavior?: BulletBehavior;
  split?: BulletSplit;
}
export function fire(
  doc: GameDoc,
  weapon: WeaponId,
  angle: number,
  options: FireOptions,
): void {
  const origin = options.origin ?? doc.player;
  doc.bullets.push({
    id: doc.nextId++,
    x: origin.x,
    y: origin.y,
    vx: Math.cos(angle) * options.speed,
    vy: Math.sin(angle) * options.speed,
    radius: options.radius ?? (weapon === "nova" ? 6 : 4),
    damage: options.damage,
    life: options.life ?? (weapon === "orbit" ? 1.25 : 2.1),
    owner: "player",
    weapon,
    pierce: options.pierce,
    hit: [],
    branch: options.branch ?? undefined,
    behavior: options.behavior,
    bounced: false,
    split: options.split,
    // Boomerangs flip after 55% of their (frozen) lifetime.
    returnAt:
      options.behavior === "boomerang"
        ? (options.life ?? (weapon === "orbit" ? 1.25 : 2.1)) * 0.55
        : undefined,
  });
}
export function nearestTarget(doc: GameDoc): Vec | undefined {
  let best: Vec | undefined,
    bestSquared = Infinity;
  for (const e of doc.enemies) {
    if (e.hp <= 0) continue;
    const n = (e.x - doc.player.x) ** 2 + (e.y - doc.player.y) ** 2;
    if (n < bestSquared) {
      best = e;
      bestSquared = n;
    }
  }
  return best;
}
