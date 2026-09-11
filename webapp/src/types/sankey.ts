/**
 * Sankeyダイアグラムの型定義
 *
 * 実装は shared のドメインモデルに移動。UIコンポーネントからの参照パスを維持するためにre-export
 */
export type {
  SankeyData,
  SankeyNode,
  SankeyLink,
} from "@/server/contexts/shared/domain/models/sankey-data";
