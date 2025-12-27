/**
 * Donation Transaction Types
 *
 * Input types for donation-related transactions fetched from the repository.
 * These types represent the data structure returned by the database layer.
 */

import {
  resolveIncomeAmount,
  sanitizeText,
  buildBikou,
} from "@/server/contexts/report/domain/models/transaction-utils";
import {
  type ValidationError,
  ValidationErrorCode,
} from "@/server/contexts/report/domain/types/validation";

/**
 * SYUUSHI07_07 KUBUN1: 個人からの寄附のトランザクション
 */
export interface PersonalDonationTransaction {
  transactionNo: string;
  transactionDate: Date;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  // 寄付者情報（現在はダミー値を返す）
  donorName: string; // 寄附者氏名
  donorAddress: string; // 住所
  donorOccupation: string; // 職業
}

// ============================================================
// Output Types (Domain Objects for XML)
// ============================================================

/**
 * SYUUSHI07_07 KUBUN1: 個人からの寄附の明細行
 */
export interface PersonalDonationRow {
  ichirenNo: string; // 一連番号
  kifusyaNm: string; // 寄附者氏名
  kingaku: number; // 金額
  dt: Date; // 年月日
  adr: string; // 住所
  syokugyo: string; // 職業
  bikou?: string; // 備考
  seqNo?: string; // 通し番号
  zeigakukoujyo: string; // 寄附金控除のための書類要不要 (0:不要, 1:必要)
  rowkbn: string; // 行区分 (0:明細, 1:小計)
}

/**
 * SYUUSHI07_07 KUBUN1: 個人からの寄附
 */
export interface PersonalDonationSection {
  totalAmount: number; // 合計
  sonotaGk: number; // その他の寄附
  rows: PersonalDonationRow[];
}

// ============================================================
// Domain Logic
// ============================================================

/**
 * PersonalDonationTransaction に関連するドメインロジック
 */
export const PersonalDonationTransaction = {
  /**
   * 取引金額を解決する
   */
  resolveAmount: (tx: PersonalDonationTransaction): number => {
    return resolveIncomeAmount(tx.debitAmount, tx.creditAmount);
  },

  /**
   * 寄附者氏名を取得する
   */
  getKifusyaNm: (tx: PersonalDonationTransaction): string => {
    return sanitizeText(tx.donorName, 120);
  },

  /**
   * 住所を取得する
   */
  getAdr: (tx: PersonalDonationTransaction): string => {
    return sanitizeText(tx.donorAddress, 120);
  },

  /**
   * 職業を取得する
   */
  getSyokugyo: (tx: PersonalDonationTransaction): string => {
    return sanitizeText(tx.donorOccupation, 50);
  },

  /**
   * 備考を構築する
   */
  getBikou: (tx: PersonalDonationTransaction): string => {
    return buildBikou(tx.transactionNo, tx.memo, 70, 100);
  },

  /**
   * 明細行に変換する
   */
  toRow: (tx: PersonalDonationTransaction, index: number): PersonalDonationRow => {
    return {
      ichirenNo: (index + 1).toString(),
      kifusyaNm: PersonalDonationTransaction.getKifusyaNm(tx),
      kingaku: Math.round(PersonalDonationTransaction.resolveAmount(tx)),
      dt: tx.transactionDate,
      adr: PersonalDonationTransaction.getAdr(tx),
      syokugyo: PersonalDonationTransaction.getSyokugyo(tx),
      bikou: PersonalDonationTransaction.getBikou(tx),
      zeigakukoujyo: "0", // デフォルト: 不要
      rowkbn: "0", // 明細行
    };
  },
} as const;

// ============================================================
// Section Aggregation Logic
// ============================================================

/**
 * PersonalDonationSection に関連するドメインロジック
 */
export const PersonalDonationSection = {
  /**
   * トランザクションリストからセクションを構築する
   */
  fromTransactions: (transactions: PersonalDonationTransaction[]): PersonalDonationSection => {
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + PersonalDonationTransaction.resolveAmount(tx),
      0,
    );

    const rows = transactions.map((tx, index) => PersonalDonationTransaction.toRow(tx, index));

    return {
      totalAmount,
      sonotaGk: 0, // その他の寄附は現時点では0
      rows,
    };
  },

  /**
   * XMLのSHEET要素を出力すべきかを判定する
   */
  shouldOutputSheet: (section: PersonalDonationSection): boolean => {
    return section.rows.length > 0 || section.totalAmount > 0;
  },

  /**
   * セクションのバリデーションを実行する
   *
   * SYUUSHI07_07（寄附の明細）のバリデーション:
   * - 寄附者氏名 (KIFUSYA_NM): 必須、120文字以内
   * - 金額 (KINGAKU): 必須、正の整数
   * - 年月日 (DT): 必須
   * - 住所 (ADR): 必須、120文字以内
   * - 職業 (SYOKUGYO): 必須、50文字以内
   */
  validate: (section: PersonalDonationSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      const rowNum = index + 1;
      const basePath = `donations.personalDonations.rows[${index}]`;

      // 寄附者氏名 (KIFUSYA_NM): 必須、120文字以内
      if (!row.kifusyaNm) {
        errors.push({
          path: `${basePath}.kifusyaNm`,
          code: ValidationErrorCode.REQUIRED,
          message: `個人寄附の${rowNum}行目: 寄附者氏名が入力されていません`,
          severity: "error",
        });
      } else if (row.kifusyaNm.length > 120) {
        errors.push({
          path: `${basePath}.kifusyaNm`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `個人寄附の${rowNum}行目: 寄附者氏名は120文字以内で入力してください`,
          severity: "error",
        });
      }

      // 金額 (KINGAKU): 必須、正の整数
      if (row.kingaku === undefined || row.kingaku === null) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.REQUIRED,
          message: `個人寄附の${rowNum}行目: 金額が入力されていません`,
          severity: "error",
        });
      } else if (row.kingaku <= 0) {
        errors.push({
          path: `${basePath}.kingaku`,
          code: ValidationErrorCode.NEGATIVE_VALUE,
          message: `個人寄附の${rowNum}行目: 金額は正の整数で入力してください`,
          severity: "error",
        });
      }

      // 年月日 (DT): 必須
      if (!row.dt) {
        errors.push({
          path: `${basePath}.dt`,
          code: ValidationErrorCode.REQUIRED,
          message: `個人寄附の${rowNum}行目: 年月日が入力されていません`,
          severity: "error",
        });
      }

      // 住所 (ADR): 必須、120文字以内
      if (!row.adr) {
        errors.push({
          path: `${basePath}.adr`,
          code: ValidationErrorCode.REQUIRED,
          message: `個人寄附の${rowNum}行目: 住所が入力されていません`,
          severity: "error",
        });
      } else if (row.adr.length > 120) {
        errors.push({
          path: `${basePath}.adr`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `個人寄附の${rowNum}行目: 住所は120文字以内で入力してください`,
          severity: "error",
        });
      }

      // 職業 (SYOKUGYO): 必須、50文字以内
      if (!row.syokugyo) {
        errors.push({
          path: `${basePath}.syokugyo`,
          code: ValidationErrorCode.REQUIRED,
          message: `個人寄附の${rowNum}行目: 職業が入力されていません`,
          severity: "error",
        });
      } else if (row.syokugyo.length > 50) {
        errors.push({
          path: `${basePath}.syokugyo`,
          code: ValidationErrorCode.MAX_LENGTH_EXCEEDED,
          message: `個人寄附の${rowNum}行目: 職業は50文字以内で入力してください`,
          severity: "error",
        });
      }
    });

    return errors;
  },
} as const;
