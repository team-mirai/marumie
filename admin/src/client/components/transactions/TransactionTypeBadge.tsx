import type { TransactionType } from "@/shared/models/transaction";
import { cn } from "@/client/lib";

interface TransactionTypeBadgeProps {
  type: TransactionType;
}

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "現金収入",
  expense: "現金支出",
  non_cash_journal: "非現金仕訳",
  offset_income: "相殺収入",
  offset_expense: "相殺支出",
};

function getTypeBadgeClass(type: TransactionType): string {
  switch (type) {
    case "income":
    case "offset_income":
      return "border-primary-active text-primary-active bg-accent";
    case "expense":
    case "offset_expense":
      return "border-destructive text-destructive bg-card";
    case "non_cash_journal":
      return "border-subtle-foreground text-muted-foreground bg-secondary";
  }
}

/** 取引種別のピルバッジ（11px/700・1.5px 枠）。 */
export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-[1.5px] px-3 py-[3px] text-[11px] font-bold leading-none tracking-[0.04em] whitespace-nowrap",
        getTypeBadgeClass(type),
      )}
    >
      {TYPE_LABELS[type] ?? "不明"}
    </span>
  );
}
