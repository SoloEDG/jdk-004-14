import type {
  Bullet,
  BulletSplit,
  Enemy,
  GameDoc,
  Input,
  FrameEvents,
} from "../../../shared/types";
import { WIDTH, HEIGHT } from "../../../shared/types";
import { clamp, distance, normalize } from "../../../shared/math";
import { segmentDistance } from "../lib/collision";
import { hurtPlayer } from "./health";

function spawnSplit(
  doc: GameDoc,
  parent: Bullet,
  enemy: Enemy,
  payload: BulletSplit,
): void {
  const base = Math.atan2(parent.vy, parent.vx);
  // Chain shards seek distinct nearby targets; if the field is empty they fan
  // out evenly so the behaviour is still visible.
  const targets = doc.enemies
    .filter((other) => other.hp > 0 && !parent.hit.includes(other.id))
    .sort(
      (a, b) =>
        (a.x - enemy.x) ** 2 + (a.y - enemy.y) ** 2 -
        ((b.x - enemy.x) ** 2 + (b.y - enemy.y) ** 2),
    );
  for (let i = 0; i < payload.count; i++) {
    const target = targets[i];
    const angle = target
      ? Math.atan2(target.y - enemy.y, target.x - enemy.x)
      : base + (i * Math.PI * 2) / payload.count;
    doc.bullets.push({
      id: doc.nextId++,
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * payload.speed,
      vy: Math.sin(angle) * payload.speed,
      radius: payload.radius,
      damage: payload.damage,
      life: payload.life,
      owner: "player",
      weapon: parent.weapon,
      pierce: payload.pierce,
      // Shards inherit the parent's hit list so they cannot re-hit a target
      // the parent already struck (including the detonation target).
      hit: parent.hit.slice(),
      branch: parent.branch,
      behavior: "chain",
      bounced: true,
    });
  }
}

function turnBoomerangs(doc: GameDoc, bullets: Bullet[]): void {
  for (const bullet of bullets) {
    if (bullet.behavior !== "boomerang" || bullet.bounced) continue;
    if (bullet.returnAt === undefined || bullet.life > bullet.returnAt) continue;
    const toward = normalize(
      doc.player.x - bullet.x,
      doc.player.y - bullet.y,
    );
    const speed = Math.hypot(bullet.vx, bullet.vy) || 150;
    bullet.vx = toward.x * speed;
    bullet.vy = toward.y * speed;
    // The return pass may strike enemies not yet hit, but an enemy already
    // hit by this blade is tracked for its whole flight.
    bullet.bounced = true;
  }
}

export function stepCombat(
  doc: GameDoc,
  input: Input,
  dt: number,
): FrameEvents {
  const events: FrameEvents = {
    kills: [],
    damage: 0,
    taken: 0,
    shots: 0,
    collected: 0,
    weaponDamage: {},
    branchDamage: {},
  };
  const player = doc.player;
  player.invincible = Math.max(0, player.invincible - dt);
  const direction = normalize(input.x, input.y),
    strength = Math.min(1, Math.hypot(input.x, input.y));
  player.x = clamp(
    player.x + direction.x * strength * player.speed * dt,
    player.radius,
    WIDTH - player.radius,
  );
  player.y = clamp(
    player.y + direction.y * strength * player.speed * dt,
    player.radius,
    HEIGHT - player.radius,
  );
  // Snapshot so projectiles spawned mid-frame (chain shards) only fly next
  // frame instead of being processed with stale positions.
  const bullets = doc.bullets.slice();
  for (const bullet of bullets) {
    const previous = { x: bullet.x, y: bullet.y };
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life < 0) continue;
    if (bullet.owner === "enemy") {
      if (
        segmentDistance(player, previous, bullet) <
        player.radius + bullet.radius
      ) {
        events.taken += hurtPlayer(doc, bullet.damage);
        bullet.life = -1;
      }
      continue;
    }
    for (const enemy of doc.enemies) {
      if (enemy.hp <= 0 || bullet.hit.includes(enemy.id)) continue;
      if (
        segmentDistance(enemy, previous, bullet) >
        enemy.radius + bullet.radius
      )
        continue;
      bullet.hit.push(enemy.id);
      const damage = Math.min(enemy.hp, bullet.damage);
      enemy.hp -= damage;
      events.damage += damage;
      if (bullet.weapon !== "enemy") {
        events.weaponDamage![bullet.weapon] =
          (events.weaponDamage![bullet.weapon] || 0) + damage;
        if (bullet.branch)
          events.branchDamage![bullet.branch] =
            (events.branchDamage![bullet.branch] || 0) + damage;
      }
      if (enemy.hp <= 0)
        events.kills.push({
          enemy: { ...enemy },
          weapon: bullet.weapon === "enemy" ? "pulse" : bullet.weapon,
          branch: bullet.branch,
        });
      // Nova chain rounds detonate into shards on their first contact only.
      if (bullet.split && !bullet.bounced) {
        spawnSplit(doc, bullet, enemy, bullet.split);
        bullet.bounced = true;
        bullet.life = -1;
        break;
      }
      if (bullet.pierce <= 0) {
        bullet.life = -1;
        break;
      }
      bullet.pierce--;
    }
  }
  turnBoomerangs(doc, bullets);
  for (const enemy of doc.enemies) {
    if (enemy.hp > 0 && distance(enemy, player) < enemy.radius + player.radius)
      events.taken += hurtPlayer(doc, enemy.kind === "elite" ? 25 : 12);
  }
  doc.enemies = doc.enemies.filter((e) => e.hp > 0);
  doc.bullets = doc.bullets.filter(
    (b) =>
      b.life >= 0 &&
      b.x > -120 &&
      b.x < WIDTH + 120 &&
      b.y > -120 &&
      b.y < HEIGHT + 120,
  );
  return events;
}
