"use client";
import "client-only";
import { type ComponentProps, type KeyboardEvent, useRef, useState } from "react";
import SankeyChart from "@/client/components/top-page/features/charts/SankeyChart";
import PinchZoom from "@/client/components/ui/PinchZoom";

import type { SankeyData } from "@/types/sankey";

interface CashFlowSectionProps {
  political?: SankeyData | null;
  friendly?: SankeyData | null;
  /** ページ内リンクの飛び先。外側のカードが飛び先を持つときは渡さない */
  id?: string;
  /** サンキー図の読み上げ用のラベル・説明と見せ方。政治資金以外の図で差し替える */
  chart?: Pick<
    ComponentProps<typeof SankeyChart>,
    "ariaLabel" | "ariaDescription" | "compactEdgeLabels"
  >;
  /** 図のデータが無いときの文言 */
  emptyMessage?: string;
}

const TABS = [
  { key: "friendly", label: "詳細の区分" },
  { key: "political", label: "法律上の区分" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const PANEL_ID = "cash-flow-panel";
const tabId = (key: TabKey) => `cash-flow-tab-${key}`;

/**
 * 収支の流れの区分（詳細の区分／法律上の区分）のタブとサンキー図。政党ページでは見出しカードの中、議員ページでは収支の流れのカードの中に置く。
 * SP では横スクロールさせず全体を表示し、ピンチで拡大できるようにする。
 */
export default function CashFlowSection({
  political,
  friendly,
  id,
  chart,
  emptyMessage = "サンキー図データが取得できませんでした",
}: CashFlowSectionProps) {
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
    <div id={id} className={id ? "scroll-mt-24 pt-2 -mt-4" : undefined}>
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
              <SankeyChart data={currentData} {...chart} />
            </PinchZoom>
            <p className="mt-2 text-right text-[12px] font-semibold text-[#6B7280] md:hidden">
              ピンチで拡大できます
            </p>
          </>
        ) : (
          <div className="text-gray-500">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
