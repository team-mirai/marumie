/**
 * 政党ページの A-6「調査研究費」セクションが描くためのデータ。
 *
 * 議員ページ（B-1〜B-5）と同じく published の仕訳だけから作る。
 * 議員リストの行選択でグラフを差し替えるだけで済むよう、議員ごとに
 * 詳細／法律上の両方の区分を先に組み立てて渡す。
 */
import type { ResearchFundCategoryMode } from "@/server/contexts/research-fund/domain/models/research-fund-page";

/** 横棒グラフの1本。未使用分は含めない（デザイン仕様 §5）。 */
export interface ResearchFundBarView {
  key: string;
  label: string;
  amount: number;
}

/** 議員リストの1行。準備中の議員も隠さず、グレーで表示する。 */
export interface ResearchFundPartyPoliticianView {
  slug: string;
  name: string;
  /** published の仕訳があり、グラフを描けるか。false なら「準備中」 */
  ready: boolean;
  /** 「2026年2月〜8月分を公開中」「準備中」 */
  statusLabel: string;
  kpi: { granted: number; spent: number };
  /** 支出の件数。ready が false なら 0 */
  count: number;
  bars: Record<ResearchFundCategoryMode, ResearchFundBarView[]>;
}

export interface ResearchFundPartySummaryData {
  organization: { slug: string; displayName: string };
  financialYear: number;
  /** 「2026.8.20時点」。公開中の議員の as_of_date のうち最も新しいもの。未設定なら null */
  asOfDate: string | null;
  /** 「2026年2月〜8月分を公開中（サンプル 太郎のみ）」 */
  coverageLabel: string;
  /** 当選期順（display_order）で固定。ソート機能は付けない（デザイン仕様 §5） */
  politicians: ResearchFundPartyPoliticianView[];
}
