import AccessibleFormattedAmount from "@/client/components/top-page/features/financial-summary/AccessibleFormattedAmount";
import { formatAmount } from "@/client/lib/financial-calculator";

interface Props {
  title: string;
  amount: number;
  titleColor: string;
}

/**
 * 調研費の KPI カード（デザイン「KPI カード」節）。
 * PC はラベルの下に数値、SP はラベルと数値を横並びで両端に置く。ラベル・単位は SP でも 16px。
 */
export default function ResearchFundKpiCard({ title, amount, titleColor }: Props) {
  const formatted = formatAmount(amount);

  return (
    <div className="flex w-full flex-row items-center justify-between gap-5 rounded-2xl border border-[#E5E7EB] p-6 md:flex-[1_1_240px] md:flex-col md:items-start md:justify-start md:gap-4">
      <div className="text-base font-bold" style={{ color: titleColor }}>
        {title}
      </div>
      <AccessibleFormattedAmount amount={formatted} visualClassName="flex items-baseline gap-1">
        <span className="text-[28px] font-bold leading-5 text-[#1F2937] md:text-[36px]">
          {formatted.main}
        </span>
        {formatted.secondary && (
          <span className="text-base font-bold text-[#1F2937]">{formatted.secondary}</span>
        )}
        {formatted.tertiary && (
          <span className="text-[28px] font-bold leading-5 text-[#1F2937] md:text-[36px]">
            {formatted.tertiary}
          </span>
        )}
        <span className="whitespace-nowrap text-base font-bold leading-none text-[#6B7280]">
          {formatted.unit}
        </span>
      </AccessibleFormattedAmount>
    </div>
  );
}
