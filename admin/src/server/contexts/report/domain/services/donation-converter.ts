/**
 * Donation Converter
 *
 * Converts raw transaction data from the database into donation-related domain objects.
 * This is a pure function layer that handles data transformation and business rules.
 */

import type { PersonalDonationTransaction } from "@/server/contexts/report/domain/models/donation-transaction";

// Re-export input types for consumers
export type { PersonalDonationTransaction };

// ============================================================
// Output Types (Domain Objects)
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
// Internal Types
// ============================================================

interface DonationTransaction {
  transactionNo: string;
  transactionDate: Date;
  amount: number;
  memo: string | null;
  donorName: string;
  donorAddress: string;
  donorOccupation: string;
}

// ============================================================
// Converter Functions
// ============================================================

/**
 * SYUUSHI07_07 KUBUN1: 個人からの寄附を変換
 */
export function convertToPersonalDonationSection(
  transactions: PersonalDonationTransaction[],
): PersonalDonationSection {
  const donationTransactions = transactions.map(toDonationTransaction);
  return aggregatePersonalDonations(donationTransactions);
}

// ============================================================
// Input Mapping Functions
// ============================================================

function toDonationTransaction(
  t: PersonalDonationTransaction,
): DonationTransaction {
  return {
    transactionNo: t.transactionNo,
    transactionDate: t.transactionDate,
    amount: resolveTransactionAmount(t.debitAmount, t.creditAmount),
    memo: t.memo,
    donorName: t.donorName,
    donorAddress: t.donorAddress,
    donorOccupation: t.donorOccupation,
  };
}

// ============================================================
// Aggregation Functions
// ============================================================

function aggregatePersonalDonations(
  transactions: DonationTransaction[],
): PersonalDonationSection {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const rows: PersonalDonationRow[] = transactions.map((t, index) => ({
    ichirenNo: (index + 1).toString(),
    kifusyaNm: sanitizeText(t.donorName, 120),
    kingaku: Math.round(t.amount),
    dt: t.transactionDate,
    adr: sanitizeText(t.donorAddress, 120),
    syokugyo: sanitizeText(t.donorOccupation, 50),
    bikou: buildBikou(t),
    zeigakukoujyo: "0", // デフォルト: 不要
    rowkbn: "0", // 明細行
  }));

  return {
    totalAmount,
    sonotaGk: 0, // その他の寄附は現時点では0
    rows,
  };
}

// ============================================================
// Field Builder Functions
// ============================================================

function buildBikou(t: DonationTransaction): string {
  const mfRowInfo = `MF行番号: ${t.transactionNo || "-"}`;
  const memoText = sanitizeText(t.memo, 70);
  const combined = memoText ? `${memoText} / ${mfRowInfo}` : mfRowInfo;

  return sanitizeText(combined, 100) || mfRowInfo;
}

function resolveTransactionAmount(
  debitAmount: number,
  creditAmount: number,
): number {
  if (Number.isFinite(creditAmount) && creditAmount > 0) {
    return creditAmount;
  }

  return Number.isFinite(debitAmount) ? debitAmount : 0;
}

function sanitizeText(
  value: string | null | undefined,
  maxLength?: number,
): string {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
}
