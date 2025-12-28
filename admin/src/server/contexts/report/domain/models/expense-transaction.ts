/**
 * Expense Transaction Types
 *
 * Transaction types for expense-related reports.
 * These types represent raw data retrieved from the database for expense transactions.
 */

import {
  resolveExpenseAmount,
  sanitizeText,
  buildBikou,
  isAboveThreshold,
  TEN_MAN_THRESHOLD,
  FIVE_MAN_THRESHOLD,
} from "@/server/contexts/report/domain/models/transaction-utils";
import {
  type ValidationError,
  ValidationErrorCode,
} from "@/server/contexts/report/domain/types/validation";

/**
 * 経常経費（SYUUSHI07_14）のトランザクション基本型
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
}

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費のトランザクション
 */
export interface UtilityExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費のトランザクション
 */
export interface SuppliesExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費のトランザクション
 */
export interface OfficeExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費のトランザクション
 */
export interface OrganizationExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN2: 選挙関係費のトランザクション
 */
export interface ElectionExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費のトランザクション
 */
export interface PublicationExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN4: 宣伝事業費のトランザクション
 */
export interface AdvertisingExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費のトランザクション
 */
export interface FundraisingPartyExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN6: その他の事業費のトランザクション
 */
export interface OtherBusinessExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN7: 調査研究費のトランザクション
 */
export interface ResearchExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN8: 寄附・交付金のトランザクション
 */
export interface DonationGrantExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_15 KUBUN9: その他の経費のトランザクション
 */
export interface OtherPoliticalExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_13: 人件費のトランザクション
 * 人件費はシート14に明細を出力しないが、シート13の総括表には合計額が必要
 */
export interface PersonnelExpenseTransaction extends BaseExpenseTransaction {}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金のトランザクション
 */
export interface BranchGrantExpenseTransaction extends BaseExpenseTransaction {}

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
}

/**
 * SYUUSHI07_14 KUBUN1: 光熱水費
 */
export interface UtilityExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_14 KUBUN2: 備品・消耗品費
 */
export interface SuppliesExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_14 KUBUN3: 事務所費
 */
export interface OfficeExpenseSection {
  totalAmount: number;
  underThresholdAmount: number; // その他の支出（10万円未満）
  rows: ExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費の明細行
 * 仕様書によるとHIMOKUはSHEETレベルの項目であり、ROWレベルには含まれない
 */
export interface PoliticalActivityExpenseRow extends ExpenseRow {}

/**
 * SYUUSHI07_15 KUBUN1: 組織活動費
 */
export interface OrganizationExpenseSection {
  himoku: string; // 費目（シート単位）
  totalAmount: number;
  underThresholdAmount: number; // その他の支出
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN2: 選挙関係費
 */
export interface ElectionExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN3: 機関紙誌の発行事業費
 */
export interface PublicationExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN4: 宣伝事業費
 */
export interface AdvertisingExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN5: 政治資金パーティー開催事業費
 */
export interface FundraisingPartyExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN6: その他の事業費
 */
export interface OtherBusinessExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN7: 調査研究費
 */
export interface ResearchExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN8: 寄附・交付金
 */
export interface DonationGrantExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_15 KUBUN9: その他の経費
 */
export interface OtherPoliticalExpenseSection {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}

/**
 * SYUUSHI07_13: 人件費セクション
 * 人件費はシート14に明細を出力しないため、合計額のみを保持
 */
export interface PersonnelExpenseSection {
  totalAmount: number;
}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金の明細行
 */
export interface BranchGrantExpenseRow {
  ichirenNo: string;
  shisyutuKmk: string; // 支出項目
  kingaku: number;
  dt: Date;
  honsibuNm: string; // 本支部名称
  jimuAdr: string; // 所在地
  bikou?: string;
}

/**
 * SYUUSHI07_16: 本部又は支部に対する交付金セクション
 */
export interface BranchGrantExpenseSection {
  totalAmount: number;
  rows: BranchGrantExpenseRow[];
}

// ============================================================
// Domain Logic
// ============================================================

/**
 * ExpenseTransaction に共通するドメインロジック
 */
const ExpenseTransactionBase = {
  /**
   * 取引金額を解決する（丸め済み）
   */
  resolveAmount: (tx: BaseExpenseTransaction): number => {
    return Math.round(resolveExpenseAmount(tx.debitAmount, tx.creditAmount));
  },

  /**
   * 目的を取得する
   */
  getMokuteki: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.friendlyCategory, 200);
  },

