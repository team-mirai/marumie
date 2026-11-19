import "server-only";
import AmountSummary from "@/client/components/common/AmountSummary";
import MistHeadingCard from "@/client/components/common/MistHeadingCard";
import YearSegment from "@/client/components/common/YearSegment";
import OrganizationAvatar from "@/client/components/home/OrganizationAvatar";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import type { SankeyData } from "@/types/sankey";

interface PartyHeadingSectionProps {
  organizationName: string;
  slug: string;
  /** 代表者の顔写真を配信できるか。false なら人型のアイコンにする */
  hasPhoto: boolean;
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
  hasPhoto,
  year,
  years,
  updatedAt,
  political,
  friendly,
}: PartyHeadingSectionProps) {
  // 取得に失敗したときは 0 円と区別できるよう、金額を出さない
  const summary = friendly ? calculateSankeyFinancialSummary(friendly) : null;
  const yearOptions = years.map((y) => ({ year: y, href: `/o/${slug}/${y}` }));

  return (
    <MistHeadingCard
      ariaLabel="政党情報"
      avatar={
        <OrganizationAvatar
          slug={slug}
          alt={`${organizationName}の代表者の写真`}
          hasPhoto={hasPhoto}
        />
      }
      title={`${organizationName}の収支`}
      subtitle={`${year}年`}
      updatedAt={updatedAt}
      yearSwitch={{
        sp: <YearSegment years={yearOptions} currentYear={year} />,
        pc: <YearSegment years={yearOptions} currentYear={year} tone="plain" />,
      }}
    >
      <AmountSummary
        darkTopRule
        items={[
          { label: "収入総額", color: "#2AA693", amount: summary?.income ?? null },
          { label: "支出総額", color: "#DC2626", amount: summary?.expense ?? null },
          { label: "現金残高", color: "#6B7280", amount: summary?.balance ?? null },
        ]}
      />
      <CashFlowSection id="cash-flow" political={political} friendly={friendly} />
    </MistHeadingCard>
  );
}
