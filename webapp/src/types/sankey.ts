/**
 * Sankeyダイアグラムの型定義
 *
 * 実装はドメインモデルに移動。UIコンポーネントからの参照パスを維持するためにre-export
 */
export type {
  SankeyData,
  SankeyNode,
  SankeyLink,
} from "@/server/contexts/public-finance/domain/models/sankey-data";
