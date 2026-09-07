/**
 * Expense Transaction Types
 *
 * Transaction types for expense-related reports.
 * These types represent raw data retrieved from the database for expense transactions.
 *
 * 経常経費（SYUUSHI07_14）と政治活動費（SYUUSHI07_15）は、費目ごとに型・集約ロジック・
 * バリデーションがほぼ同型になる。ここでは共通部分をファクトリに切り出し、
 * 費目ごとの定義（型エイリアスと XML パス・費目名）を1箇所にまとめている。
 */

import {
  resolveExpenseAmount,
  sanitizeText,
  buildBikou,
  isAboveThreshold,
  FIVE_MAN_THRESHOLD,
} from "@/server/contexts/report/domain/models/transaction-utils";
import {
  type ValidationError,
  ValidationErrorCode,
} from "@/server/contexts/report/domain/types/validation";

/**
 * 経常経費・政治活動費のトランザクション基本型
 */
interface BaseExpenseTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
  transactionDate: Date;
  counterpartName: string; // 支払先の氏名
  counterpartAddress: string; // 支払先の住所
  isGrantExpenditure: boolean; // 交付金に係る支出かどうか
}

// ============================================================
// Output Types (Domain Objects for XML)
// ============================================================

/**
 * SYUUSHI07_14 KUBUN1/KUBUN2/KUBUN3: 経常経費の明細行
 */
export interface ExpenseRow {
  ichirenNo: string;
  mokuteki: string; // 目的
  kingaku: number;
  dt: Date; // 年月日
  nm: string; // 氏名
  adr: string; // 住所
  bikou?: string;
  ryousyu?: number; // 領収書区分
  koufukin?: number; // 交付金フラグ: 0=通常, 1=交付金に係る支出
}

/**
 * SYUUSHI07_15: 政治活動費の明細行
 * 仕様書によるとHIMOKUはSHEETレベルの項目であり、ROWレベルには含まれない
 */
export type PoliticalActivityExpenseRow = ExpenseRow;

/**
 * SYUUSHI07_14: 経常経費のセクション（費目ごとに1つ）
 */
interface RegularExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（5万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_15: 政治活動費のセクション（費目ごとに、さらに HIMOKU ごとに1つ）
 */
