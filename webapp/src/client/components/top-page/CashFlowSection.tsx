"use client";
import "client-only";
import Image from "next/image";
import { useState } from "react";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import SankeyChart from "@/client/components/top-page/features/charts/SankeyChart";
import FinancialSummarySection from "@/client/components/top-page/features/financial-summary/FinancialSummarySection";

import type { SankeyData } from "@/types/sankey";

interface CashFlowSectionProps {
  political?: SankeyData | null;
  friendly?: SankeyData | null;
  updatedAt: string;
  organizationName?: string;
}

export default function CashFlowSection({
  political,
  friendly,
  updatedAt,
  organizationName,
}: CashFlowSectionProps) {
  const [activeTab, setActiveTab] = useState<"political" | "friendly">("friendly");

  const currentData = activeTab === "political" ? political : friendly;

  return (
    <MainColumnCard id="cash-flow">
      <CardHeader
        icon={<Image src="/icons/icon-cashflow.svg" alt="Cash flow icon" width={30} height={31} />}
        organizationName={organizationName || "未登録の政治団体"}
        title="収支の流れ"
        updatedAt={updatedAt}
        subtitle="どこからお金を得て、何に使っているか"
      />

      {/* 財務サマリー */}
      <FinancialSummarySection sankeyData={friendly ?? null} />

      {/* タブ */}
      <div className="flex gap-7 border-b border-gray-300 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("friendly")}
          className={`pb-2 font-bold text-base border-b-2 transition-colors leading-tight cursor-pointer ${
            activeTab === "friendly"
              ? "border-[#238778] text-[#238778]"
              : "border-transparent text-[#9CA3AF] hover:text-gray-600"
          }`}
        >
          詳細の区分
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("political")}
          className={`pb-2 font-bold text-base border-b-2 transition-colors leading-tight cursor-pointer ${
            activeTab === "political"
              ? "border-[#238778] text-[#238778]"
              : "border-transparent text-[#9CA3AF] hover:text-gray-600"
          }`}
        >
          法律上の区分
        </button>
      </div>

      {/* サンキー図 */}
      <div className="md:mx-0 -mx-3 mb-0">
        {currentData ? (
          <SankeyChart data={currentData} />
        ) : (
          <div className="text-gray-500 mx-4">サンキー図データが取得できませんでした</div>
        )}
      </div>

      {/* 更新日時 */}
      <div className="text-right md:hidden">
        <span className="text-xs font-normal text-[#9CA3AF] leading-[1.33]">{updatedAt}</span>
      </div>
    </MainColumnCard>
  );
}
