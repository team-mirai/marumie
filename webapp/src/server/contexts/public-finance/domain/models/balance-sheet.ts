import type { BalanceSheetData } from "@/types/balance-sheet";

/**
 * BalanceSheet ドメインモデル
 *
 * 貸借対照表の計算ロジックを提供する。
 * リポジトリから取得した生データを受け取り、貸借対照表を生成する。
 */

/**
 * 貸借対照表ドメインモデルの入力データ
 */
export interface BalanceSheet {
  /** 現金類の残高（最新残高スナップショットの合計） */
  cashBalance: number;
  /** 債権残高（未収入金など債権科目の借方 - 貸方） */
  receivables: number;
  /** 借入金収入（借入金勘定の貸方合計） */
  borrowingIncome: number;
  /** 借入金支出（借入金勘定の借方合計） */
  borrowingExpense: number;
  /** 流動負債（負債勘定の貸方 - 借方） */
  currentLiabilities: number;
}

export const BalanceSheet = {
  /**
   * 入力データから貸借対照表を生成
   * - 流動資産 = 現金類の残高 + 債権残高
   * - 固定資産は0（現時点で未対応）
   * - 固定負債 = 借入金収入 - 借入金支出
   * - 純資産/債務超過 = 資産合計 - 負債合計
   */
  fromInput(input: BalanceSheet): BalanceSheetData {
    const currentAssets = BalanceSheet.calculateCurrentAssets(input.cashBalance, input.receivables);
    const fixedAssets = 0;
    const fixedLiabilities = BalanceSheet.calculateFixedLiabilities(
      input.borrowingIncome,
      input.borrowingExpense,
    );

    const [netAssets, debtExcess] = BalanceSheet.calculateNetAssetsAndDebtExcess(
      currentAssets,
      fixedAssets,
      input.currentLiabilities,
      fixedLiabilities,
    );

    return {
      left: {
        currentAssets,
        fixedAssets,
        debtExcess,
      },
      right: {
        currentLiabilities: input.currentLiabilities,
        fixedLiabilities,
        netAssets,
      },
    };
  },

  /**
   * 流動資産を計算
   * 現金類の残高 + 債権残高（未収入金など）
   */
  calculateCurrentAssets(cashBalance: number, receivables: number): number {
    return cashBalance + receivables;
  },

  /**
   * 固定負債を計算（借入金の未返済残高）
   * 借入金収入 - 借入金支出 = 残りの借入金額
   */
  calculateFixedLiabilities(borrowingIncome: number, borrowingExpense: number): number {
    return borrowingIncome - borrowingExpense;
  },

  /**
   * 純資産と債務超過を計算
   * 資産 > 負債 → 純資産あり
   * 資産 < 負債 → 債務超過
   */
  calculateNetAssetsAndDebtExcess(
    currentAssets: number,
    fixedAssets: number,
    currentLiabilities: number,
    fixedLiabilities: number,
  ): [netAssets: number, debtExcess: number] {
    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = currentLiabilities + fixedLiabilities;
    const balance = totalAssets - totalLiabilities;

    if (balance >= 0) {
      return [balance, 0];
    }
    return [0, Math.abs(balance)];
  },
};
