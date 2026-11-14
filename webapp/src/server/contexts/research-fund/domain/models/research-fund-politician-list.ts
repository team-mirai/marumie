import type { PoliticianHouse } from "@/shared/models/politician";

/**
 * 組織セレクタの「調査研究費」グループに並べる議員。
 *
 * 政治資金（政治団体）と並べて1箇所で切り替えられるようにするためのもので、
 * 公開状況（「2026年2月〜8月分を公開中」）まで含めて渡す。
 * published の仕訳がある議員だけが入る。
 */
export interface ResearchFundPoliticianEntry {
  slug: string;
  name: string;
  /** 「2026年2月〜8月分を公開中」 */
  statusLabel: string;
}

/**
 * 議員ページの前後の切り替え・「ほかの議員の調研費」に並べる、調研費を公開中の議員。
 * 並びは表示順（display_order）。
 */
export interface ResearchFundPoliticianCard {
  slug: string;
  name: string;
  /** 「衆議院議員・比例東京（東京7区）」。院も選挙区も未登録なら null */
  title: string | null;
  hasPhoto: boolean;
}

/**
 * 公開状況を判定する前の、その年度に帳簿を持つ議員。
 * セレクタに出すか・公開範囲の表記は usecase で決める。
 */
export interface ResearchFundPoliticianSource {
  slug: string;
  name: string;
  house: PoliticianHouse | null;
  constituency: string | null;
  hasPhoto: boolean;
  /** published の仕訳がある月（YYYY-MM）。重複していてよい */
  publishedMonths: string[];
  /** 何月分まで公開したか（YYYY-MM）。未設定なら null */
  publishedThrough: string | null;
}