  /**
   * 氏名を取得する
   */
  getNm: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.counterpartName, 120);
  },

  /**
   * 住所を取得する
   */
  getAdr: (tx: BaseExpenseTransaction): string => {
    return sanitizeText(tx.counterpartAddress, 120);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: BaseExpenseTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 100);
  },

  /**
   * 閾値（10万円）以上かどうかを判定
   */
  isAboveThreshold: (tx: BaseExpenseTransaction): boolean => {
    return isAboveThreshold(ExpenseTransactionBase.resolveAmount(tx), TEN_MAN_THRESHOLD);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: BaseExpenseTransaction, index: number): ExpenseRow => {
    return {
      ichirenNo: (index + 1).toString(),
      mokuteki: ExpenseTransactionBase.getMokuteki(tx),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      nm: ExpenseTransactionBase.getNm(tx),
      adr: ExpenseTransactionBase.getAdr(tx),
      bikou: ExpenseTransactionBase.getBikou(tx),
    };
  },
};

/**
 * UtilityExpenseTransaction に関連するドメインロジック
 */
export const UtilityExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

/**
 * SuppliesExpenseTransaction に関連するドメインロジック
 */
export const SuppliesExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

/**
 * OfficeExpenseTransaction に関連するドメインロジック
 */
export const OfficeExpenseTransaction = {
  ...ExpenseTransactionBase,
} as const;

/**
 * OrganizationExpenseTransaction に関連するドメインロジック
 */
export const OrganizationExpenseTransaction = {
  ...ExpenseTransactionBase,

  /**
   * 明細行に変換する
   * 注: HIMOKUはSHEETレベルの項目であり、ROWには含めない（仕様書準拠）
   */
  toRow: (tx: OrganizationExpenseTransaction, index: number): PoliticalActivityExpenseRow => {
    return {
      ichirenNo: (index + 1).toString(),
      mokuteki: ExpenseTransactionBase.getMokuteki(tx),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      nm: ExpenseTransactionBase.getNm(tx),
      adr: ExpenseTransactionBase.getAdr(tx),
      bikou: ExpenseTransactionBase.getBikou(tx),
    };
  },
} as const;

// ============================================================
// Section Aggregation Logic
// ============================================================

/**
 * ExpenseSection の集約ロジック（共通）
 */
