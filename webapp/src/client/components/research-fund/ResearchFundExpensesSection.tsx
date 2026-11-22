"use client";
import "client-only";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/client/components/layout/SectionCard";
import ReceiptModal from "@/client/components/research-fund/ReceiptModal";
import ResearchFundAmount from "@/client/components/research-fund/ResearchFundAmount";
import ResearchFundCategoryPill from "@/client/components/research-fund/ResearchFundCategoryPill";
import { useResearchFundCrossLink } from "@/client/components/research-fund/ResearchFundCrossLink";
import ResearchFundReceiptPill from "@/client/components/research-fund/ResearchFundReceiptPill";
import TransactionSortTabs from "@/client/components/transactions/TransactionSortTabs";
import {
  filterResearchFundGroupRows,
  formatResearchFundDate,
  formatResearchFundGroupNumber,
  RESEARCH_FUND_PREVIEW_COUNT,
  researchFundTransactionsHref,
  sortResearchFundExpenses,
} from "@/client/lib/research-fund-transactions";
import type { TransactionSort } from "@/client/lib/transaction-sort";
import type {
  ResearchFundExpenseView,
  ResearchFundPageData,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

interface Props {
  data: ResearchFundPageData;
  /** URL の slug の区間（プレビュー URL ならプレビュー用の文字列を含む）。全件ページへのリンクはこれを引き継ぐ */
  pathSlug: string;
  /** 見出しの上の小さな行（例: 「峰島侑也の調研費・2026年」） */
  eyebrow: string;
  updatedAt: string;
}

/**
 * SP（≤640px）ではヘッダー行を隠し、1行を縦積みにする（全件ページの表と同じ）。
 * 641〜760px は固定列を詰めて項目列の幅を残す。項目列は minmax(0,1fr) にし、中身が広くてもヘッダーと列がずれないようにする。
 */
const ROW_GRID =
  "min-[641px]:grid-cols-[128px_160px_minmax(0,1fr)_160px] min-[761px]:grid-cols-[140px_200px_minmax(0,1fr)_180px]";
/** 固定ヘッダーに隠れないよう、絞り込みの帯へ飛ぶときに上を空ける量（PC / SP） */
const FILTER_SCROLL_OFFSET = { pc: 110, sp: 96 };
/** なめらかなスクロールの途中で一覧の高さが変わってずれたときに、位置を合わせ直すまでの時間 */
const FILTER_SCROLL_SETTLE_MS = 900;

/** 用途の番号の前に置く栞の形（活用方針と主な用途の番号と同じ） */
function BookmarkIcon() {
  return (
    <svg
      width="11"
      height="13"
      viewBox="0 0 24 24"
      fill="#30BCA7"
      stroke="#30BCA7"
      strokeWidth="2.4"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-none"
    >
      <path d="M6.5 3.5h11v17l-5.5-3.9-5.5 3.9z" />
    </svg>
  );
}

/** 用途のラベル（栞＋「用途」＋2桁の番号）。明細の行と絞り込みの帯で使う */
const GROUP_LABEL =
  "inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#E2F6F3] pr-[9px] pl-[7px] text-[11px] font-bold text-[#238778]";

function GroupLabelContent({ number }: { number: number }) {
  return (
    <>
      <BookmarkIcon />
      用途
      <span className="font-num text-xs leading-none font-bold tabular-nums">
        {formatResearchFundGroupNumber(number)}
      </span>
    </>
  );
}

/** 「明細N件を見る」で用途を選んだときに一覧の上に出す帯。読み上げは常に置いておく status 領域が伝える */
function GroupFilterBand({
  number,
  title,
  count,
  onClear,
}: {
  number: number;
  title: string;
  count: number;
  onClear: () => void;
}) {
  return (
    <div
      id="tx-hlf"
      className="-my-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-[14px] bg-[#F4FBF9] py-3 pr-3 pl-3.5 min-[641px]:pl-4"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2.5">
        <span className={GROUP_LABEL}>
          <GroupLabelContent number={number} />
        </span>
        <span className="text-sm leading-normal font-bold text-gray-800">
          {title}の明細<b className="font-num mx-0.5 font-bold">{count}件</b>を表示中
        </span>
      </span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-800 bg-white px-3 text-[13px] leading-none font-bold text-gray-800 transition-colors duration-150 hover:bg-[#F3F4F6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F8472] min-[641px]:h-9 min-[641px]:px-3.5"
      >
        絞り込みを解除
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** 絞り込みの帯（無ければセクション）が固定ヘッダーに隠れずに見えるスクロール位置 */
function filterBandScrollTop(): number | null {
  const target = document.getElementById("tx-hlf") ?? document.getElementById("transactions");
  if (!target) return null;
  const offset = window.matchMedia("(max-width: 640px)").matches
    ? FILTER_SCROLL_OFFSET.sp
    : FILTER_SCROLL_OFFSET.pc;
  return target.getBoundingClientRect().top + window.scrollY - offset;
}

/**
 * すべての出入金。
 *
 * 支給（入金）と支出（出金）を日付の新しい順に混ぜ、先頭6件だけを出し、続きは「もっと見る」から全件ページで見る。
 * SP では表の上のタブで並び順（新しい順・古い順・支出が多い順・収入が多い順）を変えられる（用途で絞り込み中も絞り込んだまま並べ替える）。
 * 用途カードに紐づく行は「用途NN」から該当カードへ飛べ、カードの「明細N件を見る」からはその用途の明細だけに絞り込む
 * （日付が離れていても全件を並べ、一覧の上に絞り込みの帯と解除ボタンを出す）。
 * 領収書を公開している間は、領収書のある行の「領収書」ピルから公開用の版（個人情報を黒塗りした版）をモーダルで見られる。
 */
export default function ResearchFundExpensesSection({ data, pathSlug, eyebrow, updatedAt }: Props) {
  const { rowsFilter, showCard, clearRowsFilter } = useResearchFundCrossLink();
  const [sort, setSort] = useState<TransactionSort>("new");
  // 絞り込みを解除したら、絞り込み中に並べ替えていても絞り込む前の並び順に戻す
  const [sortBeforeFilter, setSortBeforeFilter] = useState<TransactionSort | null>(null);
  const filterActive = rowsFilter !== null;
  if (filterActive && sortBeforeFilter === null) {
    setSortBeforeFilter(sort);
  } else if (!filterActive && sortBeforeFilter !== null) {
    setSort(sortBeforeFilter);
    setSortBeforeFilter(null);
  }
  const [receipt, setReceipt] = useState<ResearchFundExpenseView | null>(null);

  // 「用途N」の番号は用途カードの並び順
  const groupNumbers = useMemo(
    () => new Map(data.groups.map((group, index) => [group.id, index + 1])),
    [data.groups],
  );

  const expenses = useMemo(
    () => sortResearchFundExpenses(data.expenses, sort),
    [data.expenses, sort],
  );

  const filterGroup = rowsFilter
    ? data.groups.find((group) => group.id === rowsFilter.groupId)
    : undefined;
  const filterNumber = filterGroup ? groupNumbers.get(filterGroup.id) : undefined;

  // 「明細N件を見る」を押したら、絞り込んだ描画のあとで帯の位置へ移動する。
  // 一覧を広げずに絞り込むので、セクションが縦に長くなりすぎてフェードインが始まらない（真っ白のまま）ことはないが、
  // 念のためセクションのフェードインは済ませてから移動する。
  useEffect(() => {
    if (!rowsFilter) return;
    document.getElementById("transactions")?.classList.add("is-in");
    const top = filterBandScrollTop();
    if (top === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    // スクロール中に上の要素の高さが変わって位置がずれたら合わせ直す。
    // それまでに利用者が操作したら（スクロールや「用途NN」で用途カードへ移動するなど）、その移動を優先して合わせ直さない。
    const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const cancel = () => {
      clearTimeout(timer);
      for (const type of userEvents) window.removeEventListener(type, cancel);
    };
    const timer = setTimeout(() => {
      cancel();
      const settled = filterBandScrollTop();
      if (settled !== null && Math.abs(window.scrollY - settled) > 24) {
        window.scrollTo({ top: settled, behavior: "auto" });
      }
    }, FILTER_SCROLL_SETTLE_MS);
    for (const type of userEvents) window.addEventListener(type, cancel, { passive: true });
    return cancel;
  }, [rowsFilter]);

  // 用途で絞り込み中は、その用途の明細を全件並べる（「もっと見る」で隠さない）
  const filtering = filterGroup !== undefined && filterNumber !== undefined;
  const rows = filtering
    ? filterResearchFundGroupRows(expenses, filterGroup.id)
    : expenses.slice(0, RESEARCH_FUND_PREVIEW_COUNT);
  const hasMore = !filtering && expenses.length > rows.length;

  const groupLink = (row: ResearchFundExpenseView) => {
    const number = row.groupId ? groupNumbers.get(row.groupId) : undefined;
    if (!row.groupId || number === undefined) return null;
    const groupId = row.groupId;
    return (
      <button
        type="button"
        onClick={() => showCard(groupId)}
        aria-label={`用途${number}を見る`}
        className={`${GROUP_LABEL} cursor-pointer`}
      >
        <GroupLabelContent number={number} />
      </button>
    );
  };

  // 項目名の右（SP ではカテゴリーの右）に並べるピル。領収書 → 用途N の順。
  const badges = (row: ResearchFundExpenseView) => {
    const link = groupLink(row);
    if (!row.hasReceipt && !link) return null;
    return (
      <>
        {row.hasReceipt && (
          <ResearchFundReceiptPill ready={row.receiptReady} onClick={() => setReceipt(row)} />
        )}
        {link}
      </>
    );
  };

  return (
    <SectionCard
      id="transactions"
      iconSrc="/icons/icon-cashback.svg"
      iconLabel="Cash move icon"
      eyebrow={eyebrow}
      title="すべての出入金"
      updatedAt={updatedAt}
    >
      {/* 絞り込みの開始を確実に読み上げるよう、status 領域は絞り込む前から置いておき中身だけを入れ替える */}
      <p role="status" className="sr-only">
        {filtering ? `${filterGroup.title}の明細${rows.length}件を表示中` : ""}
      </p>
      {filtering && (
        <GroupFilterBand
          number={filterNumber}
          title={filterGroup.title}
          count={rows.length}
          onClear={clearRowsFilter}
        />
      )}
      {rows.length === 0 ? (
        <p className="text-gray-500">公開中の出入金はまだありません</p>
      ) : (
        <>
          <TransactionSortTabs current={sort} onChange={setSort} />
          <div className="relative">
            <div
              className={`hidden h-12 items-center border-b border-[#D5DBE1] text-sm font-bold text-gray-800 min-[641px]:grid ${ROW_GRID}`}
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
                  className={`grid grid-cols-1 gap-1 border-b border-[#D5DBE1] py-3 min-[641px]:min-h-16 min-[641px]:items-center min-[641px]:gap-0 min-[641px]:py-0 ${ROW_GRID}`}
                >
                  <div className="text-xs text-[#4B5563] min-[641px]:px-4 min-[641px]:text-base min-[641px]:font-bold min-[641px]:text-gray-800">
                    {formatResearchFundDate(row.date)}
                  </div>
                  <div className="order-3 flex flex-wrap items-center gap-2 min-[641px]:order-none min-[641px]:pl-4">
                    <ResearchFundCategoryPill category={row.detailed} />
                    {rowBadges && (
                      <span className="flex items-center gap-2 min-[641px]:hidden">
                        {rowBadges}
                      </span>
                    )}
                  </div>
                  <div className="order-2 flex items-baseline justify-between gap-3 min-[641px]:order-none min-[641px]:block min-[641px]:py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 min-[641px]:text-base">
                        {row.description}
                      </span>
                      {rowBadges && (
                        <span className="hidden items-center gap-2 min-[641px]:inline-flex">
                          {rowBadges}
                        </span>
                      )}
                    </span>
                    <ResearchFundAmount row={row} className="text-base min-[641px]:hidden" />
                    {row.note && (
                      <p className="mt-0.5 hidden text-xs leading-relaxed text-[#6B7280] min-[641px]:block">
                        {row.note}
                      </p>
                    )}
                  </div>
                  <div className="hidden pr-6 text-right min-[641px]:block">
                    <ResearchFundAmount row={row} className="text-xl" />
                  </div>
                  {row.note && (
                    <p className="order-4 text-xs leading-relaxed text-[#6B7280] min-[641px]:hidden">
                      {row.note}
                    </p>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[108px] items-end justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.3)_34%,rgba(255,255,255,0.8)_66%,#fff_90%)] pb-[5px]">
                <Link
                  href={researchFundTransactionsHref(pathSlug, data.financialYear, {
                    categories: [],
                    sort,
                    page: 1,
                  })}
                  className="pointer-events-auto inline-flex h-[52px] w-[240px] items-center justify-center gap-2.5 rounded-full border border-[#111827] bg-white px-7 py-2 text-base font-bold text-[#1F2937] transition-colors duration-150 hover:bg-[#F9FAFB]"
                >
                  もっと見る
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {receipt && (
        <ReceiptModal
          expense={receipt}
          category={receipt.detailed}
          onClose={() => setReceipt(null)}
        />
      )}
    </SectionCard>
  );
}
