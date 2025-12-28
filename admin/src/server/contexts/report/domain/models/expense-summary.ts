/**
 * Expense Summary Types
 *
 * Domain models for SYUUSHI07_13 (支出項目別金額の内訳・総括表).
 * This aggregates data from SYUUSHI07_14 (経常経費) and SYUUSHI07_15 (政治活動費).
 */

import type { ExpenseData } from "@/server/contexts/report/domain/models/report-data";

/**
 * 支出項目の金額・交付金・備考を保持する型
 */
export interface ExpenseSummaryItem {
  amount: number | null; // 金額
  grantAmount: number | null; // 交付金
  bikou: string | null; // 備考
}

/**
 * 経常経費の集計データ
 */
export interface RegularExpenseSummary {
  personnelExpense: ExpenseSummaryItem; // 人件費
  utilityExpense: ExpenseSummaryItem; // 光熱水費
  suppliesExpense: ExpenseSummaryItem; // 備品・消耗品費
  officeExpense: ExpenseSummaryItem; // 事務所費
  subtotal: ExpenseSummaryItem; // 経常経費小計
}

/**
 * 政治活動費の集計データ
 */
export interface PoliticalActivityExpenseSummary {
  organizationExpense: ExpenseSummaryItem; // 組織活動費
  electionExpense: ExpenseSummaryItem; // 選挙関係費
  businessExpense: ExpenseSummaryItem; // 機関紙誌の発行その他の事業費（4項目の合計）
  publicationExpense: ExpenseSummaryItem; // 機関紙誌の発行事業費（内訳）
  advertisingExpense: ExpenseSummaryItem; // 宣伝事業費（内訳）
  partyExpense: ExpenseSummaryItem; // パーティー開催事業費（内訳）
  otherBusinessExpense: ExpenseSummaryItem; // その他の事業費（内訳）
  researchExpense: ExpenseSummaryItem; // 調査研究費
  donationGrantExpense: ExpenseSummaryItem; // 寄附・交付金
  otherPoliticalExpense: ExpenseSummaryItem; // その他の経費
  subtotal: ExpenseSummaryItem; // 政治活動費小計
}

/**
 * SYUUSHI07_13: 支出項目別金額の内訳（総括表）
 */
export interface ExpenseSummaryData {
  regularExpenses: RegularExpenseSummary;
  politicalActivityExpenses: PoliticalActivityExpenseSummary;
  totalAmount: number; // 支出総額
}

/**
 * ExpenseSummaryItem のヘルパー関数
 */
const createSummaryItem = (amount: number | null): ExpenseSummaryItem => ({
  amount,
  grantAmount: null, // 交付金は現状のスコープ外
  bikou: null, // 備考は現状のスコープ外
});

/**
 * ExpenseSummaryData に関連するドメインロジック
 */
export const ExpenseSummaryData = {
  /**
   * ExpenseData から ExpenseSummaryData を生成する
   *
   * @param expenseData シート14/15のデータ + 人件費
   * @returns SYUUSHI07_13用の集計データ
   */
  fromExpenseData(expenseData: ExpenseData): ExpenseSummaryData {
    // 経常経費の各項目
    const personnelAmount = expenseData.personnelExpenses.totalAmount;
    const utilityAmount = expenseData.utilityExpenses.totalAmount;
    const suppliesAmount = expenseData.suppliesExpenses.totalAmount;
    const officeAmount = expenseData.officeExpenses.totalAmount;

    // 経常経費小計
    const regularSubtotal = personnelAmount + utilityAmount + suppliesAmount + officeAmount;

    // 政治活動費の各項目（配列の合計を計算）
    const organizationAmount = expenseData.organizationExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const electionAmount = expenseData.electionExpenses.reduce((sum, s) => sum + s.totalAmount, 0);
    const publicationAmount = expenseData.publicationExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const advertisingAmount = expenseData.advertisingExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const partyAmount = expenseData.fundraisingPartyExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const otherBusinessAmount = expenseData.otherBusinessExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const researchAmount = expenseData.researchExpenses.reduce((sum, s) => sum + s.totalAmount, 0);
    const donationGrantAmount = expenseData.donationGrantExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const otherPoliticalAmount = expenseData.otherPoliticalExpenses.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );

    // 機関紙誌の発行その他の事業費（4項目の合計）
    const businessAmount =
      publicationAmount + advertisingAmount + partyAmount + otherBusinessAmount;

    // 政治活動費小計
    const politicalSubtotal =
      organizationAmount +
      electionAmount +
      businessAmount +
      researchAmount +
      donationGrantAmount +
      otherPoliticalAmount;

    // 支出総額
    const totalAmount = regularSubtotal + politicalSubtotal;

    return {
      regularExpenses: {
        personnelExpense: createSummaryItem(personnelAmount > 0 ? personnelAmount : null),
        utilityExpense: createSummaryItem(utilityAmount > 0 ? utilityAmount : null),
        suppliesExpense: createSummaryItem(suppliesAmount > 0 ? suppliesAmount : null),
        officeExpense: createSummaryItem(officeAmount > 0 ? officeAmount : null),
        subtotal: createSummaryItem(regularSubtotal), // 小計は0でもOK
      },
      politicalActivityExpenses: {
        organizationExpense: createSummaryItem(organizationAmount), // 0でもOK
        electionExpense: createSummaryItem(electionAmount),
        businessExpense: createSummaryItem(businessAmount),
        publicationExpense: createSummaryItem(publicationAmount),
        advertisingExpense: createSummaryItem(advertisingAmount),
        partyExpense: createSummaryItem(partyAmount),
        otherBusinessExpense: createSummaryItem(otherBusinessAmount),
        researchExpense: createSummaryItem(researchAmount),
        donationGrantExpense: createSummaryItem(donationGrantAmount),
        otherPoliticalExpense: createSummaryItem(otherPoliticalAmount),
        subtotal: createSummaryItem(politicalSubtotal),
      },
      totalAmount,
    };
  },

  /**
   * SYUUSHI07_13 シートを出力すべきかどうかを判定
   * 支出総額が0でない場合（人件費のみの場合も含む）に出力
   */
  shouldOutputSheet(data: ExpenseSummaryData): boolean {
    return data.totalAmount > 0;
  },
} as const;
