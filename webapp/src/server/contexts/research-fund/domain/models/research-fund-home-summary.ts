/**
 * トップページの「所属議員の調研費」セクションが描くためのデータ。
 *
 * 議員ページと同じく published の仕訳だけから作る。
 * 議員カードの選択や年の切り替えで下のカードを差し替えるだけで済むよう、議員ごと・年ごとに
 * 詳細／法律上の両方の区分のサンキーを先に組み立てて渡す。
 */
import type { ResearchFundCategoryMode } from "@/server/contexts/research-fund/domain/models/research-fund-page";
import type { PoliticianHouse } from "@/shared/models/politician";
import type { SankeyData } from "@/types/sankey";

/** 議員の1年分の調研費。published の仕訳がある年だけが入る。 */
export interface ResearchFundHomeYearView {
  financialYear: number;
  /** 「2026.8.20 更新」の元になる日付（YYYY-MM-DD）。未設定なら null */
  asOfDate: string | null;
  /** 「2026年2-8月分」 */
  grantPeriodLabel: string | null;
  kpi: { granted: number; spent: number };
  /** 議員ページの収支の流れと同じサンキー */
  sankey: Record<ResearchFundCategoryMode, SankeyData>;
}

/** 議員カード1枚分。published の仕訳がある議員だけが入る（準備中の議員は出さない）。 */
export interface ResearchFundHomePoliticianView {
  slug: string;
  name: string;
  /** ふりがな。未登録なら null */
  nameKana: string | null;
  /** 院。未登録なら null */
  house: PoliticianHouse | null;
  /** 顔写真が登録されているか。未登録なら人型のアイコンにする */
  hasPhoto: boolean;
  /**
   * 公開済みの年の調研費（年の古い順）。最初に出す年（ResearchFundHomeSummaryData.financialYear）は必ず入る。
   * 2年分以上あれば年の切り替えを出す
   */
  years: ResearchFundHomeYearView[];
}

export interface ResearchFundHomeSummaryData {
  /** 並べる議員を決め、最初に出す年 */
  financialYear: number;
  /** ふりがなの五十音順。1人以上いる */
  politicians: ResearchFundHomePoliticianView[];
}
