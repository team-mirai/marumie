import type { ReactNode } from "react";

interface SectionWrapperProps {
  title: string;
  formId: string;
  totalAmount: number;
  underThresholdAmount?: number;
  thresholdLabel?: string;
  isEmpty?: boolean;
  children: ReactNode;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function SectionWrapper({
  title,
  formId,
  totalAmount,
  underThresholdAmount,
  thresholdLabel = "10万円未満の合計",
  isEmpty = false,
  children,
}: SectionWrapperProps) {
  return (
    <div className={`bg-white border border-black overflow-hidden ${isEmpty ? "opacity-50" : ""}`}>
      <div className="bg-gray-100 border-b border-black px-4 py-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-black">
            {title} ({formId})
          </h3>
          <div className="text-sm text-black">
            <span className="font-medium">合計: {formatCurrency(totalAmount)}</span>
            {underThresholdAmount !== undefined && underThresholdAmount > 0 && (
              <span className="ml-4 text-gray-500">
                ({thresholdLabel}: {formatCurrency(underThresholdAmount)})
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
