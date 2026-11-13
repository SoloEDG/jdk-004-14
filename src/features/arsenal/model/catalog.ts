import type {
  BulletBehavior,
  WeaponBranchId,
  WeaponId,
} from "../../../shared/types";
export const WEAPON_CATALOG: Record<
  WeaponId,
  { name: string; description: string; color: string; interval: number }
> = {
  pulse: {
    name: "脉冲步枪",
    description: "自动锁定最近目标，精准连续打击",
    color: "#67e8f9",
    interval: 0.48,
  },
  orbit: {
    name: "环轨飞刃",
    description: "向四周释放穿透飞刃",
    color: "#c084fc",
    interval: 1.7,
  },
  nova: {
    name: "新星爆发",
    description: "周期性向周围发射能量星环",
    color: "#fbbf24",
    interval: 3.2,
  },
};
/** Every weapon reaches its branch node at this level. */
export const BRANCH_LEVEL = 3;
/** Levels spent in a branch before it is considered fully evolved. */
export const MAX_WEAPON_LEVEL = 5;

export interface WeaponBranch {
  id: WeaponBranchId;
  weapon: WeaponId;
  name: string;
  tagline: string;
  description: string;
  /** Runtime flight behaviour; firing-time branches leave this undefined. */
  behavior?: BulletBehavior;
  /** Display-only parameter deltas; the firing table below is authoritative. */
  summary: string[];
  /** Branch-only bonuses layered on top of the shared weapon level curve. */
  damageMultiplier: number;
  targetBonus: number;
  pierceBonus: number;
}

export const BRANCH_CATALOG: Record<WeaponBranchId, WeaponBranch> = {
  "pulse-scatter": {
    id: "pulse-scatter",
    weapon: "pulse",
    name: "散列脉冲",
    tagline: "SCATTER ARRAY",
    description:
      "放弃单发精度，一次齐射 5 发扇形弹幕。每发都独立结算命中，适合清理密集的近身敌群。",
    summary: ["扇形 5 发齐射", "单发 ×0.90", "射速 ×0.91"],
    damageMultiplier: 0.9,
    targetBonus: 0,
    pierceBonus: 0,
  },
  "pulse-rail": {
    id: "pulse-rail",
    weapon: "pulse",
    name: "轨道磁轨",
    tagline: "RAIL CONDUIT",
    description:
      "收束为一发高速贯穿弹，命中后继续前进并可再命中 2 个目标，单体火力极高。",
    summary: ["单发贯穿 +2", "弹速 ×1.70", "伤害 ×1.90"],
    damageMultiplier: 1.9,
    targetBonus: 0,
    pierceBonus: 2,
  },
  "orbit-return": {
    id: "orbit-return",
    weapon: "orbit",
    name: "回旋刃轮",
    tagline: "BOOMERANG ROTOR",
    description:
      "飞刃抵达射程后折返玩家身边，返程仍可命中尚未被击中的目标，覆盖战场更久。",
    behavior: "boomerang",
    summary: ["飞刃折返", "返程独立命中", "持续 ×1.35"],
    damageMultiplier: 0.75,
    targetBonus: 0,
    pierceBonus: 1,
  },
  "orbit-shard": {
    id: "orbit-shard",
    weapon: "orbit",
    name: "裂片环轨",
    tagline: "SHARD BLOOM",
    description:
      "每轮飞刃数量增加，并以双层轨道错峰发射，形成持续的环状火力网。",
    summary: ["飞刃 +3", "双层环轨", "伤害 ×0.85"],
    damageMultiplier: 0.85,
    targetBonus: 3,
    pierceBonus: 0,
  },
  "nova-chain": {
    id: "nova-chain",
    weapon: "nova",
    name: "连锁新星",
    tagline: "CHAIN DETONATION",
    description:
      "星环命中首个目标后分裂出 3 枚追踪附近敌人的次级星屑，星屑伤害为星环的 65%。",
    behavior: "chain",
    summary: ["命中分裂 3 枚星屑", "星屑 ×0.65", "星环 -2"],
    damageMultiplier: 0.8,
    targetBonus: 0,
    pierceBonus: 0,
  },
  "nova-overload": {
    id: "nova-overload",
    weapon: "nova",
    name: "超载新星",
    tagline: "OVERLOAD SHELL",
    description:
      "削减星环数量，换取单枚冲击波的高伤害、更大弹体与额外穿透，适合洞穿前排精英。",
    summary: ["星环 -4", "伤害 ×1.55", "弹体扩大"],
    damageMultiplier: 1.55,
    targetBonus: 0,
    pierceBonus: 1,
  },
};

export const WEAPON_BRANCHES: Record<WeaponId, WeaponBranchId[]> = {
  pulse: ["pulse-scatter", "pulse-rail"],
  orbit: ["orbit-return", "orbit-shard"],
  nova: ["nova-chain", "nova-overload"],
};

export const weaponOfBranch = (branch: WeaponBranchId): WeaponId =>
  BRANCH_CATALOG[branch].weapon;
