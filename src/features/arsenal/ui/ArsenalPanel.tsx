import type { GameDoc, WeaponId } from "../../../shared/types";
import { MAX_WEAPON_LEVEL, resolveWeapon, BRANCH_LEVEL } from "../lib/resolve";
import { BRANCH_CATALOG } from "../model/catalog";

const names: Record<WeaponId, [string, string, string]> = {
  pulse: ["脉冲射线", "PULSE RIFLE", "⌁"],
  orbit: ["轨道刃", "ORBITAL BLADE", "◎"],
  nova: ["新星爆发", "NOVA BURST", "✳"],
};

const fmt = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

function ParameterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="weapon-param">
      <span>{label}</span>
      <strong className="mono">{value}</strong>
    </div>
  );
}

export function ArsenalPanel({ doc }: { doc: GameDoc }) {
  const power = 1 + (doc.upgrades.power || 0) * 0.2;
  const haste = 1 + (doc.upgrades.haste || 0) * 0.13;
  const pierce = doc.upgrades.pierce || 0;
  return (
    <section className="panel">
      <div className="section-caption">
        <span>武器系统</span>
        <span className="mono muted">{doc.weapons.length} / 3</span>
      </div>
      <div className="loadout-globals">
        <ParameterRow label="全局伤害" value={`×${power.toFixed(2)}`} />
        <ParameterRow label="全局射速" value={`×${haste.toFixed(2)}`} />
        <ParameterRow label="全局穿透" value={`+${pierce}`} />
      </div>
      <div className="weapons">
        {(["pulse", "orbit", "nova"] as WeaponId[]).map((id) => {
          const w = doc.weapons.find((weapon) => weapon.id === id);
          const resolved = w ? resolveWeapon(w, doc.upgrades) : null;
          const branch = w?.branch ? BRANCH_CATALOG[w.branch] : null;
          return (
            <div className={`weapon-detail ${w ? "" : "locked"}`} key={id}>
              <div className="weapon">
                <div className={`weapon-icon ${id}`}>{names[id][2]}</div>
                <div>
                  <strong>{names[id][0]}</strong>
                  <small>{names[id][1]}</small>
                </div>
                <span className="weapon-level">
                  {w ? `Lv.${w.level}` : "未装配"}
                </span>
              </div>
              <div className="weapon-body">
                {w && (
                  <div className="level-pips">
                    {Array.from({ length: MAX_WEAPON_LEVEL }, (_, i) => (
                      <i key={i} className={i < w.level ? "active" : ""} />
                    ))}
                  </div>
                )}
                {resolved && w && (
                  <div className="weapon-branch-line">
                    {branch ? (
                      <span className="branch-tag">
                        分支 · {branch.name}
                        <small>{branch.tagline}</small>
                      </span>
                    ) : w.level >= BRANCH_LEVEL - 1 ? (
                      <span className="branch-tag pending">
                        分支节点 · 下次升级二选一
                      </span>
                    ) : (
                      <span className="branch-tag pending">
                        升至 Lv.{BRANCH_LEVEL} 进入分支节点
                      </span>
                    )}
                  </div>
                )}
                {resolved && (
                  <div className="weapon-params">
                    <ParameterRow label="单发伤害" value={fmt(resolved.damage)} />
                    <ParameterRow
                      label="每次齐射"
                      value={`${resolved.projectilesPerVolley} 发${
                        resolved.salvo > 1 ? ` · ${resolved.salvo} 层` : ""
                      }`}
                    />
                    <ParameterRow
                      label="理论 DPS"
                      value={fmt(resolved.volleyDamage * resolved.rate, 0)}
                    />
                    <ParameterRow
                      label="射速"
                      value={`${fmt(resolved.rate, 2)}/s`}
                    />
                    <ParameterRow label="穿透" value={`${resolved.pierce}`} />
                    <ParameterRow label="弹速" value={fmt(resolved.speed, 0)} />
                  </div>
                )}
                {branch && (
                  <p className="weapon-branch-desc">
                    {branch.summary.join(" · ")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hint">
        ↗ 自动锁定最近目标
        <br />
        <span>
          Lv.{BRANCH_LEVEL} 的这次升级需在两条弹道分支中二选一，本局不可更改。
        </span>
      </div>
    </section>
  );
}
