"use client";
import "client-only";
import { useState } from "react";
import CategoryModeTabs from "@/client/components/research-fund/CategoryModeTabs";
import ResearchFundPartyBars from "@/client/components/research-fund/ResearchFundPartyBars";
import ResearchFundPoliticianList from "@/client/components/research-fund/ResearchFundPoliticianList";
import FinancialSummaryCard from "@/client/components/top-page/features/financial-summary/FinancialSummaryCard";
import { formatAmount } from "@/client/lib/financial-calculator";
import type { ResearchFundPartyPoliticianView } from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";
import type { ResearchFundCategoryMode } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  politicians: ResearchFundPartyPoliticianView[];
  financialYear: number;
}

/**
 * A-6 の本体。議員リストの行選択でグラフ（KPI2枚＋横棒）を絞り込む。
 * 初期選択は公開中の先頭の議員。誰も公開していなければ先頭の議員。
 */
export default function ResearchFundPartyBody({ politicians, financialYear }: Props) {
  const initialSlug = (politicians.find((item) => item.ready) ?? politicians[0])?.slug ?? "";
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [mode, setMode] = useState<ResearchFundCategoryMode>("detailed");

  const selected = politicians.find((item) => item.slug === selectedSlug) ?? politicians[0];
  if (!selected) return null;

  return (
    <div className="flex flex-col gap-8">
      <ResearchFundPoliticianList
        politicians={politicians}
        selectedSlug={selected.slug}
        onSelect={setSelectedSlug}
        financialYear={financialYear}
      />

      {selected.ready ? (
        <div className="flex flex-col gap-8">
          {/* KPI は2枚だけ。未使用分はカードにしない（デザイン仕様 §5） */}
          <div className="flex flex-col gap-2 md:flex-row">
            <FinancialSummaryCard
              className="w-full md:flex-1"
              title={`支給された（${selected.name}）`}
              amount={formatAmount(selected.kpi.granted)}
              titleColor="#238778"
              amountColor="#1F2937"
            />
            <FinancialSummaryCard
              className="w-full md:flex-1"
              title="議員活動に使った"
              amount={formatAmount(selected.kpi.spent)}
              titleColor="#DC2626"
              amountColor="#1F2937"
            />
          </div>

          <div>
            <CategoryModeTabs value={mode} onChange={setMode} />
            <ResearchFundPartyBars bars={selected.bars[mode]} />
            <p className="mt-3 text-xs text-[#9CA3AF]">
              未使用分は含めていません。全{selected.count.toLocaleString("ja-JP")}件・
              {selected.kpi.spent.toLocaleString("ja-JP")}円
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm leading-[1.7] text-[#6A7383]">
          {selected.name}の調査研究費は現在準備中です。
          <br />
          記録の整理が完了した月から順次公開します。
        </div>
      )}
    </div>
  );
}
