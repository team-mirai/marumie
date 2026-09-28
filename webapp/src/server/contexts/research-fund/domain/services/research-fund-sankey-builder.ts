import {
  SANKEY_OTHER_LABEL,
  SANKEY_UNUSED_LABEL,
  type SankeyData,
  type SankeyNodeBreakdownItem,
} from "@/server/contexts/shared/domain/models/sankey-data";
import type {
  ResearchFundAggregation,
  ResearchFundCategoryTotal,
} from "@/shared/research-fund/aggregation";

/** サンキーの左端。調研費は政党を通らず国から議員へ直接支給される。 */
const GRANT_NODE_LABEL = "公費から支給";

/** 支給額に対してこの割合未満の費目は「その他」にまとめる（デザイン「サンキーチャート」節）。 */
const OTHER_THRESHOLD_RATIO = 0.01;

const GRANT_NODE_ID = "income-grant";
const TOTAL_NODE_ID = "total";

interface SankeyItem {
  label: string;
  amount: number;
  breakdown?: SankeyNodeBreakdownItem[];
}

/**
 * 集計結果から B-1 のサンキーを組み立てる。
 *
 * ノードIDは Safari 対策で英数字のみにするため、費目は並び順の連番で採番する
 * （法律上の区分ではキーが日本語になるため、キーをそのままIDに使えない）。
 * 費目は金額の多い順、その後に「その他」、末尾に未使用分を置く。
 * 未使用分は描画側で淡色・末尾固定にする。
 */
export function buildResearchFundSankey(aggregation: ResearchFundAggregation): SankeyData {
  const granted = aggregation.kpi.granted;
  // 0円・マイナスの帯は描けないので落とす（支給前で未使用がマイナスになる場合を含む）。
  const categories = aggregation.categories.filter((category) => category.totalAmount > 0);
  if (granted <= 0 || categories.length === 0) return { nodes: [], links: [] };

  const expenses = categories.filter((category) => category.kind === "expense");
  const unused = categories.find((category) => category.kind === "unused");
  const items: SankeyItem[] = [
    ...groupSmallExpenses(expenses, granted),
    ...(unused ? [{ label: SANKEY_UNUSED_LABEL, amount: unused.totalAmount }] : []),
  ];

  return {
    nodes: [
      { id: GRANT_NODE_ID, label: GRANT_NODE_LABEL, nodeType: "income" },
      { id: TOTAL_NODE_ID, label: "合計", nodeType: "total" },
      ...items.map((item, index) => ({
        id: `expense-${index}`,
        label: item.label,
        nodeType: "expense" as const,
        ...(item.breakdown ? { breakdown: item.breakdown } : {}),
      })),
    ],
    links: [
      { source: GRANT_NODE_ID, target: TOTAL_NODE_ID, value: granted },
      ...items.map((item, index) => ({
        source: TOTAL_NODE_ID,
        target: `expense-${index}`,
        value: item.amount,
      })),
    ],
  };
}

/**
 * 支給額の1%未満の費目を「その他」1ノードにまとめる。詳細・法律上のどちらの区分でも同じ規則。
 * 1%未満が1つだけならまとめても情報が減るだけなので、その費目のまま出す。
 * まとめるときは、もともと「その他」という費目があればラベルが重ならないよう一緒にまとめる。
 */
function groupSmallExpenses(
  expenses: readonly ResearchFundCategoryTotal[],
  granted: number,
): SankeyItem[] {
  const sorted = [...expenses].sort((a, b) => b.totalAmount - a.totalAmount);
  const isSmall = (category: ResearchFundCategoryTotal) =>
    category.totalAmount < granted * OTHER_THRESHOLD_RATIO;
  const small = sorted.filter(isSmall);
  if (small.length < 2) {
    return sorted.map((category) => ({ label: category.label, amount: category.totalAmount }));
  }

  const grouped = sorted.filter(
    (category) => isSmall(category) || category.label === SANKEY_OTHER_LABEL,
  );
  const rest = sorted.filter((category) => !grouped.includes(category));
  return [
    ...rest.map((category) => ({ label: category.label, amount: category.totalAmount })),
    {
      label: SANKEY_OTHER_LABEL,
      amount: grouped.reduce((sum, category) => sum + category.totalAmount, 0),
      breakdown: grouped.map((category) => ({
        label: category.label,
        amount: category.totalAmount,
      })),
    },
  ];
}
