"use client";
import "client-only";

import { useMemo, useState } from "react";
import ResearchFundCategoryFilter from "@/client/components/research-fund/ResearchFundCategoryFilter";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import ResearchFundCsvDownloadLink from "@/client/components/research-fund/ResearchFundCsvDownloadLink";
import {
  filterResearchFundExpenses,
  formatResearchFundDate,
  paginateResearchFundExpenses,
  researchFundCategoryOptions,
  researchFundPagerItems,
  researchFundTransactionsSummary,
  sortResearchFundExpenses,
  toggleAmountSort,
  toggleDateSort,
  type ResearchFundTransactionSort,
} from "@/client/lib/research-fund-transactions";
import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  slug: string;
  financialYear: number;
  /** 日付の新しい順・同一注文の行が隣り合う並び（buildExpenseViews の出力） */
  expenses: ResearchFundExpenseView[];
}

/** SP（≤760px）ではヘッダー行を隠し、1行を縦積みにする。 */
const ROW_GRID = "min-[761px]:grid-cols-[140px_200px_1fr_180px]";

function SortChevron({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${flipped ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PagerButton({
  children,
  onClick,
  disabled = false,
  current = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={current ? "page" : undefined}
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-[6px] border px-3 text-sm font-bold transition-colors ${
        current
          ? "border-[#238778] bg-[#238778] text-white"
          : "border-[#D1D5DB] bg-white text-[#1F2937] hover:bg-[#F9FAFB] disabled:cursor-default disabled:text-[#C4C9D1] disabled:hover:bg-white"
      } ${disabled ? "" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

/**
 * 調研費の「すべての出入金」全件ページの表。
 *
 * 1議員・1年度の公開中の支出は数百件なので、全件をサーバーで読み込んだうえで
 * 並び替え・絞り込み・ページングをクライアントで行う。
 */
export default function ResearchFundTransactionsTable({ slug, financialYear, expenses }: Props) {
  const [sort, setSort] = useState<ResearchFundTransactionSort>("new");
  const [categories, setCategories] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const options = useMemo(() => researchFundCategoryOptions(expenses), [expenses]);
  const filtered = useMemo(
    () => sortResearchFundExpenses(filterResearchFundExpenses(expenses, categories), sort),
    [expenses, categories, sort],
  );
  const current = paginateResearchFundExpenses(filtered, page);
  const pagerItems = researchFundPagerItems(current.page, current.totalPages);
  const amount = filtered.reduce((sum, row) => sum + row.amount, 0);

  const changeSort = (next: ResearchFundTransactionSort) => {
    setSort(next);
    setPage(1);
  };

  const goToPage = (next: number) => {
    setPage(next);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div
          className={`hidden h-12 items-center border-b border-[#D5DBE1] text-sm font-bold text-gray-800 min-[761px]:grid ${ROW_GRID}`}
        >
          <div className="flex items-center gap-1 px-4">
            日付
            <button
              type="button"
              onClick={() => changeSort(toggleDateSort(sort))}
              aria-label="日付で並び替え"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-[#238778]"
            >
              <SortChevron flipped={sort === "old"} />
            </button>
          </div>
          <div className="relative flex items-center gap-1 pl-4">
            カテゴリー
            <button
              type="button"
              onClick={() => setIsFilterOpen((open) => !open)}
              aria-label="カテゴリーで絞り込む"
              aria-expanded={isFilterOpen}
              className={`inline-flex h-6 min-w-6 cursor-pointer items-center justify-center gap-[3px] rounded-[6px] text-[11px] font-bold text-[#238778] ${
                categories.length > 0 ? "bg-[#E2F6F3] px-1.5" : ""
              }`}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              {categories.length > 0 && categories.length}
            </button>
            {isFilterOpen && (
              <ResearchFundCategoryFilter
                options={options}
                selected={categories}
                onCancel={() => setIsFilterOpen(false)}
                onApply={(next) => {
                  setCategories(next);
                  setIsFilterOpen(false);
                  setPage(1);
                }}
              />
            )}
          </div>
          <div className="tracking-[0.071em]">項目</div>
          <div className="flex items-center justify-end gap-0.5 pr-6">
            金額
            <button
              type="button"
              onClick={() => changeSort(toggleAmountSort(sort))}
              aria-label="金額で並び替え"
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-[#238778]"
            >
              <SortChevron flipped={sort === "amountAsc"} />
            </button>
          </div>
        </div>

        {current.rows.length === 0 ? (
          <p role="status" className="py-6 text-center text-gray-500">
            該当する支出はありません
          </p>
        ) : (
          current.rows.map((row) => (
            <div
              key={row.id}
              className={`grid grid-cols-1 gap-1 border-b border-[#D5DBE1] py-3 min-[761px]:min-h-16 min-[761px]:items-center min-[761px]:gap-0 min-[761px]:py-0 ${ROW_GRID}`}
            >
              <div className="text-xs text-[#4B5563] min-[761px]:px-4 min-[761px]:text-base min-[761px]:font-bold min-[761px]:text-gray-800">
                {formatResearchFundDate(row.date)}
              </div>
              <div className="order-3 min-[761px]:order-none min-[761px]:pl-4">
                <ResearchFundCategoryPill category={row.detailed} />
              </div>
              <div className="order-2 flex items-baseline justify-between gap-3 min-[761px]:order-none min-[761px]:block min-[761px]:py-3">
                <span className="text-sm font-bold text-gray-800 min-[761px]:text-base">
                  {row.description}
                </span>
                <span className="whitespace-nowrap text-base font-bold text-[#DC2626] min-[761px]:hidden">
                  -{row.amount.toLocaleString("ja-JP")}
                  <span className="text-xs font-normal text-[#4B5563]"> 円</span>
                </span>
                {row.note && (
                  <p className="mt-0.5 hidden text-xs leading-relaxed text-[#6B7280] min-[761px]:block">
                    {row.note}
                  </p>
                )}
              </div>
              <div className="hidden whitespace-nowrap pr-6 text-right text-xl font-bold text-[#DC2626] min-[761px]:block">
                -{row.amount.toLocaleString("ja-JP")}
                <span className="text-xs font-normal text-[#4B5563]"> 円</span>
              </div>
              {row.note && (
                <p className="order-4 text-xs leading-relaxed text-[#6B7280] min-[761px]:hidden">
                  {row.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col items-center gap-3 min-[761px]:grid min-[761px]:grid-cols-[1fr_auto_1fr]">
        <div className="hidden min-[761px]:block" />
        <nav aria-label="ページ" className="flex flex-wrap items-center justify-center gap-1.5">
          <PagerButton
            onClick={() => goToPage(current.page - 1)}
            disabled={current.page === 1}
            ariaLabel="前のページ"
          >
            前へ
          </PagerButton>
          {pagerItems.map((item, index) =>
            item === "…" ? (
              <span
                // 「…」は現在ページの前後に最大1つずつしか出ない
                key={
                  index < pagerItems.indexOf(current.page) ? "ellipsis-before" : "ellipsis-after"
                }
                className="inline-flex h-10 min-w-6 items-center justify-center text-sm text-[#9CA3AF]"
              >
                …
              </span>
            ) : (
              <PagerButton
                key={item}
                onClick={() => goToPage(item)}
                current={item === current.page}
                ariaLabel={`ページ ${item}`}
              >
                {item}
              </PagerButton>
            ),
          )}
          <PagerButton
            onClick={() => goToPage(current.page + 1)}
            disabled={current.page === current.totalPages}
            ariaLabel="次のページ"
          >
            次へ
          </PagerButton>
        </nav>
        <div className="min-[761px]:flex min-[761px]:justify-end">
          <ResearchFundCsvDownloadLink
            slug={slug}
            financialYear={financialYear}
            label="出入金履歴をCSVでダウンロード"
            className="whitespace-nowrap hover:bg-[#F9FAFB]"
          />
        </div>
      </div>

      <p
        role="status"
        className="text-center text-sm leading-5 font-medium tracking-[0.005em] text-[#6A7383]"
      >
        {researchFundTransactionsSummary({
          from: current.from,
          to: current.to,
          total: filtered.length,
          amount,
          filtered: categories.length > 0,
        })}
      </p>
    </div>
  );
}
