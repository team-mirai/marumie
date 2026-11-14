"use client";
import "client-only";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import AmountSummary from "@/client/components/common/AmountSummary";
import MistHeadingCard from "@/client/components/common/MistHeadingCard";
import YearSegment from "@/client/components/common/YearSegment";
import CashFlowSection from "@/client/components/top-page/CashFlowSection";
import { calculateSankeyFinancialSummary } from "@/client/lib/sankey-financial-summary";
import type { SankeyData } from "@/types/sankey";

interface HomeOrganizationCardYear {
  year: number;
  political: SankeyData | null;
  friendly: SankeyData | null;
}

interface HomeOrganizationCardProps {
  /** 政党は緑、政治団体は青みのある緑の面にする */
  tone: "party" | "group";
  slug: string;
  /** 団体名（例: 「チームみらい」） */
  name: string;
  /** 見出し（例: 「チームみらいの収支」）。省略時は団体名 */
  title?: string;
  /** 見出しの下に添える正式名など */
  subtitle?: string;
  avatar: ReactNode;
  /** 例: 「2026.10.23更新」 */
  updatedAt: string;
  years: HomeOrganizationCardYear[];
  /** 最初に表示する年 */
  defaultYear: number;
}

/**
 * トップページの政党・政治団体の収支カード。年の切り替えでその場の金額と収支の流れを差し替え、
 * 「詳しく」から選んでいる年の政党・政治団体ページへ移る。
 */
export default function HomeOrganizationCard({
  tone,
  slug,
  name,
  title = name,
  subtitle,
  avatar,
  updatedAt,
  years,
  defaultYear,
}: HomeOrganizationCardProps) {
  const [currentYear, setCurrentYear] = useState(defaultYear);
  const current = years.find((y) => y.year === currentYear) ?? years[0];
  const detailHref = `/o/${slug}/${current.year}`;
  // 取得に失敗したときは 0 円と区別できるよう、金額を出さない
  const summary = current.friendly ? calculateSankeyFinancialSummary(current.friendly) : null;

  return (
    <MistHeadingCard
      ariaLabel={title}
      avatar={avatar}
      title={title}
      subtitle={subtitle}
      updatedAt={updatedAt}
      href={detailHref}
      headingLevel="h2"
      tone={tone}
      yearSwitch={
        <YearSegment
          years={years.map(({ year }) => ({ year }))}
          currentYear={current.year}
          onSelect={setCurrentYear}
        />
      }
    >
      <AmountSummary
        size={tone === "group" ? "compact" : "default"}
        items={[
          { label: "収入総額", color: "#2AA693", amount: summary?.income ?? null },
          { label: "支出総額", color: "#DC2626", amount: summary?.expense ?? null },
          { label: "収支・現金残高", color: "#6B7280", amount: summary?.balance ?? null },
        ]}
      />
      {/* 年を切り替えたらタブの選択を初期に戻す */}
      <CashFlowSection
        key={current.year}
        political={current.political}
        friendly={current.friendly}
      />
      <Link
        href={detailHref}
        className="inline-flex h-12 items-center justify-center gap-1 self-stretch whitespace-nowrap rounded-full bg-[#0B0F0E] px-3.5 text-[clamp(12px,3.8vw,15px)] font-extrabold text-white transition-colors hover:bg-[#0F8472] md:h-[52px] md:min-w-[360px] md:self-center md:px-7 md:text-[15px]"
      >
        {name}の収支を詳しく
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </MistHeadingCard>
  );
}
