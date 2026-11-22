import "server-only";
import AmountSummary from "@/client/components/common/AmountSummary";
import SectionCard from "@/client/components/layout/SectionCard";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import type { FinancialSummary } from "@/types/financial-summary";
import type { SankeyData } from "@/types/sankey";

interface OrganizationCashFlowSectionProps {
  /** 見出しの上の小さな行（例: 「安野貴博の政治団体・2026年」） */
  eyebrow: string;
  updatedAt: string;
  political: SankeyData | null;
  friendly: SankeyData | null;
  /** 収入総額・支出総額・現金残高。取得に失敗したときは null（0 円と区別できるよう金額を出さない） */
  summary: FinancialSummary | null;
}

/** 政治団体ページの収支の流れ。収入・支出・収支の金額と区分タブつきのサンキー。 */
export default function OrganizationCashFlowSection({
  eyebrow,
  updatedAt,
  political,
  friendly,
  summary,
}: OrganizationCashFlowSectionProps) {
  return (
    <SectionCard
      id="cash-flow"
      iconSrc="/icons/icon-cashflow.svg"
      iconLabel="Cash flow icon"
      eyebrow={eyebrow}
      title="収支の流れ"
      updatedAt={updatedAt}
    >
      <AmountSummary
        items={[
          { label: "収入総額", color: "#2AA693", amount: summary?.income ?? null },
          { label: "支出総額", color: "#DC2626", amount: summary?.expense ?? null },
          { label: "現金残高", color: "#6B7280", amount: summary?.balance ?? null },
        ]}
      />
      <CashFlowSection political={political} friendly={friendly} />
    </SectionCard>
  );
}
