/**
 * 出入金の表の並び順。政党・政治団体・議員の表で共通に使う。
 *
 * - new / old: 日付の新しい順・古い順（初期は新しい順）
 * - expDesc / incDesc: 支出が多い順・収入が多い順。収入をプラス、支出をマイナスとして比べる
 *   （支出が多い順は大きな支出が先頭で、収入は最後に小さい順で並ぶ）
 * - amountDesc / amountAsc: 入出金を区別せず、額の大きさで並べる（PC の金額列のボタン）
 */
export type TransactionSort = "new" | "old" | "expDesc" | "incDesc" | "amountDesc" | "amountAsc";

/** SP の表の上に出す並び替えタブ（v9 の4つ） */
export const TRANSACTION_SORT_TABS: readonly { id: TransactionSort; label: string }[] = [
  { id: "new", label: "新しい順" },
  { id: "old", label: "古い順" },
  { id: "expDesc", label: "支出が多い順" },
  { id: "incDesc", label: "収入が多い順" },
];

/** 日付列のボタン。新しい順⇄古い順を行き来し、ほかの並びからは新しい順に切り替える。 */
export function toggleDateSort(sort: TransactionSort): TransactionSort {
  return sort === "new" ? "old" : "new";
}

/** 金額列のボタン。降順⇄昇順を行き来し、ほかの並びからは降順に切り替える。 */
export function toggleAmountSort(sort: TransactionSort): TransactionSort {
  return sort === "amountDesc" ? "amountAsc" : "amountDesc";
}

/** PC の列見出しの並び替えボタンの状態（aria-sort・読み上げ名・選択中か・矢印を上向きにするか） */
export interface ColumnSortState {
  ariaSort: "ascending" | "descending" | "none";
  label: string;
  active: boolean;
  flipped: boolean;
}

export function dateColumnSortState(sort: TransactionSort): ColumnSortState {
  const active = sort === "new" || sort === "old";
  const current =
    sort === "new" ? "今は新しい順" : sort === "old" ? "今は古い順" : "今は日付順ではありません";
  return {
    ariaSort: sort === "new" ? "descending" : sort === "old" ? "ascending" : "none",
    label: `日付で並び替え（${current}）`,
    active,
    flipped: sort === "old",
  };
}

/**
 * 支出・収入が多い順（SP のタブで選ぶ並び）でも、金額列は「+」「-」付きの金額で並んでいるので、
 * aria-sort と読み上げ名ではそれを伝える（支出が多い順は符号付きで昇順、収入が多い順は降順）。
 * ボタンの見た目（選択中の色・矢印の向き）は金額列のボタンで選んだ並びのときだけ変える。
 */
export function amountColumnSortState(sort: TransactionSort): ColumnSortState {
  const active = sort === "amountDesc" || sort === "amountAsc";
  const states: Record<
    TransactionSort,
    { ariaSort: ColumnSortState["ariaSort"]; current: string }
  > = {
    amountDesc: { ariaSort: "descending", current: "今は大きい順" },
    amountAsc: { ariaSort: "ascending", current: "今は小さい順" },
    expDesc: { ariaSort: "ascending", current: "今は支出が多い順" },
    incDesc: { ariaSort: "descending", current: "今は収入が多い順" },
    new: { ariaSort: "none", current: "今は金額順ではありません" },
    old: { ariaSort: "none", current: "今は金額順ではありません" },
  };
  const { ariaSort, current } = states[sort];
  return {
    ariaSort,
    label: `金額で並び替え（${current}）`,
    active,
    flipped: sort === "amountAsc",
  };
}

/** URL の sort / order の組み合わせ。order が無ければ降順として読む。 */
const SORT_BY_PARAMS: Record<string, TransactionSort> = {
  "date:desc": "new",
  "date:asc": "old",
  "amount:desc": "amountDesc",
  "amount:asc": "amountAsc",
  "expense:desc": "expDesc",
  "income:desc": "incDesc",
};

const PARAMS_BY_SORT: Record<TransactionSort, { sort: string; order: "asc" | "desc" }> = {
  new: { sort: "date", order: "desc" },
  old: { sort: "date", order: "asc" },
  amountDesc: { sort: "amount", order: "desc" },
  amountAsc: { sort: "amount", order: "asc" },
  expDesc: { sort: "expense", order: "desc" },
  incDesc: { sort: "income", order: "desc" },
};

/** URL の `sort`・`order` を並び順にする。不正な値は新しい順に倒す。 */
export function parseTransactionSort(sort: string | undefined, order: string | undefined) {
  return SORT_BY_PARAMS[`${sort ?? "date"}:${order ?? "desc"}`] ?? "new";
}

/** 並び順を URL の `sort`・`order` にする。 */
export function transactionSortParams(sort: TransactionSort): {
  sort: string;
  order: "asc" | "desc";
} {
  return PARAMS_BY_SORT[sort];
}

/** 政党・政治団体の全件ページの URL。新しい順（初期の並び）なら並び順のパラメーターを付けない。 */
export function organizationTransactionsHref(slug: string, year: number, sort: TransactionSort) {
  const base = `/o/${slug}/${year}/transactions`;
  if (sort === "new") return base;
  const { sort: sortParam, order } = transactionSortParams(sort);
  return `${base}?sort=${sortParam}&order=${order}`;
}

const compare = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * 行を並び替える。安定ソートなので、同じ順位の行は入力の並びを保つ。
 *
 * @param keys.date 日付の比較キー（ISO 形式の文字列やタイムスタンプ）
 * @param keys.signedAmount 収入をプラス、支出をマイナスにした金額
 */
export function sortTransactionRows<T>(
  rows: readonly T[],
  sort: TransactionSort,
  keys: { date: (row: T) => string | number; signedAmount: (row: T) => number },
): T[] {
  const { date, signedAmount } = keys;
  const comparators: Record<TransactionSort, (a: T, b: T) => number> = {
    new: (a, b) => compare(date(b), date(a)),
    old: (a, b) => compare(date(a), date(b)),
    expDesc: (a, b) => signedAmount(a) - signedAmount(b),
    incDesc: (a, b) => signedAmount(b) - signedAmount(a),
    amountDesc: (a, b) => Math.abs(signedAmount(b)) - Math.abs(signedAmount(a)),
    amountAsc: (a, b) => Math.abs(signedAmount(a)) - Math.abs(signedAmount(b)),
  };
  return [...rows].sort(comparators[sort]);
}
