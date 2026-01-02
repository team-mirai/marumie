/**
 * Sankeyダイアグラムの最終出力を表現するドメインモデル
 *
 * UIコンポーネントからも参照されるため、server-onlyは含めない
 */

/**
 * Sankeyノードの種別
 * - income: 収入カテゴリノード（例: 「寄附」）
 * - income-sub: 収入サブカテゴリノード（例: 「個人からの寄附」）
 * - total: 中央の「合計」ノード
 * - expense: 支出カテゴリノード（例: 「政治活動費」）
 * - expense-sub: 支出サブカテゴリノード（例: 「宣伝費」）
 */
export type SankeyNodeType = "income" | "income-sub" | "total" | "expense" | "expense-sub";

/**
 * Sankeyダイアグラムのノード
 */
export interface SankeyNode {
  id: string;
  label?: string;
  nodeType?: SankeyNodeType;
}

/**
 * Sankeyダイアグラムのリンク（ノード間の接続）
 */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/**
 * Sankeyダイアグラムのデータ構造
 */
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalLatestBalance?: number;
}

/**
 * SankeyDataのファクトリ関数群
 */
export const SankeyData = {
  /**
   * 空のSankeyDataを生成
   */
  empty(): SankeyData {
    return { nodes: [], links: [] };
  },
};
