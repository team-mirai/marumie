import { SANKEY_OTHER_LABEL, type SankeyData, type SankeyNode } from "@/types/sankey";

/** 前年から繰り越した残高（収入側）。グレーで描き、収入の末尾に置く。 */
export const SANKEY_PREVIOUS_BALANCE_LABEL = "昨年からの現金残高";
/** 年末の残高（支出側）。グレーで描き、支出の後ろに置く。 */
const SANKEY_BALANCE_LABEL = "現金残高";
const SANKEY_PROCESSING_LABEL = "(仕訳中)";

/** サンキー図の1項目。内訳（subs）があれば外側の列に出す。 */
export interface SankeyFlowItem {
  label: string;
  value: number;
  subs?: SankeyFlowItem[];
}

/** 列を組み立てる前の、収入（左）・支出（右）・残高に整理したデータ。金額は円。 */
export interface SankeyFlow {
  incomes: SankeyFlowItem[];
  expenses: SankeyFlowItem[];
  /** 支出の後ろに置く残高（現金残高・未使用）。無ければ出さない */
  balance: { label: string; value: number } | null;
  /** 中央の「合計」（収入の合計） */
  total: number;
}

interface ToSankeyFlowOptions {
  /** 支出の後ろに置く残高のノードのラベル（政治資金は「現金残高」、調研費は「未使用・未処理」） */
  balanceLabel?: string;
  /** 指定すると、残高以外の支出をこの名前の1項目にまとめ、各費目をその内訳として出す（議員ページの調研費の「支出」） */
  groupExpensesAs?: string;
}

function sumLinks(data: SankeyData, predicate: (link: SankeyData["links"][number]) => boolean) {
  return data.links.filter(predicate).reduce((sum, link) => sum + link.value, 0);
}

function labelOf(node: SankeyNode): string {
  return node.label ?? node.id;
}

/**
 * 大きい順。ただし sinks に当たる項目は後ろへ（先に書いたものほど前）。
 * 同額ならラベルの文字コード順にし、DB の返却順（groupBy に ORDER BY が無い）に並びが左右されないようにする。
 */
function sortByValue<T extends { label: string; value: number }>(
  items: T[],
  sinks: ((label: string) => boolean)[] = [],
): T[] {
  const rank = (label: string) => {
    const i = sinks.findIndex((match) => match(label));
    return i < 0 ? -1 : i;
  };
  return [...items].sort(
    (a, b) => rank(a.label) - rank(b.label) || b.value - a.value || compareLabel(a.label, b.label),
  );
}

/** 文字コード順。localeCompare は実行環境の ICU で結果が変わりうるので使わない。 */
function compareLabel(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** 内訳の並び：「収支」を最後、「その他」を含む項目をその手前、ほかは大きい順。 */
function sortSubs(items: SankeyFlowItem[]): SankeyFlowItem[] {
  return sortByValue(items, [(label) => label.includes("その他"), (label) => label === "収支"]);
}

/**
 * 集計済みのサンキーのデータ（ノードとリンク）を、図の列ごとの並びに整理する。
 * 並び順：収入は大きい順で「昨年からの現金残高」を最後に。支出は大きい順で「(仕訳中)」「その他」を後ろに、
 * 残高（現金残高・未使用）は支出から外して最後に置く。内訳は親の中で大きい順。
 */
export function toSankeyFlow(data: SankeyData, options: ToSankeyFlowOptions = {}): SankeyFlow {
  const balanceLabel = options.balanceLabel ?? SANKEY_BALANCE_LABEL;
  const total = data.nodes.find((node) => node.nodeType === "total");
  if (!total) return { incomes: [], expenses: [], balance: null, total: 0 };

  const subsOf = (parent: SankeyNode, side: "income" | "expense"): SankeyFlowItem[] | undefined => {
    const subs = data.nodes
      .filter((node) => node.nodeType === `${side}-sub`)
      .map((node) => ({
        label: labelOf(node),
        value: sumLinks(data, (link) =>
          side === "income"
            ? link.source === node.id && link.target === parent.id
            : link.source === parent.id && link.target === node.id,
        ),
      }))
      .filter((sub) => sub.value > 0);
    return subs.length > 0 ? sortSubs(subs) : undefined;
  };

  const incomes = sortByValue(
    data.nodes
      .filter((node) => node.nodeType === "income")
      .map((node) => ({
        label: labelOf(node),
        value: sumLinks(data, (link) => link.source === node.id && link.target === total.id),
        subs: subsOf(node, "income"),
      }))
      .filter((item) => item.value > 0),
    [(label) => label === SANKEY_PREVIOUS_BALANCE_LABEL],
  );

  const outs = data.nodes
    .filter((node) => node.nodeType === "expense")
    .map((node) => ({
      label: labelOf(node),
      value: sumLinks(data, (link) => link.source === total.id && link.target === node.id),
      subs: subsOf(node, "expense"),
    }))
    .filter((item) => item.value > 0);
  const balanceItem = outs.find((item) => item.label === balanceLabel);
  const expenses = sortByValue(
    outs.filter((item) => item !== balanceItem),
    [(label) => label === SANKEY_OTHER_LABEL, (label) => label === SANKEY_PROCESSING_LABEL],
  );

  const grouped =
    options.groupExpensesAs && expenses.length > 0
      ? [
          {
            label: options.groupExpensesAs,
            value: expenses.reduce((sum, item) => sum + item.value, 0),
            subs: expenses.map(({ label, value }) => ({ label, value })),
          },
        ]
      : expenses;

  return {
    incomes,
    expenses: grouped,
    balance: balanceItem ? { label: balanceItem.label, value: balanceItem.value } : null,
    total: incomes.reduce((sum, item) => sum + item.value, 0),
  };
}
