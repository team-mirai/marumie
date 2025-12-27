/**
 * Income Transaction Types
 *
 * Input types for income-related transactions fetched from the repository.
 * These types represent the data structure returned by the database layer.
 */

import {
  resolveIncomeAmount,
  sanitizeText,
  buildBikou,
  isAboveThreshold,
  TEN_MAN_THRESHOLD,
} from "@/server/contexts/report/domain/models/transaction-utils";
import {
  type ValidationError,
  ValidationErrorCode,
} from "@/server/contexts/report/domain/types/validation";

/**
 * 共通フィールド（全収入トランザクション共通）
 */
interface BaseIncomeTransaction {
  transactionNo: string;
  friendlyCategory: string | null;
  label: string | null;
  description: string | null;
  memo: string | null;
  debitAmount: number;
  creditAmount: number;
}

/**
 * SYUUSHI07_03: 事業による収入のトランザクション
 */
export interface BusinessIncomeTransaction extends BaseIncomeTransaction {}

/**
 * SYUUSHI07_04: 借入金のトランザクション
 */
export interface LoanIncomeTransaction extends BaseIncomeTransaction {
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

/**
 * SYUUSHI07_05: 交付金のトランザクション
 */
export interface GrantIncomeTransaction extends BaseIncomeTransaction {
  transactionDate: Date;
  counterpartName: string;
  counterpartAddress: string;
}

/**
 * SYUUSHI07_06: その他の収入のトランザクション
 */
export interface OtherIncomeTransaction extends BaseIncomeTransaction {}

// ============================================================
// Output Types (Domain Objects for XML)
// ============================================================

/**
 * SYUUSHI07_03: 事業による収入の明細行
 */
export interface BusinessIncomeRow {
  ichirenNo: string;
  gigyouSyurui: string; // 事業の種類
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_03: 事業による収入
 */
export interface BusinessIncomeSection {
  totalAmount: number;
  rows: BusinessIncomeRow[];
}

/**
 * SYUUSHI07_04: 借入金の明細行
 */
export interface LoanIncomeRow {
  ichirenNo: string;
  kariiresaki: string; // 借入先
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_04: 借入金
 */
export interface LoanIncomeSection {
  totalAmount: number;
  rows: LoanIncomeRow[];
}

/**
 * SYUUSHI07_05: 本部又は支部から供与された交付金の明細行
 */
export interface GrantIncomeRow {
  ichirenNo: string;
  honsibuNm: string; // 本支部名称
  kingaku: number;
  dt: Date; // 年月日
  jimuAdr: string; // 主たる事務所の所在地
  bikou?: string;
}

/**
 * SYUUSHI07_05: 本部又は支部から供与された交付金
 */
export interface GrantIncomeSection {
  totalAmount: number;
  rows: GrantIncomeRow[];
}

/**
 * SYUUSHI07_06: その他の収入の明細行
 */
export interface OtherIncomeRow {
  ichirenNo: string;
  tekiyou: string;
  kingaku: number;
  bikou?: string;
}

/**
 * SYUUSHI07_06: その他の収入
 */
export interface OtherIncomeSection {
  totalAmount: number;
  underThresholdAmount: number;
  rows: OtherIncomeRow[];
}

// ============================================================
// Domain Logic
// ============================================================

/**
 * BusinessIncomeTransaction に関連するドメインロジック
 */
export const BusinessIncomeTransaction = {
  /**
   * 取引金額を解決する
   */
  resolveAmount: (tx: BusinessIncomeTransaction): number => {
    return resolveIncomeAmount(tx.debitAmount, tx.creditAmount);
  },

  /**
   * 事業の種類を取得する
   */
  getGigyouSyurui: (tx: BusinessIncomeTransaction): string => {
    return sanitizeText(tx.friendlyCategory, 200);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: BusinessIncomeTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 200);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: BusinessIncomeTransaction, index: number): BusinessIncomeRow => {
    return {
      ichirenNo: (index + 1).toString(),
      gigyouSyurui: BusinessIncomeTransaction.getGigyouSyurui(tx),
      kingaku: Math.round(BusinessIncomeTransaction.resolveAmount(tx)),
      bikou: BusinessIncomeTransaction.getBikou(tx),
    };
  },
} as const;

/**
 * LoanIncomeTransaction に関連するドメインロジック
 */
export const LoanIncomeTransaction = {
  /**
   * 取引金額を解決する
   */
  resolveAmount: (tx: LoanIncomeTransaction): number => {
    return resolveIncomeAmount(tx.debitAmount, tx.creditAmount);
  },

  /**
   * 借入先を取得する
   */
  getKariiresaki: (tx: LoanIncomeTransaction): string => {
    return sanitizeText(tx.counterpartName, 200);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: LoanIncomeTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 200);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: LoanIncomeTransaction, index: number): LoanIncomeRow => {
    return {
      ichirenNo: (index + 1).toString(),
      kariiresaki: LoanIncomeTransaction.getKariiresaki(tx),
      kingaku: Math.round(LoanIncomeTransaction.resolveAmount(tx)),
      bikou: LoanIncomeTransaction.getBikou(tx),
    };
  },
} as const;

/**
 * GrantIncomeTransaction に関連するドメインロジック
 */
export const GrantIncomeTransaction = {
  /**
   * 取引金額を解決する
   */
  resolveAmount: (tx: GrantIncomeTransaction): number => {
    return resolveIncomeAmount(tx.debitAmount, tx.creditAmount);
  },

  /**
   * 本支部名称を取得する
   */
  getHonsibuNm: (tx: GrantIncomeTransaction): string => {
    return sanitizeText(tx.counterpartName, 120);
  },

  /**
   * 事務所所在地を取得する
   */
  getJimuAdr: (tx: GrantIncomeTransaction): string => {
    return sanitizeText(tx.counterpartAddress, 80);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: GrantIncomeTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 200);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: GrantIncomeTransaction, index: number): GrantIncomeRow => {
    return {
      ichirenNo: (index + 1).toString(),
      honsibuNm: GrantIncomeTransaction.getHonsibuNm(tx),
      kingaku: Math.round(GrantIncomeTransaction.resolveAmount(tx)),
      dt: tx.transactionDate,
      jimuAdr: GrantIncomeTransaction.getJimuAdr(tx),
      bikou: GrantIncomeTransaction.getBikou(tx),
    };
  },
} as const;

