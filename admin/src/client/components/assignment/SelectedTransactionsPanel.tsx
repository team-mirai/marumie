import type { ReactNode } from "react";
import { formatAmount, formatDate } from "@/client/lib";

interface SelectedTransactionSummary {
  id: string;
  transactionDate: Date;
  debitAmount: number;
  description: string | null;
}

interface SelectedTransactionsPanelProps {
  transactions: SelectedTransactionSummary[];
  title: string;
  /** 一覧の下に置く補足（寄付者種別の制約など） */
  footer?: ReactNode;
}

const MAX_VISIBLE = 10;

/**
 * 紐付けダイアログ左側の「選択中の取引」一覧。日付は `YYYY.MM.DD`、金額は Poppins で表示し、
 * 罫線はテーブル行と同じ `#E5E5E5`。
 */
export function SelectedTransactionsPanel({
  transactions,
  title,
  footer,
}: SelectedTransactionsPanelProps) {
  const hiddenCount = transactions.length - MAX_VISIBLE;
  return (
    <div className="flex min-h-0 flex-col lg:w-1/3 lg:shrink-0">
      <p className="mb-2 text-xs font-bold text-foreground">{title}</p>

      <ul className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border-soft">
        {transactions.slice(0, MAX_VISIBLE).map((t) => (
          <li key={t.id} className="border-b border-border-soft px-3 py-2 last:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-latin text-xs text-muted-foreground">
                {formatDate(t.transactionDate)}
              </span>
              <span className="font-latin text-[13px] font-semibold text-foreground">
                {formatAmount(t.debitAmount)}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{t.description || "-"}</p>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="px-3 py-2 text-center text-xs text-muted-foreground">
            ...他 <span className="font-latin">{hiddenCount}</span>件
          </li>
        )}
      </ul>

      {footer}
    </div>
  );
}
