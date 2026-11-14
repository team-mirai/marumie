"use client";
import "client-only";
import { type KeyboardEvent, useRef, useState } from "react";
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

type TabKey = (typeof TABS)[number]["key"];

const PANEL_ID = "cash-flow-panel";
const tabId = (key: TabKey) => `cash-flow-tab-${key}`;

/**
 * 見出しカードの中の収支の流れ。区分（詳細の区分／法律上の区分）のタブとサンキー図。
 * SP では横スクロールさせず全体を表示し、ピンチで拡大できるようにする。
 */
export default function CashFlowSection({ political, friendly }: CashFlowSectionProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("friendly");
  const tabRefs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  const currentData = activeTab === "political" ? political : friendly;

  // 左右の矢印キーで隣のタブへ移って選ぶ（端では反対側へ回り込む）
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = TABS[(index + step + TABS.length) % TABS.length].key;
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

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
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              id={tabId(tab.key)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={handleKeyDown}
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

      <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(activeTab)}>
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
    </div>
  );
}
