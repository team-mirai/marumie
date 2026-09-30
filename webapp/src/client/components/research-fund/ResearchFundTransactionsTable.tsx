"use client";
import "client-only";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ReceiptModal from "@/client/components/research-fund/ReceiptModal";
import ResearchFundAmount from "@/client/components/research-fund/ResearchFundAmount";
import ResearchFundCategoryFilter from "@/client/components/research-fund/ResearchFundCategoryFilter";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import ResearchFundCsvDownloadLink from "@/client/components/research-fund/ResearchFundCsvDownloadLink";
import ResearchFundReceiptPill from "@/client/components/research-fund/ResearchFundReceiptPill";
import {
  filterResearchFundExpenses,
  formatResearchFundDate,
  paginateResearchFundExpenses,
  researchFundCategoryOptions,
  researchFundPagerItems,
  researchFundTransactionsHref,
  researchFundTransactionsSummary,
  resolveResearchFundCategories,
  sortResearchFundExpenses,
  sumResearchFundTransactions,
  toggleAmountSort,
  toggleDateSort,
  type ResearchFundTransactionSort,
  type ResearchFundTransactionsQuery,
} from "@/client/lib/research-fund-transactions";
import type { ResearchFundExpenseView } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import { RESEARCH_FUND_RECEIPTS_PUBLISHED } from "@/server/contexts/research-fund/domain/models/research-fund-receipt-publication";

interface Props {
  slug: string;
  financialYear: number;
  /** 日付の新しい順・同一注文の行が隣り合う並び（buildExpenseViews の出力） */
  expenses: ResearchFundExpenseView[];
  /** URL で指定された表示状態（parseResearchFundTransactionsQuery の出力） */
  query: ResearchFundTransactionsQuery;
}

/** SP（≤760px）ではヘッダー行の代わりに並び替えタブと絞り込みボタンを出し、1行を縦積みにする。 */
const ROW_GRID = "min-[761px]:grid-cols-[140px_200px_1fr_180px]";

/** SP の並び替えタブ。政治団体の全件ページ（TransactionTableMobileHeader）と同じ見た目。金額順は入金・出金を区別せず額の大きさで並べる。 */
const MOBILE_SORT_TABS: { id: ResearchFundTransactionSort; label: string }[] = [
  { id: "new", label: "新しい順" },
  { id: "old", label: "古い順" },
  { id: "amountDesc", label: "金額が多い順" },
  { id: "amountAsc", label: "金額が少ない順" },
];

