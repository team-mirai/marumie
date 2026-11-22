import type { ReactNode } from "react";
import { formatCurrency } from "@/client/lib";
import { SectionCard } from "@/client/components/export-report/sections/SectionCard";
import { EXPENSE_DETAIL_THRESHOLD_LABEL } from "@/server/contexts/report/domain/models/expense-detail-threshold";

interface SectionWrapperProps {
  title: string;
  formId: string;
  totalAmount: number;
  underThresholdAmount?: number;
  thresholdLabel?: string;
  isEmpty?: boolean;
  children: ReactNode;
}

/** 合計金額付きの明細セクション枠 */
export function SectionWrapper({
  title,
  formId,
  totalAmount,
  underThresholdAmount,
  thresholdLabel = `${EXPENSE_DETAIL_THRESHOLD_LABEL}未満の合計`,
  isEmpty = false,
  children,
}: SectionWrapperProps) {
  return (
    <SectionCard
      title={title}
      formId={formId}
      muted={isEmpty}
      meta={
        <>
          <span>
            合計: <span className="font-latin font-semibold">{formatCurrency(totalAmount)}</span>
          </span>
          {underThresholdAmount !== undefined && underThresholdAmount > 0 && (
            <span className="ml-3 text-muted-foreground">
              ({thresholdLabel}:{" "}
              <span className="font-latin">{formatCurrency(underThresholdAmount)}</span>)
            </span>
          )}
        </>
      }
    >
      {children}
    </SectionCard>
  );
}
