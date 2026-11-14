"use client";
import "client-only";
import { useState } from "react";
import SankeyChart from "@/client/components/top-page/features/charts/SankeyChart";
import PinchZoom from "@/client/components/ui/PinchZoom";

import type { SankeyData } from "@/types/sankey";

interface CashFlowSectionProps {
  political?: SankeyData | null;
  friendly?: SankeyData | null;
}

const TABS = [
  { key: "friendly", label: "詳細の区分" },
  { key: "political", label: "法律上の区分" },
] as const;

/**
 * 見出しカードの中の収支の流れ。区分（詳細の区分／法律上の区分）のタブとサンキー図。
 * SP では横スクロールさせず全体を表示し、ピンチで拡大できるようにする。
 */
export default function CashFlowSection({ political, friendly }: CashFlowSectionProps) {
  const [activeTab, setActiveTab] = useState<"political" | "friendly">("friendly");

  const currentData = activeTab === "political" ? political : friendly;

  return (
    <div id="cash-flow" className="scroll-mt-24 pt-2 -mt-4">
      <div
        role="tablist"
        aria-label="区分の切り替え"
        className="mb-7 flex gap-7 border-b border-[#DCE4E1]"
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.key)}
              className={`relative -mb-px h-10 cursor-pointer border-b-[3px] text-[15px] font-bold transition-colors ${
                selected
                  ? "border-black text-black"
                  : "border-transparent text-[#5B6470] hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {currentData ? (
        <>
          <PinchZoom>
            <SankeyChart data={currentData} />
          </PinchZoom>
          <p className="mt-2 text-right text-[12px] font-semibold text-[#6B7280] md:hidden">
            ピンチで拡大できます
          </p>
        </>
      ) : (
        <div className="text-gray-500">サンキー図データが取得できませんでした</div>
      )}
    </div>
  );
}
