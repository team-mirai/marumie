/**
 * 調研費 議員ページ（B-1〜B-5）が描くためのデータ。
 *
 * published の仕訳だけから作る。区分トグル（詳細／法律上）はクライアント側で
 * 切り替えるだけで済むよう、両方の区分を先に組み立てて渡す。
 */
import type { SankeyData } from "@/types/sankey";

/** 区分トグルの値。既存の収支の流れと同じ2択。 */
export type ResearchFundCategoryMode = "detailed" | "legal";

/** カテゴリーピル1つ分の表示情報。 */
export interface ResearchFundCategoryView {
  label: string;
  /** 白背景・この色の枠と文字（既存の支出ピルと同じ形式） */
  color: string;
}

/** B-4 の明細1行。区分トグルで detailed / legal を出し分ける。 */
export interface ResearchFundExpenseView {
  /** 行の一意キー */
  id: string;
  /** 領収書の取得に使う仕訳のID */
  entryId: string;
  /** 帳簿上の日付（YYYY-MM-DD） */
  date: string;
  /** 表示する月（YYYY-MM）。月切り替えの絞り込みに使う。 */
  month: string;
  description: string;
  amount: number;
  detailed: ResearchFundCategoryView;
  legal: ResearchFundCategoryView;
  /** 特記事項。同一注文の分割行はその説明もここに含む。無ければ null */
  note: string | null;
  hasReceipt: boolean;
}

/** B-2 の1か月分。未公開の月は published が false になり、点線の空枠で描く。 */
export interface ResearchFundMonthView {
  /** YYYY-MM */
  month: string;
  granted: number;
  spent: number;
  published: boolean;
}

/** B-3 の成果カード1枚。 */
export interface ResearchFundGroupView {
  id: string;
  title: string;
  description: string;
  amount: number;
  count: number;
  /** 紐づいた仕訳の期間。紐づけが無ければ null */
  period: { start: string; end: string } | null;
  categories: ResearchFundCategoryView[];
  outcomes: { label: string; url: string | null }[];
}

export interface ResearchFundPageData {
  politician: { name: string; slug: string };
  financialYear: number;
  asOfDate: string | null;
  nextUpdateNote: string | null;
  policyComment: string | null;
  /** B-5「調査研究費のデータについて」の本文。未設定なら null */
  dataNote: string | null;
  kpi: { granted: number; spent: number };
  /** 支給されて、まだ使っていない額。「国庫へ返還」とは呼ばない。 */
  unused: number;
  sankey: Record<ResearchFundCategoryMode, SankeyData>;
  monthly: ResearchFundMonthView[];
  expenses: ResearchFundExpenseView[];
  groups: ResearchFundGroupView[];
}