/**
 * OtherIncomeTransaction に関連するドメインロジック
 */
export const OtherIncomeTransaction = {
  /**
   * 取引金額を解決する
   */
  resolveAmount: (tx: OtherIncomeTransaction): number => {
    return resolveIncomeAmount(tx.debitAmount, tx.creditAmount);
  },

  /**
   * 摘要を取得する
   */
  getTekiyou: (tx: OtherIncomeTransaction): string => {
    return sanitizeText(tx.friendlyCategory, 200);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: OtherIncomeTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 160, 200);
  },

  /**
   * 閾値（10万円）以上かどうかを判定
   */
  isAboveThreshold: (tx: OtherIncomeTransaction): boolean => {
    return isAboveThreshold(OtherIncomeTransaction.resolveAmount(tx), TEN_MAN_THRESHOLD);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: OtherIncomeTransaction, index: number): OtherIncomeRow => {
    return {
      ichirenNo: (index + 1).toString(),
      tekiyou: OtherIncomeTransaction.getTekiyou(tx),
      kingaku: Math.round(OtherIncomeTransaction.resolveAmount(tx)),
      bikou: OtherIncomeTransaction.getBikou(tx),
    };
  },
} as const;

// ============================================================
// Section Aggregation Logic
// ============================================================

/**
 * BusinessIncomeSection に関連するドメインロジック
 */
