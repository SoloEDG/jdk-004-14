import type { RunRecord } from "../../../shared/types";
import { formatTime } from "../../../shared/math";
import { BRANCH_CATALOG } from "../../arsenal/model/catalog";
import type { WeaponBranchId } from "../../../shared/types";
export function HistoryPanel({
  records,
  close,
}: {
  records: RunRecord[];
  close: () => void;
}) {
  return (
    <div className="overlay">
      <div className="history-dialog">
        <button className="close" onClick={close}>
          关闭 ✕
        </button>
        <div className="eyebrow">FLIGHT RECORDER</div>
        <h2>行动档案</h2>
        {!records.length ? (
          <p>尚无行动记录，完成一局后自动保存在此浏览器。</p>
        ) : (
          records
            .slice()
            .map((r) => (
              <div className="history-row" key={r.id}>
                <span>{r.victory ? "撤离成功" : "信号中断"}</span>
                <span>{formatTime(r.duration)}</span>
                <span>波次 {r.wave}</span>
                <span>{r.kills} 击杀</span>
                {r.weapons.some((w) => w.split(":")[2]) && (
                  <span className="history-branches">
                    {r.weapons
                      .map((w) => w.split(":")[2])
                      .filter((b) => b in BRANCH_CATALOG)
                      .map((b) => BRANCH_CATALOG[b as WeaponBranchId].name)
                      .join(" / ")}
                  </span>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
