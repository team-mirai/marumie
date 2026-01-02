/**
 * MonthlyTransactionTotal ドメインモデル
 *
 * SQLから返される月別合計を表す型。
 * リポジトリ層からドメイン層へのデータ転送に使用する。
 */

/**
 * 月別取引合計データ
 * SQLの GROUP BY ... SUM() の結果を表現する
 */
export interface MonthlyTransactionTotal {
  year: number;
  month: number;
  totalAmount: number;
}