interface PoliticalActivityExpenseSection {
  himoku: string; // 費目（シート単位）
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（5万円未満）
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_13: 人件費セクション
 * 人件費はシート14に明細を出力しないため、合計額のみを保持
 */
export interface PersonnelExpenseSection {
  totalAmount: number;
}

// ============================================================
// Domain Logic (共通)
// ============================================================

/**
 * 取引金額を解決する（丸め済み）
 */
function resolveAmount(tx: BaseExpenseTransaction): number {
  return Math.round(resolveExpenseAmount(tx.debitAmount, tx.creditAmount));
}

/**
 * 閾値（5万円）以上かどうかを判定
 * 閾値以上の取引は明細行として個別に列挙し、未満の取引は合算する
 */
function isDetailRequired(tx: BaseExpenseTransaction): boolean {
  return isAboveThreshold(resolveAmount(tx), FIVE_MAN_THRESHOLD);
}

/**
 * 明細行に変換する
 */
function toExpenseRow(tx: BaseExpenseTransaction, index: number): ExpenseRow {
  return {
    ichirenNo: (index + 1).toString(),
    mokuteki: sanitizeText(tx.friendlyCategory, 200),
    kingaku: resolveAmount(tx),
    dt: tx.transactionDate,
    nm: sanitizeText(tx.counterpartName, 120),
    adr: sanitizeText(tx.counterpartAddress, 120),
    bikou: buildBikou(tx.transactionNo, tx.memo, 160, 100),
    koufukin: tx.isGrantExpenditure ? 1 : 0,
  };
}

/**
 * セクションの集約ロジック（共通）
 *
 * Business rules:
 * - Transactions >= 50,000 yen are listed individually
 * - Transactions < 50,000 yen are aggregated into underThresholdAmount
 */
function aggregateExpenseSection(transactions: BaseExpenseTransaction[]): RegularExpenseSection {
  const totalAmount = transactions.reduce((sum, tx) => sum + resolveAmount(tx), 0);

  const detailedTransactions = transactions.filter((tx) => isDetailRequired(tx));
  const underThresholdTransactions = transactions.filter((tx) => !isDetailRequired(tx));

  const underThresholdAmount = underThresholdTransactions.reduce(
    (sum, tx) => sum + resolveAmount(tx),
    0,
  );

  const rows = detailedTransactions.map((tx, index) => toExpenseRow(tx, index));

  return { totalAmount, underThresholdAmount, rows };
}

/**
 * 政治活動費セクションの集約ロジック（共通）
 * friendlyCategory（費目）でグループ化し、費目ごとに複数のセクションを返す
 */
function aggregatePoliticalActivitySections(
  transactions: BaseExpenseTransaction[],
): PoliticalActivityExpenseSection[] {
  // friendlyCategoryでグループ化
  const groupedByHimoku = new Map<string, BaseExpenseTransaction[]>();
  for (const tx of transactions) {
    const himoku = tx.friendlyCategory ?? "";
    const group = groupedByHimoku.get(himoku) ?? [];
    group.push(tx);
    groupedByHimoku.set(himoku, group);
  }

  // 各グループに対してセクションを作成
  const sections = Array.from(groupedByHimoku, ([himoku, groupTransactions]) => ({
    himoku,
    ...aggregateExpenseSection(groupTransactions),
  }));

  // 費目でソート（空文字は最後に）
  sections.sort((a, b) => {
    if (a.himoku === "" && b.himoku !== "") return 1;
    if (a.himoku !== "" && b.himoku === "") return -1;
    return a.himoku.localeCompare(b.himoku, "ja");
  });

  return sections;
}

/**
 * 経常経費・政治活動費セクションの共通バリデーションロジック
 */
function validateExpenseRows(
  rows: ExpenseRow[],
  basePath: string,
  sectionName: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const rowPath = `${basePath}.rows[${index}]`;

    if (!row.mokuteki) {
      errors.push({
        path: `${rowPath}.mokuteki`,
        code: ValidationErrorCode.REQUIRED,
        message: `${sectionName}の${rowNum}行目: 目的が入力されていません`,
        severity: "error",
      });
    } else if (row.mokuteki.length > 200) {
      errors.push({
        path: `${rowPath}.mokuteki`,
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: `${sectionName}の${rowNum}行目: 目的は200文字以内で入力してください`,
        severity: "error",
      });
    }

    if (row.kingaku === undefined || row.kingaku === null) {
      errors.push({
        path: `${rowPath}.kingaku`,
        code: ValidationErrorCode.REQUIRED,
        message: `${sectionName}の${rowNum}行目: 金額が入力されていません`,
        severity: "error",
      });
    } else if (row.kingaku <= 0) {
      errors.push({
        path: `${rowPath}.kingaku`,
        code: ValidationErrorCode.NEGATIVE_VALUE,
        message: `${sectionName}の${rowNum}行目: 金額は正の整数で入力してください`,
        severity: "error",
      });
    }

    if (!row.dt) {
      errors.push({
        path: `${rowPath}.dt`,
        code: ValidationErrorCode.REQUIRED,
        message: `${sectionName}の${rowNum}行目: 年月日が入力されていません`,
        severity: "error",
      });
    }

    if (!row.nm) {
      errors.push({
        path: `${rowPath}.nm`,
        code: ValidationErrorCode.REQUIRED,
        message: `${sectionName}の${rowNum}行目: 氏名が入力されていません`,
        severity: "error",
      });
    } else if (row.nm.length > 120) {
      errors.push({
        path: `${rowPath}.nm`,
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: `${sectionName}の${rowNum}行目: 氏名は120文字以内で入力してください`,
        severity: "error",
      });
    }

    if (!row.adr) {
      errors.push({
        path: `${rowPath}.adr`,
        code: ValidationErrorCode.REQUIRED,
        message: `${sectionName}の${rowNum}行目: 住所が入力されていません`,
        severity: "error",
      });
    } else if (row.adr.length > 120) {
      errors.push({
        path: `${rowPath}.adr`,
        code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
        message: `${sectionName}の${rowNum}行目: 住所は120文字以内で入力してください`,
        severity: "error",
      });
    }
  });

  return errors;
}

// ============================================================
// Section Factories
// ============================================================

interface RegularExpenseSectionModel {
  fromTransactions: (transactions: BaseExpenseTransaction[]) => RegularExpenseSection;
  shouldOutputSheet: (section: RegularExpenseSection) => boolean;
  validate: (section: RegularExpenseSection) => ValidationError[];
}

/**
 * 経常経費（SYUUSHI07_14）の費目セクションのドメインロジックを定義する
 *
 * @param basePath バリデーションエラーのパス（例: "expenses.utilityExpenses"）
 * @param sectionName バリデーションメッセージに使う費目名（例: "光熱水費"）
 */
function defineRegularExpenseSection(
  basePath: string,
  sectionName: string,
): RegularExpenseSectionModel {
  return {
    fromTransactions: (transactions) => aggregateExpenseSection(transactions),
    shouldOutputSheet: (section) => section.rows.length > 0 || section.totalAmount > 0,
    validate: (section) => validateExpenseRows(section.rows, basePath, sectionName),
  };
}

interface PoliticalActivityExpenseSectionModel {
  fromTransactions: (transactions: BaseExpenseTransaction[]) => PoliticalActivityExpenseSection[];
  shouldOutputSheet: (section: PoliticalActivityExpenseSection) => boolean;
  validate: (section: PoliticalActivityExpenseSection) => ValidationError[];
}

/**
 * 政治活動費（SYUUSHI07_15）の費目セクションのドメインロジックを定義する
 * 経常経費と異なり、friendlyCategory（費目）ごとに複数のセクションへ展開される
 *
 * @param basePath バリデーションエラーのパス（例: "expenses.organizationExpenses"）
 * @param sectionName バリデーションメッセージに使う費目名（例: "組織活動費"）
 */
