/**
 * Sankeyダイアグラムの最終出力を表現するドメインモデル
 *
 * public-finance と research-fund の双方が使うため shared に置く（コンテキスト間の直接依存を避ける）。
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
  /** 費目に含まれる取引の件数（調研費）。あればツールチップに「費目　n件」と出す。 */
  count?: number;
  /** 複数の費目をまとめたノード（調研費の「その他」）の内訳。ツールチップに出す。 */
  breakdown?: SankeyNodeBreakdownItem[];
}

/** まとめたノードの内訳1件分。 */
export interface SankeyNodeBreakdownItem {
  label: string;
  amount: number;
}

/**
 * 調研費の未使用分のノードラベル。描画側はこのラベルで淡色・末尾固定を判定する。
 * 年度途中は返還額が確定しないため「国庫へ返還」とは呼ばない。
 */
export const SANKEY_UNUSED_LABEL = "未使用・未処理";

/** 調研費で小さな費目をまとめたノードのラベル。描画側は未使用分の手前に置く。 */
export const SANKEY_OTHER_LABEL = "その他";

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
