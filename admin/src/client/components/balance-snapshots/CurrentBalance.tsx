import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import { formatAmount, formatDate, formatDateTime } from "@/client/lib";

interface CurrentBalanceProps {
  snapshot: BalanceSnapshot | null;
}

/** 現在有効な残高（最新スナップショット）を示す白カード。金額は Poppins、日付は YYYY.MM.DD。 */
export default function CurrentBalance({ snapshot }: CurrentBalanceProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-[13px] font-bold text-foreground">現在有効な残高</h2>
      {snapshot ? (
        <dl className="mt-3 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] text-muted-foreground">残高</dt>
            <dd className="font-latin text-2xl font-semibold text-foreground">
              {formatAmount(snapshot.balance)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border-soft pt-3">
            <dt className="text-[13px] text-muted-foreground">残高日付</dt>
            <dd className="font-latin text-[13px] text-foreground">
              {formatDate(snapshot.snapshot_date)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[13px] text-muted-foreground">登録日時</dt>
            <dd className="font-latin text-xs text-muted-foreground">
              {formatDateTime(snapshot.created_at)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">残高スナップショットがありません</p>
      )}
    </div>
  );
}
