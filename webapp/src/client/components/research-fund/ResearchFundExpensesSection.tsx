"use client";
import "client-only";
import Image from "next/image";
import { useMemo, useState } from "react";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import CategoryModeTabs from "@/client/components/research-fund/CategoryModeTabs";
import ReceiptModal from "@/client/components/research-fund/ReceiptModal";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import ResearchFundCsvDownloadLink from "@/client/components/research-fund/ResearchFundCsvDownloadLink";
import type {
  ResearchFundCategoryMode,
  ResearchFundExpenseView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

const ROW_GRID = "md:grid-cols-[140px_200px_1fr_180px]";

/**
 * B-4 すべての支出。
 *
 * 4月だけで99件になる月があるため、月切り替えを必須にしている。
 */
export default function ResearchFundExpensesSection({ data, updatedAt }: Props) {
  const months = useMemo(
    () => [...new Set(data.expenses.map((expense) => expense.month))].sort(),
    [data.expenses],
  );
  const [month, setMonth] = useState(() => months[months.length - 1] ?? "");
  const [mode, setMode] = useState<ResearchFundCategoryMode>("detailed");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ResearchFundExpenseView | null>(null);

  const rows = useMemo(
    () => data.expenses.filter((expense) => expense.month === month),
    [data.expenses, month],
  );
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <MainColumnCard id="transactions">
      <CardHeader
        icon={<Image src="/icons/icon-cashback.svg" alt="Cash move icon" width={30} height={30} />}
        organizationName={data.politician.name}
        title="すべての支出"
        updatedAt={updatedAt}
        subtitle="金額にかかわらず、すべての支出を1件ずつ、領収書つきで公開しています"
      />

      {months.length === 0 ? (
        <p className="text-gray-500">公開中の支出はまだありません</p>
      ) : (
        <>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">月の切り替え</legend>
            {months.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMonth(value);
                  setOpenNoteId(null);
                }}
                aria-pressed={value === month}
                className={`cursor-pointer rounded-full border px-4 py-1 text-sm font-bold transition-colors ${
                  value === month
                    ? "border-[#238778] bg-[#238778] text-white"
                    : "border-[#D1D5DB] bg-white text-[#4B5563] hover:bg-[#F9FAFB]"
                }`}
              >
                {Number(value.slice(5, 7))}月
              </button>
            ))}
          </fieldset>

          <div>
            <CategoryModeTabs value={mode} onChange={setMode} />

            <div
              className={`hidden border-b border-[#D5DBE1] pb-3 text-sm font-bold text-gray-800 md:grid ${ROW_GRID}`}
            >
              <div className="px-4">日付</div>
              <div className="pl-4">カテゴリー</div>
              <div>項目</div>
              <div className="pr-6 text-right">金額</div>
            </div>

            {rows.map((row) => {
              const category = row[mode];
              return (
                <div key={row.id} className="border-b border-[#D5DBE1] py-3 md:py-0">
                  <div className={`grid grid-cols-1 gap-1 md:items-center md:gap-0 ${ROW_GRID}`}>
                    <div className="text-xs font-bold text-[#4B5563] md:px-4 md:py-5 md:text-base md:text-gray-800">
                      {row.date.replace(/-/g, ".")}
                    </div>
                    <div className="md:pl-4">
                      <ResearchFundCategoryPill category={category} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 md:text-base">
                        {row.description}
                      </span>
                      {row.note && (
                        <button
                          type="button"
                          onClick={() => setOpenNoteId(openNoteId === row.id ? null : row.id)}
                          aria-expanded={openNoteId === row.id}
                          aria-label={`${row.description}の特記事項`}
                          className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[#9CA3AF] text-[11px] font-bold text-[#6B7280] hover:bg-[#F3F4F6]"
                        >
                          i
                        </button>
                      )}
                      {row.hasReceipt && (
                        <button
                          type="button"
                          onClick={() => setReceipt(row)}
                          className="inline-flex h-[22px] cursor-pointer items-center rounded-full border border-[#238778] px-2.5 text-xs font-bold text-[#238778] hover:bg-[#E2F6F3]"
                        >
                          領収書
                        </button>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-base font-bold text-[#DC2626] md:pr-6 md:text-right md:text-xl">
                      -{row.amount.toLocaleString("ja-JP")}
                      <span className="text-xs font-normal text-[#4B5563]"> 円</span>
                    </div>
                  </div>
                  {openNoteId === row.id && row.note && (
                    <p className="pb-3 text-xs leading-relaxed text-[#6B7280] md:pb-4">
                      {row.note}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="mt-5 flex flex-col items-end gap-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="hidden md:block" />
              <p className="w-full text-center text-sm font-medium text-[#6A7383] md:w-auto">
                {Number(month.slice(5, 7))}月の支出 {rows.length}件・合計{" "}
                {total.toLocaleString("ja-JP")}円
              </p>
              {/* 月切り替えとは独立に、その年度の公開中の支出を全件出す */}
              <div className="md:flex md:justify-end">
                <ResearchFundCsvDownloadLink
                  slug={data.politician.slug}
                  financialYear={data.financialYear}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {receipt && (
        <ReceiptModal expense={receipt} category={receipt[mode]} onClose={() => setReceipt(null)} />
      )}
    </MainColumnCard>
  );
}