function aggregateExpenseSection<T extends BaseExpenseTransaction>(
  transactions: T[],
): { totalAmount: number; underThresholdAmount: number; rows: ExpenseRow[] } {
  const totalAmount = transactions.reduce(
    (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
    0,
  );

  const detailedTransactions = transactions.filter((tx) =>
    ExpenseTransactionBase.isAboveThreshold(tx),
  );
  const underThresholdTransactions = transactions.filter(
    (tx) => !ExpenseTransactionBase.isAboveThreshold(tx),
  );

  const underThresholdAmount = underThresholdTransactions.reduce(
    (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
    0,
  );

  const rows = detailedTransactions.map((tx, index) => ExpenseTransactionBase.toRow(tx, index));

  return { totalAmount, underThresholdAmount, rows };
}

/**
 * 経常経費セクションの共通バリデーションロジック
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

/**
 * UtilityExpenseSection に関連するドメインロジック
 */
export const UtilityExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (transactions: UtilityExpenseTransaction[]): UtilityExpenseSection => {
    return aggregateExpenseSection(transactions);
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: UtilityExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   */
  validate: (section: UtilityExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.utilityExpenses", "光熱水費");
  },
} as const;

/**
 * SuppliesExpenseSection に関連するドメインロジック
 */
export const SuppliesExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (transactions: SuppliesExpenseTransaction[]): SuppliesExpenseSection => {
    return aggregateExpenseSection(transactions);
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: SuppliesExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   */
  validate: (section: SuppliesExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.suppliesExpenses", "備品・消耗品費");
  },
} as const;

/**
 * OfficeExpenseSection に関連するドメインロジック
 */
export const OfficeExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (transactions: OfficeExpenseTransaction[]): OfficeExpenseSection => {
    return aggregateExpenseSection(transactions);
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: OfficeExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   */
  validate: (section: OfficeExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.officeExpenses", "事務所費");
  },
} as const;

/**
 * OrganizationExpenseSection に関連するドメインロジック
 */
export const OrganizationExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 50,000 yen are listed individually (政治活動費は5万円以上)
   * - Transactions < 50,000 yen are aggregated into underThresholdAmount
   * - friendlyCategoryでグループ化し、費目ごとに複数のセクションを返す
   */
  fromTransactions: (
    transactions: OrganizationExpenseTransaction[],
  ): OrganizationExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: OrganizationExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   */
  validate: (section: OrganizationExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.organizationExpenses", "組織活動費");
  },
} as const;

/**
 * 政治活動費セクション共通の集約ロジック（5万円閾値）
 * friendlyCategoryでグループ化し、費目ごとに複数のセクションを返す
 */
function aggregatePoliticalActivitySections<T extends BaseExpenseTransaction>(
  transactions: T[],
): Array<{
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: PoliticalActivityExpenseRow[];
}> {
  // friendlyCategoryでグループ化
  const groupedByHimoku = new Map<string, T[]>();
  for (const tx of transactions) {
    const himoku = tx.friendlyCategory ?? "";
    const group = groupedByHimoku.get(himoku) ?? [];
    group.push(tx);
    groupedByHimoku.set(himoku, group);
  }

  // 各グループに対してセクションを作成
  const sections: Array<{
    himoku: string;
    totalAmount: number;
    underThresholdAmount: number;
    rows: PoliticalActivityExpenseRow[];
  }> = [];

  for (const [himoku, groupTransactions] of groupedByHimoku) {
    const totalAmount = groupTransactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    const detailedTransactions = groupTransactions.filter((tx) =>
      isAboveThreshold(ExpenseTransactionBase.resolveAmount(tx), FIVE_MAN_THRESHOLD),
    );
    const underThresholdTransactions = groupTransactions.filter(
      (tx) => !isAboveThreshold(ExpenseTransactionBase.resolveAmount(tx), FIVE_MAN_THRESHOLD),
    );

    const underThresholdAmount = underThresholdTransactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    const rows = detailedTransactions.map((tx, index) => ({
      ichirenNo: (index + 1).toString(),
      mokuteki: ExpenseTransactionBase.getMokuteki(tx),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      nm: ExpenseTransactionBase.getNm(tx),
      adr: ExpenseTransactionBase.getAdr(tx),
      bikou: ExpenseTransactionBase.getBikou(tx),
    }));

    sections.push({
      himoku,
      totalAmount,
      underThresholdAmount,
      rows,
    });
  }

  // 費目でソート（空文字は最後に）
  sections.sort((a, b) => {
    if (a.himoku === "" && b.himoku !== "") return 1;
    if (a.himoku !== "" && b.himoku === "") return -1;
    return a.himoku.localeCompare(b.himoku, "ja");
  });

  return sections;
}

/**
 * ElectionExpenseSection に関連するドメインロジック
 */
export const ElectionExpenseSection = {
  fromTransactions: (transactions: ElectionExpenseTransaction[]): ElectionExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: ElectionExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: ElectionExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.electionExpenses", "選挙関係費");
  },
} as const;

/**
 * PublicationExpenseSection に関連するドメインロジック
 */
export const PublicationExpenseSection = {
  fromTransactions: (
    transactions: PublicationExpenseTransaction[],
  ): PublicationExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: PublicationExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: PublicationExpenseSection): ValidationError[] => {
    return validateExpenseRows(
      section.rows,
      "expenses.publicationExpenses",
      "機関紙誌の発行事業費",
    );
  },
} as const;

/**
 * AdvertisingExpenseSection に関連するドメインロジック
 */
