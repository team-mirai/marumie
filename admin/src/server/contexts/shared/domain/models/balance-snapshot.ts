import { todayInJst } from "@/server/contexts/shared/domain/models/jst-date";

export interface BalanceSnapshot {
  id: string;
  political_organization_id: string;
  snapshot_date: Date;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

/** 政治団体の残高スナップショット一覧と、そのうち「現在の残高」として扱うもの */
export interface BalanceSnapshotOverview {
  /** 残高日付の新しい順 */
  snapshots: BalanceSnapshot[];
  current: BalanceSnapshot | null;
}

/** 基準日が未来のときの却下理由 */
const FUTURE_SNAPSHOT_DATE_MESSAGE = "未来の日付は登録できません";

/** 残高日付の暦日（YYYY-MM-DD）。DB の date 型と同じく、UTC の 0 時を暦日として読む */
function toCalendarDate(snapshotDate: Date): string {
  return snapshotDate.toISOString().slice(0, 10);
}

/** a が b より新しいスナップショットか（残高日付、同じ日付なら登録日時で比べる） */
function isNewerThan(a: BalanceSnapshot, b: BalanceSnapshot): boolean {
  const byDate = a.snapshot_date.getTime() - b.snapshot_date.getTime();
  if (byDate !== 0) return byDate > 0;
  return a.created_at.getTime() > b.created_at.getTime();
}

export const BalanceSnapshot = {
  /**
   * 残高日付を登録してよいかを検証し、却下理由を返す（登録してよければ null）。
   *
   * 残高日付は暦日（`new Date("YYYY-MM-DD")` と同じく UTC の 0 時）で受け取り、日本時間の今日と比べる。
   * サーバーとブラウザのどちらの時計で判定しても、日本時間の同じ日付なら同じ結果になる。
   * 日付として読めない値は形式の検証に任せ、ここでは却下しない。
   */
  validateSnapshotDate(snapshotDate: Date, now: Date = new Date()): string | null {
    if (Number.isNaN(snapshotDate.getTime())) return null;
    return toCalendarDate(snapshotDate) > todayInJst(now) ? FUTURE_SNAPSHOT_DATE_MESSAGE : null;
  },

  /**
   * 「現在の残高」として扱うスナップショット。残高日付が最も新しいもの、同じ日付なら後から登録したもの。
   * 1 件も無ければ null。
   */
  current(snapshots: readonly BalanceSnapshot[]): BalanceSnapshot | null {
    let latest: BalanceSnapshot | null = null;
    for (const snapshot of snapshots) {
      if (latest === null || isNewerThan(snapshot, latest)) {
        latest = snapshot;
      }
    }
    return latest;
  },
};
