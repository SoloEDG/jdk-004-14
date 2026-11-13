import type { GameDoc, WeaponBranchId } from "../../../shared/types";
import { BRANCH_CATALOG, WEAPON_CATALOG } from "../../arsenal/model/catalog";
const branchRows = (doc: GameDoc) =>
  (Object.entries(doc.stats.byBranch) as [WeaponBranchId, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
export function StatsPanel({ doc }: { doc: GameDoc }) {
  const branches = branchRows(doc);
  return (
    <section className="panel stats">
      <div className="section-caption">
        <span>本局遥测</span>
        <span className="status-dot" />
      </div>
      <div className="stat-row">
        <span>击败敌人</span>
        <strong className="mono">
          {doc.stats.kills.toString().padStart(3, "0")}
        </strong>
      </div>
      <div className="stat-row">
        <span>累计伤害</span>
        <strong className="mono">
          {Math.round(doc.stats.damage).toLocaleString()}
        </strong>
      </div>
      <div className="stat-row">
        <span>拾取能量</span>
        <strong className="mono">{doc.stats.collected}</strong>
      </div>
      <div className="stat-row">
        <span>已受伤害</span>
        <strong className="mono">{Math.round(doc.stats.taken)}</strong>
      </div>
      {branches.length > 0 && (
        <div className="branch-stats">
          <div className="section-caption muted">
            <span>分支伤害</span>
            <span className="mono">有效</span>
          </div>
          {branches.map(([id, value]) => (
            <div className="stat-row branch-row" key={id}>
              <span>
                {BRANCH_CATALOG[id].name}
                <small>{WEAPON_CATALOG[BRANCH_CATALOG[id].weapon].name}</small>
              </span>
              <strong className="mono">{Math.round(value)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