export const BusinessIncomeSection = {
  /**
   * トランザクションリストからセクションを構築する
   */
  fromTransactions: (transactions: BusinessIncomeTransaction[]): BusinessIncomeSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + BusinessIncomeTransaction.resolveAmount(tx),
      0,
    );

    const rows = transactions.map((tx, index) => BusinessIncomeTransaction.toRow(tx, index));

    return { totalAmount, rows };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: BusinessIncomeSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   *
   * SYUUSHI07_03（事業による収入）のバリデーション:
   * - 事業の種類 (GIGYOU_SYURUI): 必須、200文字以内
   * - 金額 (KINGAKU): 必須、正の整数
   */
  validate: (section: BusinessIncomeSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      const rowNum = index + 1;
      const basePath = `income.businessIncome.rows[${index}]`;

      if (!row.gigyouSyurui) {
        errors.push({
          path: `${basePath}.gigyouSyurui`,
          code: ValidationErrorCode.REQUIRED,
          message: `事業収入の${rowNum}行目: 事業の種類が入力されていません`,
          severity: "error",
        });
      } else if (row.gigyouSyurui.length > 200) {
        errors.push({
          path: `${basePath}.gigyouSyurui`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `事業収入の${rowNum}行目: 事業の種類は200文字以内で入力してください`,
          severity: "error",
        });
      }

      if (row.kingaku === undefined || row.kingaku === null) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.REQUIRED,
          message: `事業収入の${rowNum}行目: 金額が入力されていません`,
          severity: "error",
        });
      } else if (row.kingaku <= 0) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.NEGATIVE_VALUE,
          message: `事業収入の${rowNum}行目: 金額は正の整数で入力してください`,
          severity: "error",
        });
      }
    });

    return errors;
  },
} as const;

/**
 * LoanIncomeSection に関連するドメインロジック
 */
export const LoanIncomeSection = {
  /**
   * トランザクションリストからセクションを構築する
   */
  fromTransactions: (transactions: LoanIncomeTransaction[]): LoanIncomeSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + LoanIncomeTransaction.resolveAmount(tx),
      0,
    );

    const rows = transactions.map((tx, index) => LoanIncomeTransaction.toRow(tx, index));

    return { totalAmount, rows };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: LoanIncomeSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   *
   * SYUUSHI07_04（借入金）のバリデーション:
   * - 借入先 (KARIIRESAKI): 必須、200文字以内
   * - 金額 (KINGAKU): 必須、正の整数
   */
  validate: (section: LoanIncomeSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      const rowNum = index + 1;
      const basePath = `income.loanIncome.rows[${index}]`;

      if (!row.kariiresaki) {
        errors.push({
          path: `${basePath}.kariiresaki`,
          code: ValidationErrorCode.REQUIRED,
          message: `借入金の${rowNum}行目: 借入先が入力されていません`,
          severity: "error",
        });
      } else if (row.kariiresaki.length > 200) {
        errors.push({
          path: `${basePath}.kariiresaki`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `借入金の${rowNum}行目: 借入先は200文字以内で入力してください`,
          severity: "error",
        });
      }

      if (row.kingaku === undefined || row.kingaku === null) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.REQUIRED,
          message: `借入金の${rowNum}行目: 金額が入力されていません`,
          severity: "error",
        });
      } else if (row.kingaku <= 0) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.NEGATIVE_VALUE,
          message: `借入金の${rowNum}行目: 金額は正の整数で入力してください`,
          severity: "error",
        });
      }
    });

    return errors;
  },
} as const;

/**
 * GrantIncomeSection に関連するドメインロジック
 */
