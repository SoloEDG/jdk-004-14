export type Vec = { x: number; y: number };
export type Phase = "ready" | "playing" | "paused" | "upgrade" | "ended";
export type WeaponId = "pulse" | "orbit" | "nova";
/**
 * A weapon commits to exactly one ballistic branch for the rest of a run.
 * The id already encodes the weapon, so a branch can never be applied to
 * another weapon by accident.
 */
export type WeaponBranchId =
  | "pulse-scatter"
  | "pulse-rail"
  | "orbit-return"
  | "orbit-shard"
  | "nova-chain"
  | "nova-overload";
/**
 * Branch-only projectile behaviour. Firing-time branches (spread, rail, shard,
 * overload) need no special flag; they are fully described by their parameters.
 */
export type BulletBehavior = "boomerang" | "chain";
/** Properties copied onto a projectile at birth; later upgrades never mutate it. */
export interface BulletSplit {
  count: number;
  spread: number;
  damage: number;
  speed: number;
  pierce: number;
  radius: number;
  life: number;
}
export interface Player extends Vec {
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  invincible: number;
}
export interface Enemy extends Vec {
  id: number;
  kind: "chaser" | "shooter" | "elite";
  hp: number;
  maxHp: number;
  radius: number;
  cooldown: number;
}
export interface Bullet extends Vec {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  owner: "player" | "enemy";
  weapon: WeaponId | "enemy";
  pierce: number;
  hit: number[];
  /** Snapshot of the firing branch. Absent on enemy rounds and legacy saves. */
  branch?: WeaponBranchId;
  /** Branch-specific flight/hit behaviour, frozen at launch. */
  behavior?: BulletBehavior;
  /** Set once a boomerang has turned back or a chain hit has been consumed. */
  bounced?: boolean;
  /** Remaining life at which a boomerang blade turns back toward the player. */
  returnAt?: number;
  /** Split payload carried by nova chain projectiles. */
  split?: BulletSplit;
}
export interface Drop extends Vec {
  id: number;
  kind: "xp" | "heal" | "magnet";
  value: number;
  life: number;
}
export interface Weapon {
  id: WeaponId;
  level: number;
  cooldown: number;
  /** Permanent ballistic branch, chosen at the weapon's branch node. */
  branch: WeaponBranchId | null;
}
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: string;
  max: number;
  /** Weapon level at which this upgrade offers its irreversible branch. */
  branchNode?: WeaponId;
}
export interface RunStats {
  kills: number;
  damage: number;
  taken: number;
  collected: number;
  shots: number;
  byWeapon: Record<WeaponId, number>;
  /** Effective damage per weapon branch; keyed by WeaponBranchId. */
  byBranch: Partial<Record<WeaponBranchId, number>>;
}
export interface RunRecord {
  id: string;
  duration: number;
  wave: number;
  level: number;
  kills: number;
  damage: number;
  weapons: string[];
  /** Effective damage per branch, mirrored from the run ledger when present. */
  branches?: Record<string, number>;
  victory: boolean;
}
export interface GameDoc {
  version: 1;
  seed: number;
  initialSeed: number;
  nextId: number;
  phase: Phase;
  time: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  weapons: Weapon[];
  upgrades: Record<string, number>;
  choices: string[];
  xp: number;
  level: number;
  pendingLevels: number;
  wave: number;
  waveTime: number;
  spawnBudget: number;
  stats: RunStats;
  records: RunRecord[];
  notice: string;
  victory: boolean;
}
export interface Input {
  x: number;
  y: number;
  aim: Vec;
  firing: boolean;
}
export interface KillEvent {
  enemy: Enemy;
  weapon: WeaponId;
  branch?: WeaponBranchId;
}
export interface FrameEvents {
  weaponDamage?: Partial<Record<WeaponId, number>>;
  branchDamage?: Partial<Record<WeaponBranchId, number>>;
  kills: KillEvent[];
  damage: number;
  taken: number;
  shots: number;
  collected: number;
}
export const WIDTH = 1000;
export const HEIGHT = 650;
