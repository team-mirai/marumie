"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CardHeader from "@/client/components/layout/CardHeader";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import ReceiptModal from "@/client/components/research-fund/ReceiptModal";
import ResearchFundAmount from "@/client/components/research-fund/ResearchFundAmount";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import { useResearchFundCrossLink } from "@/client/components/research-fund/ResearchFundCrossLink";
import ResearchFundReceiptPill from "@/client/components/research-fund/ResearchFundReceiptPill";
import {
  formatResearchFundDate,
  RESEARCH_FUND_PREVIEW_COUNT,
  revealResearchFundGroupRows,
} from "@/client/lib/research-fund-transactions";
import type {
  ResearchFundExpenseView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  updatedAt: string;
}

/** SP（≤760px）ではヘッダー行を隠し、1行を縦積みにする（全件ページの表と同じ）。 */
const ROW_GRID = "min-[761px]:grid-cols-[140px_200px_1fr_180px]";
/** 用途カードの「N件」から飛んできた行を目立たせておく時間 */
const ROWS_FLASH_MS = 2500;
/** 固定ヘッダーに隠れないよう、明細の先頭行へ飛ぶときに上を空ける量 */
const ROWS_SCROLL_OFFSET = 140;

function StarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 6.6L21 9l-5.2 4.3L17.5 21 12 17.3 6.5 21l1.7-7.7L3 9l6.6-.4z" />
    </svg>
  );
}

/**
 * B-4 すべての出入金。
 *
 * 支給（入金）と支出（出金）を日付の新しい順に混ぜ、先頭6件だけを出し、続きは「もっと見る」から全件ページで見る。
 * 用途カードに紐づく行は「★ 用途N」から該当カードへ飛べ、カードの「N件」からは該当行まで一覧を広げる。
 * 領収書のある行は「領収書」ピルから原本をモーダルで見られる。
 */
