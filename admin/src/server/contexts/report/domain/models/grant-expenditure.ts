/**
 * Grant Expenditure Types
 *
 * Domain models for SYUUSHI07_16 (本部又は支部に対する交付金の支出).
 * This extracts grant expenditure details from SYUUSHI07_14 and SYUUSHI07_15.
 */

import type { ExpenseRow } from "@/server/contexts/report/domain/models/expense-transaction";

/**
 * シート16の明細行
 */
export interface GrantExpenditureRow {
  ichirenNo: string;
  shisyutuKmk: string; // 支出項目（費目名）
  kingaku: number;
  dt: Date;
  honsibuNm: string; // 本支部名称（= NM）
  jimuAdr: string; // 主たる事務所の所在地（= ADR）
  bikou?: string;
}

/**
 * シート16のセクション
 */
export interface GrantExpenditureSection {
  totalAmount: number; // KINGAKU_GK
  rows: GrantExpenditureRow[];
}

/**
 * カテゴリキーから費目名へのマッピング
 */
const CATEGORY_TO_SHISYUTU_KMK: Record<string, string> = {
  "utility-expenses": "光熱水費",
  "supplies-expenses": "備品・消耗品費",
  "office-expenses": "事務所費",
  "organization-expenses": "組織活動費",
  "election-expenses": "選挙関係費",
  "publication-expenses": "機関紙誌の発行事業費",
  "advertising-expenses": "宣伝事業費",
  "fundraising-party-expenses": "政治資金パーティー開催事業費",
  "other-business-expenses": "その他の事業費",
  "research-expenses": "調査研究費",
  "donation-grant-expenses": "寄附・交付金",
  "other-political-expenses": "その他の経費",
};

/**
 * ExpenseRow から GrantExpenditureRow に変換する
 */
function convertToGrantExpenditureRow(
  row: ExpenseRow,
  categoryKey: string,
  index: number,
): GrantExpenditureRow {
  return {
    ichirenNo: (index + 1).toString(),
    shisyutuKmk: CATEGORY_TO_SHISYUTU_KMK[categoryKey] ?? categoryKey,
    kingaku: row.kingaku,
    dt: row.dt,
    honsibuNm: row.nm,
    jimuAdr: row.adr,
    bikou: row.bikou,
  };
}

/**
 * fromExpenseSections の入力型
 */
export interface FromExpenseSectionsInput {
  utilityExpenses: { rows: ExpenseRow[] };
  suppliesExpenses: { rows: ExpenseRow[] };
  officeExpenses: { rows: ExpenseRow[] };
  organizationExpenses: Array<{ rows: ExpenseRow[] }>;
  electionExpenses: Array<{ rows: ExpenseRow[] }>;
  publicationExpenses: Array<{ rows: ExpenseRow[] }>;
  advertisingExpenses: Array<{ rows: ExpenseRow[] }>;
  fundraisingPartyExpenses: Array<{ rows: ExpenseRow[] }>;
  otherBusinessExpenses: Array<{ rows: ExpenseRow[] }>;
  researchExpenses: Array<{ rows: ExpenseRow[] }>;
  donationGrantExpenses: Array<{ rows: ExpenseRow[] }>;
  otherPoliticalExpenses: Array<{ rows: ExpenseRow[] }>;
}

/**
 * GrantExpenditureSection に関連するドメインロジック
 */
export const GrantExpenditureSection = {
  /**
   * 経常経費と政治活動費のセクションから交付金フラグ付き明細を抽出してセクションを構築する
   */
  fromExpenseSections(input: FromExpenseSectionsInput): GrantExpenditureSection {
    const grantRows: GrantExpenditureRow[] = [];

    // 経常経費から交付金フラグ付き明細を抽出
    const extractFromRegularExpense = (rows: ExpenseRow[], categoryKey: string) => {
      rows
        .filter((row) => row.koufukin === 1)
        .forEach((row) => {
          grantRows.push(convertToGrantExpenditureRow(row, categoryKey, grantRows.length));
        });
    };

    extractFromRegularExpense(input.utilityExpenses.rows, "utility-expenses");
    extractFromRegularExpense(input.suppliesExpenses.rows, "supplies-expenses");
    extractFromRegularExpense(input.officeExpenses.rows, "office-expenses");

    // 政治活動費から交付金フラグ付き明細を抽出
    const extractFromPoliticalExpense = (
      sections: Array<{ rows: ExpenseRow[] }>,
      categoryKey: string,
    ) => {
      for (const section of sections) {
        section.rows
          .filter((row) => row.koufukin === 1)
          .forEach((row) => {
            grantRows.push(convertToGrantExpenditureRow(row, categoryKey, grantRows.length));
          });
      }
    };

    extractFromPoliticalExpense(input.organizationExpenses, "organization-expenses");
    extractFromPoliticalExpense(input.electionExpenses, "election-expenses");
    extractFromPoliticalExpense(input.publicationExpenses, "publication-expenses");
    extractFromPoliticalExpense(input.advertisingExpenses, "advertising-expenses");
    extractFromPoliticalExpense(input.fundraisingPartyExpenses, "fundraising-party-expenses");
    extractFromPoliticalExpense(input.otherBusinessExpenses, "other-business-expenses");
    extractFromPoliticalExpense(input.researchExpenses, "research-expenses");
    extractFromPoliticalExpense(input.donationGrantExpenses, "donation-grant-expenses");
    extractFromPoliticalExpense(input.otherPoliticalExpenses, "other-political-expenses");

    // 連番を振り直す
    grantRows.forEach((row, index) => {
      row.ichirenNo = (index + 1).toString();
    });

    // 総額を計算
    const totalAmount = grantRows.reduce((sum, row) => sum + row.kingaku, 0);

    return {
      totalAmount,
      rows: grantRows,
    };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet(section: GrantExpenditureSection): boolean {
    return section.rows.length > 0;
  },
} as const;
