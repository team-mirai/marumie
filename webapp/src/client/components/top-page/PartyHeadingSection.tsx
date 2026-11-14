import "server-only";
import AmountSummary from "@/client/components/common/AmountSummary";
import MistHeadingCard from "@/client/components/common/MistHeadingCard";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import type { SankeyData } from "@/types/sankey";

interface PartyHeadingSectionProps {
  organizationName: string;
  slug: string;
  year: number;
  years: readonly number[];
  updatedAt: string;
  political: SankeyData | null;
  friendly: SankeyData | null;
}

/** 政党ページ冒頭の見出しカード。収入・支出・収支の金額と、区分タブつきの収支の流れを1枚にまとめる。 */
export default function PartyHeadingSection({
  organizationName,
  slug,
  year,
  years,
  updatedAt,
  political,
  friendly,
}: PartyHeadingSectionProps) {
  const summary = calculateSankeyFinancialSummary(friendly);

  return (
    <MistHeadingCard
      ariaLabel="政党情報"
      logo={{ src: "/logos/team-mirai-logo.svg", alt: "チームみらいのロゴ" }}
      title={`${organizationName}の収支`}
      subtitle={`政党・${year}年`}
      updatedAt={updatedAt}
      years={years.map((y) => ({ year: y, href: `/o/${slug}/${y}` }))}
      currentYear={year}
    >
      <AmountSummary
        items={[
          { label: "収入総額", color: "#2AA693", amount: summary.income },
          { label: "支出総額", color: "#DC2626", amount: summary.expense },
          { label: "収支・現金残高", color: "#6B7280", amount: summary.balance },
        ]}
      />
      <CashFlowSection political={political} friendly={friendly} />
    </MistHeadingCard>
  );
}