export default function ResearchFundExpensesSection({ data, updatedAt }: Props) {
  const { rowsRequest, showCard } = useResearchFundCrossLink();
  const [shown, setShown] = useState(RESEARCH_FUND_PREVIEW_COUNT);
  const [flashedGroupId, setFlashedGroupId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ResearchFundExpenseView | null>(null);
  const scrollTargetId = useRef<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 「用途N」の番号は用途カードの並び順
  const groupNumbers = useMemo(
    () => new Map(data.groups.map((group, index) => [group.id, index + 1])),
    [data.groups],
  );

  useEffect(() => {
    if (!rowsRequest) return;
    const reveal = revealResearchFundGroupRows(data.expenses, rowsRequest.groupId);
    if (!reveal) return;
    setShown((current) => Math.max(current, reveal.minShown));
    setFlashedGroupId(rowsRequest.groupId);
    scrollTargetId.current = reveal.firstId;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashedGroupId(null), ROWS_FLASH_MS);
  }, [rowsRequest, data.expenses]);

  // 一覧を広げた描画のあとで、先頭行へスクロールする。
  useEffect(() => {
    const id = scrollTargetId.current;
    if (!id) return;
    scrollTargetId.current = null;
    const row = document.getElementById(`tx-${id}`);
    if (!row) return;
    window.scrollTo({
      top: row.getBoundingClientRect().top + window.scrollY - ROWS_SCROLL_OFFSET,
      behavior: "smooth",
    });
  });

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const rows = data.expenses.slice(0, shown);
  const hasMore = data.expenses.length > rows.length;

  const groupLink = (row: ResearchFundExpenseView) => {
    const number = row.groupId ? groupNumbers.get(row.groupId) : undefined;
    if (!row.groupId || number === undefined) return null;
    const groupId = row.groupId;
    return (
      <button
        type="button"
        onClick={() => showCard(groupId)}
        aria-label={`用途${number}を見る`}
        className="inline-flex h-5 shrink-0 cursor-pointer items-center gap-[3px] whitespace-nowrap rounded-full bg-[#E2F6F3] px-2 text-[11px] font-bold text-[#238778]"
      >
        <StarIcon />
        用途{number}
      </button>
    );
  };

  // 項目名の右（SP ではカテゴリーの右）に並べるピル。領収書 → 用途N の順。
  const badges = (row: ResearchFundExpenseView) => {
    const link = groupLink(row);
    if (!row.hasReceipt && !link) return null;
    return (
      <>
        {row.hasReceipt && <ResearchFundReceiptPill onClick={() => setReceipt(row)} />}
        {link}
      </>
    );
  };

  return (
    <MainColumnCard id="transactions">
      <CardHeader
        icon={<Image src="/icons/icon-cashback.svg" alt="Cash move icon" width={30} height={30} />}
        organizationName={`${data.politician.name}・調研費`}
        title="すべての出入金"
        updatedAt={updatedAt}
        subtitle="これまでにデータ連携された出入金の明細"
      />

      {rows.length === 0 ? (
        <p className="text-gray-500">公開中の出入金はまだありません</p>
      ) : (
        <div className="relative">
          <div
            className={`hidden h-12 items-center border-b border-[#D5DBE1] text-sm font-bold text-gray-800 min-[761px]:grid ${ROW_GRID}`}
          >
            <div className="px-4">日付</div>
            <div className="pl-4">カテゴリー</div>
            <div className="tracking-[0.071em]">項目</div>
            <div className="pr-6 text-right">金額</div>
          </div>

          {rows.map((row) => {
            const rowBadges = badges(row);
            return (
              <div
                key={row.id}
                id={`tx-${row.id}`}
                data-flashed={flashedGroupId !== null && row.groupId === flashedGroupId}
                className={`grid grid-cols-1 gap-1 border-b border-[#D5DBE1] py-3 transition-colors duration-400 data-[flashed=true]:bg-[#E2F6F3] min-[761px]:min-h-16 min-[761px]:items-center min-[761px]:gap-0 min-[761px]:py-0 ${ROW_GRID}`}
              >
                <div className="text-xs text-[#4B5563] min-[761px]:px-4 min-[761px]:text-base min-[761px]:font-bold min-[761px]:text-gray-800">
                  {formatResearchFundDate(row.date)}
                </div>
                <div className="order-3 flex flex-wrap items-center gap-2 min-[761px]:order-none min-[761px]:pl-4">
                  <ResearchFundCategoryPill category={row.detailed} />
                  {rowBadges && (
                    <span className="flex items-center gap-2 min-[761px]:hidden">{rowBadges}</span>
                  )}
                </div>
                <div className="order-2 flex items-baseline justify-between gap-3 min-[761px]:order-none min-[761px]:block min-[761px]:py-3">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 min-[761px]:text-base">
                      {row.description}
                    </span>
                    {rowBadges && (
                      <span className="hidden items-center gap-2 min-[761px]:inline-flex">
                        {rowBadges}
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
            );
          })}

          {/* 白グラデのフェードは先頭6件のときだけ。用途カードから広げたあとは、該当行を隠さないようボタンを行の下に置く */}
          {hasMore && (
            <div
              className={
                shown > RESEARCH_FUND_PREVIEW_COUNT
                  ? "flex justify-center pt-6"
                  : "pointer-events-none absolute inset-x-0 bottom-0 flex h-[108px] items-end justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.3)_34%,rgba(255,255,255,0.8)_66%,#fff_90%)] pb-[5px]"
              }
            >
              <Link
                href={`/p/${data.politician.slug}/${data.financialYear}/transactions`}
                className="pointer-events-auto inline-flex h-12 w-[270px] items-center justify-center gap-2.5 rounded-[6px] border border-[#1F2937] bg-white px-6 py-2 text-base font-bold text-[#1F2937] transition-colors duration-150 hover:bg-[#F9FAFB]"
              >
                もっと見る
              </Link>
            </div>
          )}
        </div>
      )}

      {receipt && (
        <ReceiptModal
          expense={receipt}
          category={receipt.detailed}
          onClose={() => setReceipt(null)}
        />
      )}
    </MainColumnCard>
  );
}
