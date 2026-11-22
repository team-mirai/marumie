/**
 * 支出の明細記載基準を定義するドメインモデル
 *
 * 政治資金報告書では、経常経費（SYUUSHI07_14）と政治活動費（SYUUSHI07_15）のうち
 * 一定金額以上の支出を明細行として個別に記載し、支払先の氏名・住所を書く。
 * 基準未満の支出は「その他の支出」として合算する。
 *
 * 紐付け画面の「要取引先」の表示・絞り込みと、報告書の明細行の判定は、
 * どちらもこのファイルの金額の求め方と基準額から決める。
 *
 * 参考: docs/reference/report-format.md
 */

import { resolveExpenseAmount } from "@/server/contexts/report/domain/models/transaction-utils";

/** 明細に記載する支出の金額基準（円）。この金額以上の支出を明細に記載する */
export const EXPENSE_DETAIL_THRESHOLD = 50_000;

/** 画面に表示する基準額の文言（例: "5万円"） */
export const EXPENSE_DETAIL_THRESHOLD_LABEL = `${EXPENSE_DETAIL_THRESHOLD / 10_000}万円`;

/**
 * 明細記載の判定と明細行の金額に使う支出金額を求める
 * 借方金額を優先し（借方が 0 以下なら貸方金額）、円未満を四捨五入する
 */
export function resolveExpenseDetailAmount(debitAmount: number, creditAmount: number): number {
  return Math.round(resolveExpenseAmount(debitAmount, creditAmount));
}

/**
 * 支出が明細記載の金額基準以上かどうかを判定する
 */
export function isExpenseDetailRequired(debitAmount: number, creditAmount: number): boolean {
  return resolveExpenseDetailAmount(debitAmount, creditAmount) >= EXPENSE_DETAIL_THRESHOLD;
}

/**
 * データベースに保存された借方・貸方金額に対する絞り込み条件
 * - `{ debitAmount: { gte } }`: 借方金額が gte 以上
 * - `{ debitAmount: { lte }, creditAmount: { gte } }`: 借方金額が lte 以下かつ貸方金額が gte 以上
 */
export type RawExpenseAmountCondition =
  | { debitAmount: { gte: number } }
  | { debitAmount: { lte: number }; creditAmount: { gte: number } };

/**
 * isExpenseDetailRequired が true になる借方・貸方金額の条件（いずれか 1 つを満たせばよい）
 *
 * データベースで「明細記載が必要な支出」を絞り込むために使う。
 * resolveExpenseDetailAmount（借方優先・四捨五入）を、保存された金額の範囲条件に言い換えたもの:
 * - 借方が正なら借方金額を使う。四捨五入して基準以上 ⇔ 借方 ≥ 基準 − 0.5
 * - 借方が 0 以下なら貸方金額を使う。四捨五入して基準以上 ⇔ 貸方 ≥ 基準 − 0.5
 */
export function getExpenseDetailRawAmountConditions(): RawExpenseAmountCondition[] {
  const minimumRawAmount = EXPENSE_DETAIL_THRESHOLD - 0.5;
  return [
    { debitAmount: { gte: minimumRawAmount } },
    { debitAmount: { lte: 0 }, creditAmount: { gte: minimumRawAmount } },
  ];
}
