"use client";
import "client-only";
import BaseCard from "@/client/components/ui/BaseCard";
import type { FormattedAmount } from "@/client/lib/financial-calculator";

interface FinancialSummaryCardProps {
  title: string;
  amount: FormattedAmount;
  titleColor: string;
  amountColor: string;
  className?: string;
}

export default function FinancialSummaryCard({
  title,
  amount,
  titleColor,
  amountColor,
  className = "",
}: FinancialSummaryCardProps) {
  return (
    <BaseCard className={className}>
      <div className="flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start gap-5 sm:gap-4">
        <div className={`font-bold text-sm sm:text-base`} style={{ color: titleColor }}>
          {title}
        </div>
        <div className="flex items-baseline gap-1 translate-y-0.5">
          <span
            className="font-bold text-[28px] sm:text-[36px] leading-5"
            style={{ color: amountColor }}
          >
            {amount.main}
          </span>
          {amount.secondary && (
            <span className="font-bold text-xs sm:text-base" style={{ color: amountColor }}>
              {amount.secondary}
            </span>
          )}
          {amount.tertiary && (
            <span
              className="font-bold text-[28px] sm:text-[36px] leading-5"
              style={{ color: amountColor }}
            >
              {amount.tertiary}
            </span>
          )}
          <span
            className="font-bold text-xs sm:text-base leading-none"
            style={{ color: "#6B7280" }}
          >
            {amount.unit}
          </span>
        </div>
      </div>
    </BaseCard>
  );
}
