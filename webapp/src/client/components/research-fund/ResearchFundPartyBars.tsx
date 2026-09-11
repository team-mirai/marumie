"use client";
import "client-only";
import type { ResearchFundBarView } from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";

/**
 * A-6 の横棒グラフ。円グラフは使わない（デザイン仕様 §5）。
 * 未使用分は渡されない前提で、最大の費目を全幅として相対比較する。
 */
export default function ResearchFundPartyBars({ bars }: { bars: ResearchFundBarView[] }) {
  if (bars.length === 0) {
    return <p className="text-sm text-gray-500">公開中の調査研究費のデータがありません</p>;
  }

  const max = Math.max(...bars.map((bar) => bar.amount));
  const total = bars.reduce((sum, bar) => sum + bar.amount, 0);

  return (
    <ul className="grid gap-3">
      {bars.map((bar) => (
        <li key={bar.key} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold text-gray-800">{bar.label}</span>
            <span className="whitespace-nowrap text-[13px] text-[#4B5563] tabular-nums">
              {bar.amount.toLocaleString("ja-JP")}円
              <span className="ml-1.5 text-[#9CA3AF]">
                {total > 0 ? `${Math.round((bar.amount / total) * 100)}%` : "0%"}
              </span>
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[#F3F4F6]"
            role="img"
            aria-label={`${bar.label} ${bar.amount.toLocaleString("ja-JP")}円`}
          >
            <div
              className="h-full rounded-full bg-[#2AA693]"
              style={{ width: `${max > 0 ? (bar.amount / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
