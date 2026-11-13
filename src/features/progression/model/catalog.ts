import type { Upgrade } from "../../../shared/types";
/**
 * The random passive pool. Weapon level-ups are derived at runtime so a weapon
 * at its branch node can never offer a plain level, and a maxed weapon simply
 * disappears from the pool instead of wasting a level.
 */
export const UPGRADE_CATALOG: Upgrade[] = [
  {
    id: "recovery",
    name: "紧急修复",
    description: "回复 30 点生命",
    category: "补给",
    max: Infinity,
  },
  {
    id: "power",
    name: "高能增幅",
    description: "全部武器伤害 +20%",
    category: "火力",
    max: 5,
  },
  {
    id: "haste",
    name: "超频回路",
    description: "全部武器射速 +13%",
    category: "火力",
    max: 5,
  },
  {
    id: "speed",
    name: "矢量推进",
    description: "移动速度 +12%",
    category: "机动",
    max: 4,
  },
  {
    id: "vitality",
    name: "生命扩容",
    description: "生命上限 +20，并回复 20",
    category: "生存",
    max: 5,
  },
  {
    id: "armor",
    name: "纳米装甲",
    description: "所受伤害降低 12%",
    category: "生存",
    max: 4,
  },
  {
    id: "magnet",
    name: "引力拾取",
    description: "拾取范围扩大 35 像素",
    category: "辅助",
    max: 4,
  },
  {
    id: "pierce",
    name: "穿透弹芯",
    description: "全部武器额外穿透 1 个目标",
    category: "火力",
    max: 3,
  },
];