export const AdvertisingExpenseSection = {
  fromTransactions: (
    transactions: AdvertisingExpenseTransaction[],
  ): AdvertisingExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: AdvertisingExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: AdvertisingExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.advertisingExpenses", "宣伝事業費");
  },
} as const;

/**
 * FundraisingPartyExpenseSection に関連するドメインロジック
 */
export const FundraisingPartyExpenseSection = {
  fromTransactions: (
    transactions: FundraisingPartyExpenseTransaction[],
  ): FundraisingPartyExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: FundraisingPartyExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: FundraisingPartyExpenseSection): ValidationError[] => {
    return validateExpenseRows(
      section.rows,
      "expenses.fundraisingPartyExpenses",
      "政治資金パーティー開催事業費",
    );
  },
} as const;

/**
 * OtherBusinessExpenseSection に関連するドメインロジック
 */
export const OtherBusinessExpenseSection = {
  fromTransactions: (
    transactions: OtherBusinessExpenseTransaction[],
  ): OtherBusinessExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: OtherBusinessExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: OtherBusinessExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.otherBusinessExpenses", "その他の事業費");
  },
} as const;

/**
 * ResearchExpenseSection に関連するドメインロジック
 */
export const ResearchExpenseSection = {
  fromTransactions: (transactions: ResearchExpenseTransaction[]): ResearchExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: ResearchExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: ResearchExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.researchExpenses", "調査研究費");
  },
} as const;

/**
 * DonationGrantExpenseSection に関連するドメインロジック
 */
export const DonationGrantExpenseSection = {
  fromTransactions: (
    transactions: DonationGrantExpenseTransaction[],
  ): DonationGrantExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: DonationGrantExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: DonationGrantExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.donationGrantExpenses", "寄附・交付金");
  },
} as const;

/**
 * OtherPoliticalExpenseSection に関連するドメインロジック
 */
export const OtherPoliticalExpenseSection = {
  fromTransactions: (
    transactions: OtherPoliticalExpenseTransaction[],
  ): OtherPoliticalExpenseSection[] => {
    return aggregatePoliticalActivitySections(transactions);
  },

  shouldOutputSheet: (section: OtherPoliticalExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  validate: (section: OtherPoliticalExpenseSection): ValidationError[] => {
    return validateExpenseRows(section.rows, "expenses.otherPoliticalExpenses", "その他の経費");
  },
} as const;

/**
 * PersonnelExpenseSection に関連するドメインロジック
 * 人件費はシート14に明細を出力しないため、合計額のみを計算
 */
export const PersonnelExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   * 人件費は明細行を持たず、合計額のみを保持
   */
  fromTransactions: (transactions: PersonnelExpenseTransaction[]): PersonnelExpenseSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    return { totalAmount };
  },

  /**
   * シート14には出力しない（常にfalse）
   * シート13の総括表には合計額が出力される
   */
  shouldOutputSheet: (_section: PersonnelExpenseSection): boolean => {
    return false;
  },
} as const;

/**
 * BranchGrantExpenseSection に関連するドメインロジック
 */
export const BranchGrantExpenseSection = {
  /**
   * トランザクションリストからセクションを構築する
   * 本支部交付金は全件を明細として出力（金額閾値による省略なし）
   */
  fromTransactions: (transactions: BranchGrantExpenseTransaction[]): BranchGrantExpenseSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + ExpenseTransactionBase.resolveAmount(tx),
      0,
    );

    const rows: BranchGrantExpenseRow[] = transactions.map((tx, index) => ({
      ichirenNo: (index + 1).toString(),
      shisyutuKmk: sanitizeText(tx.friendlyCategory, 100),
      kingaku: ExpenseTransactionBase.resolveAmount(tx),
      dt: tx.transactionDate,
      honsibuNm: sanitizeText(tx.counterpartName, 120),
      jimuAdr: sanitizeText(tx.counterpartAddress, 120),
      bikou: buildBikou(tx.transactionNo, tx.memo, 160, 100) || undefined,
    }));

    return { totalAmount, rows };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: BranchGrantExpenseSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },
} as const;
