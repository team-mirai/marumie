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
  /** ピルの情報アイコンから出す説明。説明を持つ科目（交通費）だけに付く */
  description?: string;
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
  /** 科目のキー（支給は支給の科目）。表示名は改名されうるので、全件ページの絞り込み URL にはこちらを載せる */
  accountKey: string;
  /**
   * 科目の既定の法律上の区分のラベル（支給は支給の区分名）。仕訳ごとの上書き（#1880）の影響を受けないので、
   * 科目の選択肢の並びに使う。画面に出す法律上の区分は legal（上書きがあればそれ）を使う
   */
  accountLegalLabel: string;
  detailed: ResearchFundCategoryView;
  /** 法律上の区分。仕訳ごとの上書きがあればそれ、無ければ科目の既定 */
  legal: ResearchFundCategoryView;
  /** 特記事項（管理画面で入力したもの）。無ければ null */
  note: string | null;
  /** 同一注文の分割グループ。単独の支出は null。CSV で注文単位に束ね直すのに使う。 */
  splitGroup: string | null;
  /** 紐づいた支出群（用途カード）のID。1仕訳は1つの支出群にしか属さない。紐づけが無ければ null */
  groupId: string | null;
  hasReceipt: boolean;
  /** 領収書の公開用の版が作成済みか。false の間は領収書を開かせず準備中と表示する */
  receiptReady: boolean;
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

/** 議員カードに出すプロフィール。登録されていない項目は null・空配列で、画面には出さない。 */
export interface ResearchFundPoliticianProfileView {
  name: string;
  slug: string;
  nameKana: string | null;
  /** 「衆議院議員・比例東京（東京7区）」。院も選挙区も未登録なら null */
  title: string | null;
  /** チームみらい公式サイト内のプロフィールページ */
  profileUrl: string | null;
  /** 議員の公式サイト */
  websiteUrl: string | null;
  /** SNS の URL（表示順どおり） */
  snsUrls: string[];
  hasPhoto: boolean;
}

export interface ResearchFundPageData {
  politician: ResearchFundPoliticianProfileView;
  /** 年の切り替えに出す年度（昇順）。表示中の年度を必ず含む */
  years: number[];
  /** 議員が調研費を「公開する」設定か。false ならプレビュー URL でだけ開ける（canViewResearchFundPage） */
  isPublic: boolean;
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
