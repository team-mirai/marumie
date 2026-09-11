/**
 * 組織セレクタの「調査研究費」グループに並べる議員。
 *
 * 政治資金（政治団体）と並べて1箇所で切り替えられるようにするためのもので、
 * 公開状況（「2026年2月〜8月分を公開中」「準備中」）まで含めて渡す。
 */
export interface ResearchFundPoliticianEntry {
  slug: string;
  name: string;
  /** published の仕訳があり、議員ページを開く価値があるか */
  ready: boolean;
  /** 「2026年2月〜8月分を公開中」「準備中」 */
  statusLabel: string;
}

/**
 * 公開状況を判定する前の、その年度に帳簿を持つ議員。
 * 公開範囲のルール（ready / statusLabel）は usecase で決める。
 */
export interface ResearchFundPoliticianSource {
  slug: string;
  name: string;
  /** published の仕訳がある月（YYYY-MM）。重複していてよい */
  publishedMonths: string[];
  /** 何月分まで公開したか（YYYY-MM）。未設定なら null */
  publishedThrough: string | null;
}