function definePoliticalActivityExpenseSection(
  basePath: string,
  sectionName: string,
): PoliticalActivityExpenseSectionModel {
  return {
    fromTransactions: (transactions) => aggregatePoliticalActivitySections(transactions),
    shouldOutputSheet: (section) => section.rows.length > 0 || section.totalAmount > 0,
    validate: (section) => validateExpenseRows(section.rows, basePath, sectionName),
  };
}

// ============================================================
// 費目の定義
//
// 費目を1つ追加するときは、以下のいずれかの形式でブロックを1つ足すだけでよい。
// ============================================================

/** SYUUSHI07_14 KUBUN1: 光熱水費 */
export type UtilityExpenseTransaction = BaseExpenseTransaction;
export type UtilityExpenseSection = RegularExpenseSection;
export const UtilityExpenseSection = defineRegularExpenseSection(
  "expenses.utilityExpenses",
  "光熱水費",
);

/** SYUUSHI07_14 KUBUN2: 備品・消耗品費 */
export type SuppliesExpenseTransaction = BaseExpenseTransaction;
export type SuppliesExpenseSection = RegularExpenseSection;
export const SuppliesExpenseSection = defineRegularExpenseSection(
  "expenses.suppliesExpenses",
  "備品・消耗品費",
);

/** SYUUSHI07_14 KUBUN3: 事務所費 */
export type OfficeExpenseTransaction = BaseExpenseTransaction;
export type OfficeExpenseSection = RegularExpenseSection;
export const OfficeExpenseSection = defineRegularExpenseSection(
  "expenses.officeExpenses",
  "事務所費",
);

/** SYUUSHI07_15 KUBUN1: 組織活動費 */
export type OrganizationExpenseTransaction = BaseExpenseTransaction;
export type OrganizationExpenseSection = PoliticalActivityExpenseSection;
export const OrganizationExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.organizationExpenses",
  "組織活動費",
);

/** SYUUSHI07_15 KUBUN2: 選挙関係費 */
export type ElectionExpenseTransaction = BaseExpenseTransaction;
export type ElectionExpenseSection = PoliticalActivityExpenseSection;
export const ElectionExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.electionExpenses",
  "選挙関係費",
);

/** SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費 */
export type PublicationExpenseTransaction = BaseExpenseTransaction;
export type PublicationExpenseSection = PoliticalActivityExpenseSection;
export const PublicationExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.publicationExpenses",
  "機関紙誌の発行事業費",
);

/** SYUUSHI07_15 KUBUN4: 宣伝事業費 */
export type AdvertisingExpenseTransaction = BaseExpenseTransaction;
export type AdvertisingExpenseSection = PoliticalActivityExpenseSection;
export const AdvertisingExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.advertisingExpenses",
  "宣伝事業費",
);

/** SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費 */
export type FundraisingPartyExpenseTransaction = BaseExpenseTransaction;
export type FundraisingPartyExpenseSection = PoliticalActivityExpenseSection;
export const FundraisingPartyExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.fundraisingPartyExpenses",
  "政治資金パーティー開催事業費",
);

/** SYUUSHI07_15 KUBUN6: その他の事業費 */
export type OtherBusinessExpenseTransaction = BaseExpenseTransaction;
export type OtherBusinessExpenseSection = PoliticalActivityExpenseSection;
export const OtherBusinessExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.otherBusinessExpenses",
  "その他の事業費",
);

/** SYUUSHI07_15 KUBUN7: 調査研究費 */
export type ResearchExpenseTransaction = BaseExpenseTransaction;
export type ResearchExpenseSection = PoliticalActivityExpenseSection;
export const ResearchExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.researchExpenses",
  "調査研究費",
);

/** SYUUSHI07_15 KUBUN8: 寄附・交付金 */
export type DonationGrantExpenseTransaction = BaseExpenseTransaction;
export type DonationGrantExpenseSection = PoliticalActivityExpenseSection;
export const DonationGrantExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.donationGrantExpenses",
  "寄附・交付金",
);

/** SYUUSHI07_15 KUBUN9: その他の経費 */
export type OtherPoliticalExpenseTransaction = BaseExpenseTransaction;
export type OtherPoliticalExpenseSection = PoliticalActivityExpenseSection;
export const OtherPoliticalExpenseSection = definePoliticalActivityExpenseSection(
  "expenses.otherPoliticalExpenses",
  "その他の経費",
);

/**
 * SYUUSHI07_13: 人件費
 * 人件費はシート14に明細を出力しないが、シート13の総括表には合計額が必要なため、
 * 他の費目とは異なり合計額のみを保持する
 */
export type PersonnelExpenseTransaction = BaseExpenseTransaction;
export const PersonnelExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   * 人件費は明細行を持たず、合計額のみを保持
   */
  fromTransactions: (transactions: PersonnelExpenseTransaction[]): PersonnelExpenseSection => {
    return { totalAmount: transactions.reduce((sum, tx) => sum + resolveAmount(tx), 0) };
  },

  /**
   * シート14には出力しない（常にfalse）
   * シート13の総括表には合計額が出力される
   */
  shouldOutputSheet: (_section: PersonnelExpenseSection): boolean => {
    return false;
  },
} as const;
