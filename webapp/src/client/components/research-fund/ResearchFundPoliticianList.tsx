"use client";
import "client-only";
import Link from "next/link";
import type { ResearchFundPartyPoliticianView } from "@/server/contexts/research-fund/domain/models/research-fund-party-summary";

interface Props {
  politicians: ResearchFundPartyPoliticianView[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  financialYear: number;
}

/**
 * A-6 の議員リスト。行が「一覧」と「グラフの絞り込み」を兼ね、詳細ボタンで議員ページに遷移する。
 *
 * 並びは当選期順で固定（ソート機能は付けない）。準備中の議員も隠さず、グレーで表示する。
 * 行全体とボタンを入れ子にすると操作が曖昧になるので、行の選択ボタンと詳細リンクは横に並べる。
 */
export default function ResearchFundPoliticianList({
  politicians,
  selectedSlug,
  onSelect,
  financialYear,
}: Props) {
  return (
    <ul className="flex flex-col border-t border-[#D5DBE1]">
      {politicians.map((politician) => {
        const selected = politician.slug === selectedSlug;
        return (
          <li
            key={politician.slug}
            className={`flex items-center gap-2 border-b border-[#D5DBE1] pr-2 transition-colors sm:pr-4 ${
              selected ? "bg-[#F3F7F6]" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(politician.slug)}
              aria-pressed={selected}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-4 pl-2 text-left hover:bg-black/[0.03] sm:pl-4"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  selected ? "bg-black" : "bg-transparent"
                }`}
              />
              <span
                className={`min-w-0 flex-1 truncate text-[15px] font-bold ${
                  politician.ready ? "text-gray-800" : "text-[#9CA3AF]"
                }`}
              >
                {politician.name}
              </span>
              <span
                className={`w-[120px] flex-shrink-0 text-right text-sm font-bold tabular-nums sm:w-[160px] sm:text-base ${
                  politician.ready ? "text-[#DC2626]" : "text-[#9CA3AF]"
                }`}
              >
                {politician.ready ? (
                  <>
                    -{politician.kpi.spent.toLocaleString("ja-JP")}
                    <span className="ml-0.5 text-xs font-normal text-[#4B5563]">円</span>
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span className="hidden w-[200px] flex-shrink-0 text-sm text-[#6A7383] lg:block">
                {politician.statusLabel}
              </span>
            </button>

            {politician.ready ? (
              <Link
                href={`/p/${encodeURIComponent(politician.slug)}/${financialYear}`}
                className="inline-flex h-10 flex-shrink-0 items-center justify-center rounded-md border border-gray-800 bg-white px-3 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 sm:px-5"
              >
                詳細
                <span className="hidden sm:inline">を見る</span>
              </Link>
            ) : (
              // 準備中の議員には遷移先が無い。列幅を揃えるため、公開状況を出す枠だけ残す。
              <span className="w-[52px] flex-shrink-0 text-right text-sm text-[#9CA3AF] sm:w-[92px]">
                <span className="lg:hidden">準備中</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
