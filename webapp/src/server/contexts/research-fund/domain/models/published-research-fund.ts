/**
 * 公開ページが読む調研費データ。
 *
 * published の仕訳だけを射影したものであり、draft / approved の仕訳と
 * 公開されない備考（memo）はこの型に入らない（= 画面に出ない）。
 */
import type { ResearchFundCategory, ResearchFundRow } from "@/shared/research-fund/aggregation";

/** 費目（科目マスタ）。法定区分のキーはカテゴリーピルの色に使う。 */
export interface PublishedAccount extends ResearchFundCategory {
  legalCategoryKey: string;
}

/**
 * 公開された支出1行（仕訳の借方・費用行1つ）。
 * 同一注文の分割行は splitGroup が同じになる。
 */
export interface PublishedExpense {
  /** 行の一意キー（仕訳明細のID） */
  id: string;
  /** 領収書の取得に使う仕訳のID */
  entryId: string;
  /** 帳簿上の日付（YYYY-MM-DD）。タイムゾーンによる月のずれを避ける。 */
  date: string;
  accountKey: string;
  description: string;
  amount: number;
  /** 特記事項（公開される）。備考（memo）は含まない。 */
  note: string | null;
  splitGroup: string | null;
  hasReceipt: boolean;
}

/** 成果物。url が無ければ公開側は「報告は準備中」と表示する。 */
export interface PublishedOutcome {
  label: string;
  url: string | null;
}

/** 支出群（主要な支出の成果）。金額・件数・期間は紐づいた仕訳から集計する。 */
export interface PublishedExpenditureGroup {
  id: string;
  title: string;
  description: string;
  outcomes: PublishedOutcome[];
  /** 紐づいた published の仕訳。未公開の仕訳は含めない。 */
  entries: { entryDate: string; amount: number; accountKey: string }[];
}

export interface PublishedResearchFund {
  politician: { name: string; slug: string };
  financialYear: number;
  /** 「2026.8.20時点」。未設定なら null */
  asOfDate: string | null;
  /** 「次回更新 11月ごろ」。未設定なら null */
  nextUpdateNote: string | null;
  /** 活用方針（議員本人が書く1〜2行）。未設定なら null */
  policyComment: string | null;
  /** B-5「データについて」の説明文。未設定なら null */
  details: unknown;
  /** 何月分まで公開したか（YYYY-MM-DD）。未設定なら null */
  publishedThrough: string | null;
  /** 集計に渡す行（支給と支出）。 */
  rows: ResearchFundRow[];
  accounts: Record<string, PublishedAccount>;
  expenses: PublishedExpense[];
  groups: PublishedExpenditureGroup[];
}

/** 公開された領収書。published の仕訳に紐づくものだけを配信する。 */
export interface PublishedReceipt {
  storageKey: string;
}

/** 政党ページ A-6 が読む、議員1人分の published 射影。 */
export interface PublishedPoliticianResearchFund {
  politician: { name: string; slug: string };
  /** 「2026.8.20時点」。未設定なら null */
  asOfDate: string | null;
  /** 何月分まで公開したか（YYYY-MM-DD）。未設定なら null */
  publishedThrough: string | null;
  /** 集計に渡す行（支給と支出）。published の仕訳が無ければ空配列。 */
  rows: ResearchFundRow[];
  accounts: Record<string, PublishedAccount>;
  /** published の支出の件数（B-4 の行数と同じ数え方）。 */
  expenseCount: number;
}

/** 政党ページ A-6 が読む、所属議員全員分の published 射影。 */
export interface PublishedPartyResearchFund {
  organization: { slug: string; displayName: string };
  financialYear: number;
  /** 当選期順（display_order）。準備中の議員も含む。 */
  politicians: PublishedPoliticianResearchFund[];
}
