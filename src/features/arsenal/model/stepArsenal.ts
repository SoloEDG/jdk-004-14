import type { GameDoc, Input } from "../../../shared/types";
import { fire, nearestTarget } from "../lib/projectiles";
import { resolveWeapon } from "../lib/resolve";
export function stepArsenal(doc: GameDoc, input: Input, dt: number): number {
  let shots = 0;
  const target = nearestTarget(doc),
    aim = input.firing ? input.aim : target || input.aim;
  const angle = Math.atan2(aim.y - doc.player.y, aim.x - doc.player.x);
  for (const weapon of doc.weapons) {
    weapon.cooldown -= dt;
    if (weapon.cooldown > 0) continue;
    const resolved = resolveWeapon(weapon, doc.upgrades);
    weapon.cooldown = resolved.interval;
    // Pulse branches aim at the target; orbit and nova radiate from the ship.
    const baseAngle = weapon.id === "pulse" ? angle : doc.time * 0.8;
    for (let layer = 0; layer < resolved.salvo; layer++) {
      const layerOffset = (layer * Math.PI) / resolved.projectileCount;
      for (let i = 0; i < resolved.projectileCount; i++) {
        const spreadOffset =
          resolved.id === "pulse"
            ? (i - (resolved.projectileCount - 1) / 2) * resolved.spread
            : 0;
        fire(doc, weapon.id, baseAngle + layerOffset + spreadOffset, {
          damage: resolved.damage,
          speed: resolved.speed,
          pierce: resolved.pierce,
          radius: resolved.radius,
          life: resolved.life,
          branch: resolved.branch,
          behavior: resolved.behavior,
          split: resolved.split,
        });
        shots++;
      }
    }
  }
  return shots;
}
