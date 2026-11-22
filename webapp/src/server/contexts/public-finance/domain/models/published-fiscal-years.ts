/**
 * webapp が公開している会計年度（古い順）。
 * 年度を足すときはここだけを直す。トップページ・政治団体ページ・取引一覧・年度なし URL のリダイレクト・
 * サイトマップ・ヘッダー（メニュー・フッター・「まる見え政治資金とは」を含む）は、すべてここから年度を決める。
 */
const YEARS: readonly number[] = [2025, 2026];

export const PublishedFiscalYears = {
  /** 公開している年度（古い順） */
  all: YEARS,

  /** 年度の指定が無い・公開していない年度を指定されたときに見せる年度（公開している一番新しい年度） */
  defaultYear: Math.max(...YEARS),

  /** 公開している年度か */
  includes(year: number): boolean {
    return YEARS.includes(year);
  },
};
