import type { GameDoc } from "../../../shared/types";
import { describeChoice, isChoiceLegal } from "../model/choices";
import { resolveWeapon } from "../../arsenal/lib/resolve";
import { BRANCH_CATALOG } from "../../arsenal/model/catalog";
import {
  branchIdOf,
  findWeapon,
  levelWeaponIdOf,
} from "../../arsenal/model/weaponUpgrades";

/** Small preview so a branch can be compared before it is locked in. */
function preview(doc: GameDoc, upgradeId: string): string[] {
  const branchId = branchIdOf(upgradeId);
  const weaponId = levelWeaponIdOf(upgradeId);
  // Passive upgrades are fully described by their text, not weapon maths.
  if (!branchId && !weaponId) return [];
  const id = branchId ? BRANCH_CATALOG[branchId].weapon : weaponId!;
  const weapon = findWeapon(doc, id);
  if (!weapon) {
    return ["解锁后可在面板查看真实参数"];
  }
  const probe = { ...weapon };
  if (branchId) {
    probe.branch = branchId;
    probe.level = Math.min(5, Math.max(probe.level + 1, 3));
  } else {
    probe.level += 1;
  }
  const now = resolveWeapon(weapon, doc.upgrades);
  const next = resolveWeapon(probe, doc.upgrades);
  const arrows: string[] = [];
  const push = (label: string, a: number, b: number, digits = 1) => {
    if (Math.abs(a - b) < 0.01) return;
    arrows.push(
      `${label} ${a.toFixed(digits)} → ${b.toFixed(digits)}`,
    );
  };
  push("单发", now.damage, next.damage);
  push("齐射", now.projectilesPerVolley, next.projectilesPerVolley, 0);
  push("射速", now.rate, next.rate, 2);
  push("穿透", now.pierce, next.pierce, 0);
  return arrows;
}

export function UpgradeDialog({
  doc,
  choose,
}: {
  doc: GameDoc;
  choose: (id: string) => void;
}) {
  const allBranches = doc.choices.every((id) => !!branchIdOf(id));
  return (
    <div className="overlay">
      <div className="upgrade-dialog">
        <div className="eyebrow">EVOLUTION AVAILABLE</div>
        <h2>适应，然后生存。</h2>
        <p>
          等级 {doc.level} · 选择一项升级，战场时间已冻结
          {doc.choices.some((id) => branchIdOf(id)) && (
            <span className="lock-warning"> · 分支选择不可逆</span>
          )}
        </p>
        <div
          className={`upgrade-options ${
            allBranches || doc.choices.length > 3 ? "branch-grid" : ""
          }`}
        >
          {doc.choices.map((id) => {
            const u = describeChoice(doc, id);
            if (!u) return null;
            const branchId = branchIdOf(id);
            const changes = preview(doc, id);
            return (
              <button
                key={id}
                className={branchId ? "branch-option" : ""}
                disabled={!isChoiceLegal(doc, id)}
                onClick={() => choose(id)}
              >
                <span className="upgrade-symbol">
                  {branchId
                    ? BRANCH_CATALOG[branchId].behavior === "boomerang"
                      ? "↩"
                      : BRANCH_CATALOG[branchId].behavior === "chain"
                        ? "⌁"
                        : "✧"
                    : "✧"}
                </span>
                <small>{u.category}</small>
                <h3>{u.name}</h3>
                <p>{u.description}</p>
                {changes.length > 0 && (
                  <ul className="branch-preview">
                    {changes.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <span className="choose-label">
                  {branchId ? "锁定分支 ↗" : "选择升级 ↗"}
                </span>
              </button>
            );
          })}
        </div>
        <small className="muted">
          武器升至 Lv.3 进入分支节点，只能从两个分支中二选一；选择后本局不可更改。
        </small>
      </div>
    </div>
  );
}
