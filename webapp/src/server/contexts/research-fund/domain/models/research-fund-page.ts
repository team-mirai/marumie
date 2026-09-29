/**
 * 調研費 議員ページ（B-1〜B-5）が描くためのデータ。
 *
 * published の仕訳だけから作る。区分トグル（詳細／法律上）はクライアント側で
 * 切り替えるだけで済むよう、両方の区分を先に組み立てて渡す。
 */
import type { ResearchFundReceiptKind } from "@/server/contexts/research-fund/domain/services/research-fund-receipt-kind";
import type { SankeyData } from "@/types/sankey";

/** 区分トグルの値。既存の収支の流れと同じ2択。 */
export type ResearchFundCategoryMode = "detailed" | "legal";

/** カテゴリーピル1つ分の表示情報。 */
export interface ResearchFundCategoryView {
  label: string;
  /** 白背景・この色の枠と文字（既存の支出ピルと同じ形式） */
  color: string;
}

/** B-4 の明細1行（支給または支出）。区分トグルで detailed / legal を出し分ける。 */
export interface ResearchFundExpenseView {
  /** grant は支給（入金）、expense は支出（出金）。金額の符号と色を出し分ける */
  kind: "grant" | "expense";
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
  /** 同一注文の分割グループ。単独の支出は null。CSV で注文単位に束ね直すのに使う。 */
  splitGroup: string | null;
  /** 紐づいた支出群（用途カード）のID。1仕訳は1つの支出群にしか属さない。紐づけが無ければ null */
  groupId: string | null;
  hasReceipt: boolean;
  /** 領収書の表示の種類。領収書が無い・種類が判定できない場合は null */
  receiptKind: ResearchFundReceiptKind | null;
}

/** B-2 の1か月分。データのない月は published が false になり、棒を描かず月ラベルを薄くする。 */
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
  /** 更新日に添える公開範囲「2026年2月〜8月支給分」。公開月が無ければ null */
  grantPeriodLabel: string | null;
  nextUpdateNote: string | null;
  policyComment: string | null;
  /** B-5「調研費のデータについて」の本文。帳簿の説明文と次回更新・未使用額から組み立て済み */
  dataNote: string;
  kpi: { granted: number; spent: number };
  /** 支給されて、まだ使っていない額。「国庫へ返還」とは呼ばない。 */
  unused: number;
  sankey: Record<ResearchFundCategoryMode, SankeyData>;
  monthly: ResearchFundMonthView[];
  /** B-4 の明細。支給（入金）と支出（出金）を日付の新しい順に混ぜて並べる */
  expenses: ResearchFundExpenseView[];
  groups: ResearchFundGroupView[];
}
