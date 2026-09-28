import type {
  ResearchFundCategoryView,
  ResearchFundExpenseView,
} from "@/server/contexts/research-fund/domain/models/research-fund-page";

/** 調研費の全件ページの並び。初期は新しい順。 */
export type ResearchFundTransactionSort = "new" | "old" | "amountDesc" | "amountAsc";

const RESEARCH_FUND_TRANSACTIONS_PER_PAGE = 50;

/** 「2026-05-08」→「2026.5.8」 */
export function formatResearchFundDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

/** 日付列のボタン。新しい順⇄古い順を行き来し、金額順からは新しい順に切り替える。 */
export function toggleDateSort(sort: ResearchFundTransactionSort): ResearchFundTransactionSort {
  return sort === "new" ? "old" : "new";
}

/** 金額列のボタン。降順⇄昇順を行き来し、日付順からは降順に切り替える。 */
export function toggleAmountSort(sort: ResearchFundTransactionSort): ResearchFundTransactionSort {
  return sort === "amountDesc" ? "amountAsc" : "amountDesc";
}

/**
 * 並び替える。
 *
 * 入力は日付の新しい順で、同一注文の分割行が隣り合うように並んでいる前提。
 * 安定ソートで同順位の並びを保つので、古い順でも分割行は離れない。
 */
export function sortResearchFundExpenses(
  rows: readonly ResearchFundExpenseView[],
  sort: ResearchFundTransactionSort,
): ResearchFundExpenseView[] {
  switch (sort) {
    case "new":
      return [...rows];
    case "old":
      return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    case "amountDesc":
      return [...rows].sort((a, b) => b.amount - a.amount);
    case "amountAsc":
      return [...rows].sort((a, b) => a.amount - b.amount);
  }
}

/** 詳細の区分のラベルで絞り込む。何も選んでいなければ全件を返す。 */
export function filterResearchFundExpenses(
  rows: readonly ResearchFundExpenseView[],
  categories: readonly string[],
): ResearchFundExpenseView[] {
  if (categories.length === 0) return [...rows];
  const selected = new Set(categories);
  return rows.filter((row) => selected.has(row.detailed.label));
}

/**
 * 絞り込みの選択肢（詳細の区分）。
 *
 * 公開中の支出に出てくる区分だけを、法律上の区分（①〜⑨、その他）の順にまとめて並べる。
 */
export function researchFundCategoryOptions(
  rows: readonly ResearchFundExpenseView[],
): ResearchFundCategoryView[] {
  const options = new Map<string, { category: ResearchFundCategoryView; legal: string }>();
  for (const row of rows) {
    if (!options.has(row.detailed.label)) {
      options.set(row.detailed.label, { category: row.detailed, legal: row.legal.label });
    }
  }
  return (
    [...options.values()]
      // 丸数字（①〜⑨）はコードポイント順に並び、「その他」はその後ろに来る。
      .sort((a, b) => (a.legal < b.legal ? -1 : a.legal > b.legal ? 1 : 0))
      .map((option) => option.category)
  );
}

interface ResearchFundTransactionsPage {
  rows: ResearchFundExpenseView[];
  /** 範囲外の指定は 1〜最終ページに丸める */
  page: number;
  totalPages: number;
  /** 表示中の先頭の通し番号（1始まり）。0件なら 0 */
  from: number;
  to: number;
}

export function paginateResearchFundExpenses(
  rows: readonly ResearchFundExpenseView[],
  page: number,
  perPage: number = RESEARCH_FUND_TRANSACTIONS_PER_PAGE,
): ResearchFundTransactionsPage {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (current - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);
  return {
    rows: pageRows,
    page: current,
    totalPages,
    from: pageRows.length > 0 ? start + 1 : 0,
    to: start + pageRows.length,
  };
}

/**
 * ページャーに並べる番号。先頭・末尾・現在±1 以外は「…」1つにまとめる。
 * 例: 現在5／全10 → [1, "…", 4, 5, 6, "…", 10]
 */
export function researchFundPagerItems(current: number, totalPages: number): (number | "…")[] {
  const items: (number | "…")[] = [];
  for (let page = 1; page <= totalPages; page++) {
    if (page === 1 || page === totalPages || Math.abs(page - current) <= 1) {
      items.push(page);
    } else if (items[items.length - 1] !== "…") {
      items.push("…");
    }
  }
  return items;
}

/** 表の下の件数表示。「1〜50 / 296件を表示中　合計 2,212,581円」 */
export function researchFundTransactionsSummary({
  from,
  to,
  total,
  amount,
  filtered,
}: {
  from: number;
  to: number;
  total: number;
  amount: number;
  filtered: boolean;
}): string {
  return `${from}〜${to} / ${total}件を表示中　合計 ${amount.toLocaleString("ja-JP")}円${
    filtered ? "（絞り込み中）" : ""
  }`;
}
