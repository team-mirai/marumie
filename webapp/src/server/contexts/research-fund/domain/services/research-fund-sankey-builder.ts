import type { SankeyData } from "@/types/sankey";
import type { ResearchFundAggregation } from "@/shared/research-fund/aggregation";

/** サンキーの左端。調研費は政党を通らず国から議員へ直接支給される。 */
const GRANT_NODE_LABEL = "公費から支給";
/**
 * サンキーの末尾に固定する未使用分のラベル。
 * 年度途中は返還額が確定しないため「国庫へ返還」とは呼ばない（デザイン仕様 §5）。
 */
const UNUSED_NODE_LABEL = "未使用";

const GRANT_NODE_ID = "income-grant";
const TOTAL_NODE_ID = "total";

/**
 * 集計結果から B-1 のサンキーを組み立てる。
 *
 * ノードIDは Safari 対策で英数字のみにするため、費目は並び順の連番で採番する
 * （法律上の区分ではキーが日本語になるため、キーをそのままIDに使えない）。
 * 未使用は費目と同じ右端に置き、描画側で淡色・末尾固定にする。
 */
export function buildResearchFundSankey(aggregation: ResearchFundAggregation): SankeyData {
  const granted = aggregation.kpi.granted;
  // 0円・マイナスの帯は描けないので落とす（支給前で未使用がマイナスになる場合を含む）。
  const categories = aggregation.categories.filter((category) => category.totalAmount > 0);
  if (granted <= 0 || categories.length === 0) return { nodes: [], links: [] };

  return {
    nodes: [
      { id: GRANT_NODE_ID, label: GRANT_NODE_LABEL, nodeType: "income" },
      { id: TOTAL_NODE_ID, label: "合計", nodeType: "total" },
      ...categories.map((category, index) => ({
        id: `expense-${index}`,
        label: category.kind === "unused" ? UNUSED_NODE_LABEL : category.label,
        nodeType: "expense" as const,
      })),
    ],
    links: [
      { source: GRANT_NODE_ID, target: TOTAL_NODE_ID, value: granted },
      ...categories.map((category, index) => ({
        source: TOTAL_NODE_ID,
        target: `expense-${index}`,
        value: category.totalAmount,
      })),
    ],
  };
}
