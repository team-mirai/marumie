/**
 * 政党トップページの「所属議員｜調研費のサマリー」セクションが描くためのデータ。
 *
 * 議員ページ（B-1〜B-5）と同じく published の仕訳だけから作る。
 * 議員チップの選択でグラフを差し替えるだけで済むよう、議員ごとに
 * 詳細／法律上の両方の区分のサンキーを先に組み立てて渡す。
 */
import type { ResearchFundCategoryMode } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { SankeyData } from "@/types/sankey";

/** 議員チップ1つ分。準備中の議員も隠さず、グレーで表示する。 */
export interface ResearchFundPartyPoliticianView {
  slug: string;
  name: string;
  /** published の仕訳があり、グラフを描けるか。false なら「準備中」 */
  ready: boolean;
  /** 「2026年2月〜8月分を公開中」「準備中」 */
  statusLabel: string;
  kpi: { granted: number; spent: number };
  /** 議員ページの収支の流れと同じサンキー。ready が false なら空 */
  sankey: Record<ResearchFundCategoryMode, SankeyData>;
}

export interface ResearchFundPartySummaryData {
  organization: { slug: string; displayName: string };
  financialYear: number;
  /** 「2026.8.20更新」。公開中の議員の as_of_date のうち最も新しいもの。未設定なら null */
  asOfDate: string | null;
  /** SP の末尾に添える「2026年2月〜8月支給分」。公開中の議員全員分の範囲。公開月が無ければ null */
  grantPeriodLabel: string | null;
  /** 当選期順（display_order）で固定。ソート機能は付けない */
  politicians: ResearchFundPartyPoliticianView[];
}