export const GrantIncomeSection = {
  /**
   * トランザクションリストからセクションを構築する
   */
  fromTransactions: (transactions: GrantIncomeTransaction[]): GrantIncomeSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + GrantIncomeTransaction.resolveAmount(tx),
      0,
    );

    const rows = transactions.map((tx, index) => GrantIncomeTransaction.toRow(tx, index));

    return { totalAmount, rows };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: GrantIncomeSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   *
   * SYUUSHI07_05（交付金）のバリデーション:
   * - 本支部名称 (HONSIBU_NM): 必須、120文字以内
   * - 金額 (KINGAKU): 必須、正の整数
   * - 年月日 (DT): 必須
   * - 事務所所在地 (JIMU_ADR): 必須、80文字以内
   */
  validate: (section: GrantIncomeSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      const rowNum = index + 1;
      const basePath = `income.grantIncome.rows[${index}]`;

      if (!row.honsibuNm) {
        errors.push({
          path: `${basePath}.honsibuNm`,
          code: ValidationErrorCode.REQUIRED,
          message: `交付金の${rowNum}行目: 本支部名称が入力されていません`,
          severity: "error",
        });
      } else if (row.honsibuNm.length > 120) {
        errors.push({
          path: `${basePath}.honsibuNm`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `交付金の${rowNum}行目: 本支部名称は120文字以内で入力してください`,
          severity: "error",
        });
      }

      if (row.kingaku === undefined || row.kingaku === null) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.REQUIRED,
          message: `交付金の${rowNum}行目: 金額が入力されていません`,
          severity: "error",
        });
      } else if (row.kingaku <= 0) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.NEGATIVE_VALUE,
          message: `交付金の${rowNum}行目: 金額は正の整数で入力してください`,
          severity: "error",
        });
      }

      if (!row.dt) {
        errors.push({
          path: `${basePath}.dt`,
          code: ValidationErrorCode.REQUIRED,
          message: `交付金の${rowNum}行目: 年月日が入力されていません`,
          severity: "error",
        });
      }

      if (!row.jimuAdr) {
        errors.push({
          path: `${basePath}.jimuAdr`,
          code: ValidationErrorCode.REQUIRED,
          message: `交付金の${rowNum}行目: 事務所所在地が入力されていません`,
          severity: "error",
        });
      } else if (row.jimuAdr.length > 80) {
        errors.push({
          path: `${basePath}.jimuAdr`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `交付金の${rowNum}行目: 事務所所在地は80文字以内で入力してください`,
          severity: "error",
        });
      }
    });

    return errors;
  },
} as const;

/**
 * OtherIncomeSection に関連するドメインロジック
 */
export const OtherIncomeSection = {
  /**
   * トランザクションリストからセクションを構築する
   *
   * Business rules:
   * - Transactions >= 100,000 yen are listed individually
   * - Transactions < 100,000 yen are aggregated into underThresholdAmount
   */
  fromTransactions: (transactions: OtherIncomeTransaction[]): OtherIncomeSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + OtherIncomeTransaction.resolveAmount(tx),
      0,
    );

    const detailedTransactions = transactions.filter((tx) =>
      OtherIncomeTransaction.isAboveThreshold(tx),
    );
    const underThresholdTransactions = transactions.filter(
      (tx) => !OtherIncomeTransaction.isAboveThreshold(tx),
    );

    const underThresholdAmount = underThresholdTransactions.reduce(
      (sum, tx) => sum + OtherIncomeTransaction.resolveAmount(tx),
      0,
    );

    const rows = detailedTransactions.map((tx, index) => OtherIncomeTransaction.toRow(tx, index));

    return { totalAmount, underThresholdAmount, rows };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: OtherIncomeSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   *
   * SYUUSHI07_06（その他の収入）のバリデーション:
   * - 摘要 (TEKIYOU): 必須、200文字以内
   * - 金額 (KINGAKU): 必須、正の整数
   */
  validate: (section: OtherIncomeSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      const rowNum = index + 1;
      const basePath = `income.otherIncome.rows[${index}]`;

      if (!row.tekiyou) {
        errors.push({
          path: `${basePath}.tekiyou`,
          code: ValidationErrorCode.REQUIRED,
          message: `その他収入の${rowNum}行目: 摘要が入力されていません`,
          severity: "error",
        });
      } else if (row.tekiyou.length > 200) {
        errors.push({
          path: `${basePath}.tekiyou`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `その他収入の${rowNum}行目: 摘要は200文字以内で入力してください`,
          severity: "error",
        });
      }

      if (row.kingaku === undefined || row.kingaku === null) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.REQUIRED,
          message: `その他収入の${rowNum}行目: 金額が入力されていません`,
          severity: "error",
        });
      } else if (row.kingaku <= 0) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.NEGATIVE_VALUE,
          message: `その他収入の${rowNum}行目: 金額は正の整数で入力してください`,
          severity: "error",
        });
      }
    });

    return errors;
  },
} as const;