/** カテゴリー絞り込みを開くボタン。絞り込み中は件数を出す。 */
function CategoryFilterButton({
  count,
  expanded,
  onClick,
}: {
  count: number;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="カテゴリーで絞り込む"
      aria-expanded={expanded}
      className={`inline-flex h-6 min-w-6 flex-shrink-0 cursor-pointer items-center justify-center gap-[3px] rounded-[6px] text-[11px] font-bold text-[#238778] ${
        count > 0 ? "bg-[#E2F6F3] px-1.5" : ""
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
      {count > 0 && count}
    </button>
  );
}

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
 * 1議員・1年度の公開中の出入金（支給と支出）は数百件なので、全件をサーバーで読み込んだうえで
 * 並び替え・絞り込み・ページングをクライアントで行う。領収書を公開している間は、領収書のある行の「領収書」ピルからモーダルで原本を見られる。
 *
 * 並び順・絞り込み・ページは URL（`categories` / `sort` / `order` / `page`）で持ち、操作のたびに URL を書き換える。
 * 各行のカテゴリーのピルは、そのカテゴリー1つで絞り込んだ URL へのリンクにする。
 */
export default function ResearchFundTransactionsTable({
  slug,
  financialYear,
  expenses,
  query,
}: Props) {
  const router = useRouter();
  const [openFilter, setOpenFilter] = useState<"pc" | "sp" | null>(null);
  const [receipt, setReceipt] = useState<ResearchFundExpenseView | null>(null);

  const { sort } = query;
  const options = useMemo(() => researchFundCategoryOptions(expenses), [expenses]);
  // 存在しないカテゴリーの指定は無視する（件数バッジ・絞り込み中の表示にも数えない）。
  const categories = useMemo(
    () => resolveResearchFundCategories(query.categories, options),
    [query.categories, options],
  );
  const filtered = useMemo(
    () => sortResearchFundExpenses(filterResearchFundExpenses(expenses, categories), sort),
    [expenses, categories, sort],
  );
  const current = paginateResearchFundExpenses(filtered, query.page);
  const pagerItems = researchFundPagerItems(current.page, current.totalPages);
  const totals = sumResearchFundTransactions(filtered);

  const hrefFor = (next: Partial<ResearchFundTransactionsQuery>) =>
    researchFundTransactionsHref(slug, financialYear, { categories, sort, page: 1, ...next });

  const navigate = (next: Partial<ResearchFundTransactionsQuery>) =>
    router.push(hrefFor(next), { scroll: false });

  const changeSort = (next: ResearchFundTransactionSort) => navigate({ sort: next });

  const toggleFilter = (at: "pc" | "sp") => setOpenFilter((open) => (open === at ? null : at));

  const applyCategories = (next: string[]) => {
    setOpenFilter(null);
    navigate({ categories: next });
  };

  const goToPage = (next: number) => {
    navigate({ page: next });
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="relative flex items-center gap-4 min-[761px]:hidden">
          <fieldset className="m-0 flex min-w-0 flex-1 gap-6 overflow-x-auto border-0 p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <legend className="sr-only">並び順</legend>
            {MOBILE_SORT_TABS.map((tab) => {
              const isActive = sort === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeSort(tab.id)}
                  aria-pressed={isActive}
                  className="relative flex cursor-pointer touch-manipulation flex-col items-center justify-center whitespace-nowrap px-0 py-2"
                >
                  <span
                    className={`text-sm font-bold leading-[1.2857142857142858em] ${
                      isActive ? "text-[#2AA693]" : "text-[#9CA3AF]"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-[#2AA693]" />
                  )}
                </button>
              );
            })}
          </fieldset>
          <CategoryFilterButton
            count={categories.length}
            expanded={openFilter === "sp"}
            onClick={() => toggleFilter("sp")}
          />
          {openFilter === "sp" && (
            <ResearchFundCategoryFilter
              options={options}
              selected={categories}
              onCancel={() => setOpenFilter(null)}
              onApply={applyCategories}
              align="right"
            />
          )}
        </div>
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
            <CategoryFilterButton
              count={categories.length}
              expanded={openFilter === "pc"}
              onClick={() => toggleFilter("pc")}
            />
            {openFilter === "pc" && (
              <ResearchFundCategoryFilter
                options={options}
                selected={categories}
                onCancel={() => setOpenFilter(null)}
                onApply={applyCategories}
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
            該当する出入金はありません
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
              <div className="order-3 flex flex-wrap items-center gap-2 min-[761px]:order-none min-[761px]:pl-4">
                <ResearchFundCategoryPill
                  category={row.detailed}
                  href={hrefFor({ categories: [row.accountKey] })}
                />
                {RESEARCH_FUND_RECEIPTS_PUBLISHED && row.hasReceipt && (
                  <span className="min-[761px]:hidden">
                    <ResearchFundReceiptPill onClick={() => setReceipt(row)} />
                  </span>
                )}
              </div>
              <div className="order-2 flex items-baseline justify-between gap-3 min-[761px]:order-none min-[761px]:block min-[761px]:py-3">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 min-[761px]:text-base">
                    {row.description}
                  </span>
                  {RESEARCH_FUND_RECEIPTS_PUBLISHED && row.hasReceipt && (
                    <span className="hidden min-[761px]:inline-flex">
                      <ResearchFundReceiptPill onClick={() => setReceipt(row)} />
                    </span>
                  )}
                </span>
                <ResearchFundAmount row={row} className="text-base min-[761px]:hidden" />
                {row.note && (
                  <p className="mt-0.5 hidden text-xs leading-relaxed text-[#6B7280] min-[761px]:block">
                    {row.note}
                  </p>
                )}
              </div>
              <div className="hidden pr-6 text-right min-[761px]:block">
                <ResearchFundAmount row={row} className="text-xl" />
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
          income: totals.income,
          expense: totals.expense,
          filtered: categories.length > 0,
        })}
      </p>

      {receipt && (
        <ReceiptModal
          expense={receipt}
          category={receipt.detailed}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
