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
  // 寄付者情報
  donorId: string | null; // Donor.id（未紐付けの場合はnull）
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
  dt: Date | null; // 年月日（小計行はnull）
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
// Constants
// ============================================================

/**
 * 寄附明細記載閾値（年間5万円超で明細記載）
 * 同一者からの年間寄附合計がこの金額を超える場合、個別に明細を記載する
 */
export const DONATION_DETAIL_THRESHOLD = 50000;

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
// Internal Types for Aggregation
// ============================================================

/**
 * 処理対象の寄附者グループ（5万円超）
 */
interface DonorGroup {
  donorId: string;
  transactions: PersonalDonationTransaction[];
  total: number;
  firstDate: Date;
}

// ============================================================
// Section Aggregation Logic
// ============================================================

/**
 * PersonalDonationSection に関連するドメインロジック
 */
export const PersonalDonationSection = {
  /**
   * donorIdでトランザクションをグループ化する
   * - donorId !== null の場合: donorIdをそのままキーとして使用
   * - donorId === null の場合: `__unassigned_${index}` 形式のユニークキーを生成し、各取引を別グループとして扱う
   */
  groupByDonorId: (
    transactions: PersonalDonationTransaction[],
  ): Map<string, PersonalDonationTransaction[]> => {
    const groups = new Map<string, PersonalDonationTransaction[]>();

    transactions.forEach((tx, index) => {
      const key = tx.donorId ?? `__unassigned_${index}`;
      const existing = groups.get(key) ?? [];
      existing.push(tx);
      groups.set(key, existing);
    });

    return groups;
  },

  /**
   * グループ内の取引金額合計を算出する
   */
  calculateGroupTotal: (transactions: PersonalDonationTransaction[]): number => {
    return transactions.reduce((sum, tx) => sum + PersonalDonationTransaction.resolveAmount(tx), 0);
  },

  /**
   * グループ内の最も古い取引日付を取得する
   * @throws {Error} 空配列が渡された場合
   */
  getFirstTransactionDate: (transactions: PersonalDonationTransaction[]): Date => {
    if (transactions.length === 0) {
      throw new Error("Cannot get first transaction date from empty array");
    }
    return transactions
      .map((tx) => tx.transactionDate)
      .reduce((min, date) => (date < min ? date : min));
  },

  /**
   * 5万円超グループと5万円以下グループを分離する
   */
  partitionGroupsByThreshold: (
    groups: Map<string, PersonalDonationTransaction[]>,
  ): { targetGroups: DonorGroup[]; sonotaGk: number } => {
    const targetGroups: DonorGroup[] = [];
    let sonotaGk = 0;

    for (const [donorId, groupTransactions] of groups) {
      const groupTotal = PersonalDonationSection.calculateGroupTotal(groupTransactions);

      if (groupTotal > DONATION_DETAIL_THRESHOLD) {
        targetGroups.push({
          donorId,
          transactions: groupTransactions,
          total: groupTotal,
          firstDate: PersonalDonationSection.getFirstTransactionDate(groupTransactions),
        });
      } else {
        sonotaGk += groupTotal;
      }
    }

    return { targetGroups, sonotaGk };
  },

  /**
   * トランザクションを日付順にソートする
   */
  sortTransactionsByDate: (
    transactions: PersonalDonationTransaction[],
  ): PersonalDonationTransaction[] => {
    return [...transactions].sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
    );
  },

  /**
   * グループからRowを生成する（明細行 + 小計行）
   */
  createRowsForGroup: (group: DonorGroup, seqNo: number): PersonalDonationRow[] => {
    const sortedTransactions = PersonalDonationSection.sortTransactionsByDate(group.transactions);

    // 明細行を生成
    const detailRows: PersonalDonationRow[] = sortedTransactions.map((tx) => ({
      ichirenNo: "", // 後で振り直す
      kifusyaNm: PersonalDonationTransaction.getKifusyaNm(tx),
      kingaku: Math.round(PersonalDonationTransaction.resolveAmount(tx)),
      dt: tx.transactionDate,
      adr: PersonalDonationTransaction.getAdr(tx),
      syokugyo: PersonalDonationTransaction.getSyokugyo(tx),
      bikou: PersonalDonationTransaction.getBikou(tx),
      seqNo: seqNo.toString(),
      zeigakukoujyo: "0",
      rowkbn: "0",
    }));

    // 2件以上の場合のみ小計行を追加
    if (sortedTransactions.length >= 2) {
      // 丸め誤差を防ぐため、小計は明細行の丸め後金額を合計する
      const subtotalAmount = detailRows.reduce((sum, row) => sum + row.kingaku, 0);
      const subtotalRow: PersonalDonationRow = {
        ichirenNo: "",
        kifusyaNm: "（小計）",
        kingaku: subtotalAmount,
        dt: null,
        adr: "",
        syokugyo: "",
        bikou: "",
        seqNo: seqNo.toString(),
        zeigakukoujyo: "0",
        rowkbn: "1",
      };
      return [...detailRows, subtotalRow];
    }

    return detailRows;
  },

  /**
   * 行に一連番号を振る
   */
  assignIchirenNo: (rows: PersonalDonationRow[]): PersonalDonationRow[] => {
    return rows.map((row, index) => ({
      ...row,
      ichirenNo: (index + 1).toString(),
    }));
  },

  /**
   * トランザクションリストからセクションを構築する
   *
   * 処理フロー:
   * 1. トランザクションを donorId でグループ化
   * 2. 各グループの年間合計金額を算出
   * 3. 年間合計 > 50,000円 のグループ → 処理対象グループとして保持
   * 4. 年間合計 <= 50,000円 のグループ → グループ全体の金額を sonotaGk に合算
   * 5. 処理対象グループを「グループ内最初の取引日付順」でソート
   * 6. 各グループについて:
   *    a. グループ内の明細を日付順にソート
   *    b. 各明細を PersonalDonationRow に変換（seqNo 付与）
   *    c. グループ内明細が2件以上の場合、小計行を追加
   * 7. 全行に一連番号（ichirenNo）を振る
   * 8. totalAmount = 元のトランザクション全体の合計
   */
  fromTransactions: (transactions: PersonalDonationTransaction[]): PersonalDonationSection => {
    // 合計金額は元のトランザクション全体の合計
    const totalAmount = transactions.reduce(
      (sum, tx) => sum + PersonalDonationTransaction.resolveAmount(tx),
      0,
    );

    // donorIdでグループ化
    const groups = PersonalDonationSection.groupByDonorId(transactions);

    // 5万円超グループと5万円以下の合計を分離
    const { targetGroups, sonotaGk } = PersonalDonationSection.partitionGroupsByThreshold(groups);

    // グループを最初の取引日付順でソート
    const sortedGroups = [...targetGroups].sort(
      (a, b) => a.firstDate.getTime() - b.firstDate.getTime(),
    );

    // 各グループから行を生成（seqNoは1から開始）
    const rowsWithoutIchirenNo = sortedGroups.flatMap((group, index) =>
      PersonalDonationSection.createRowsForGroup(group, index + 1),
    );

    // 一連番号を振る
    const rows = PersonalDonationSection.assignIchirenNo(rowsWithoutIchirenNo);

    return {
      totalAmount,
      sonotaGk,
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
   *
   * 注: 小計行（rowkbn="1"）は自動生成されるため、バリデーション対象外
   */
  validate: (section: PersonalDonationSection): ValidationError[] => {
    const errors: ValidationError[] = [];

    section.rows.forEach((row, index) => {
      // 小計行（rowkbn="1"）はバリデーション対象外
      if (row.rowkbn === "1") {
        return;
      }

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
