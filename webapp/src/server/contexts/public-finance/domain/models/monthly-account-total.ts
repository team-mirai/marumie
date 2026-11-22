/**
 * MonthlyAccountTotal ドメインモデル
 *
 * 月・勘定科目ごとの片側（借方 or 貸方）の合計金額を表す型。
 * リポジトリ層からドメイン層へのデータ転送に使用する。
 * 収入・支出のどちらに数えるかはドメイン（buildNetCategoryAggregation）が決める。
 */

/**
 * 月・勘定科目ごとの合計データ
 * SQLの GROUP BY 年, 月, 勘定科目 ... SUM() の結果を表現する
 */
export interface MonthlyAccountTotal {
  year: number;
  month: number;
  account: string;
  amount: number;
}
