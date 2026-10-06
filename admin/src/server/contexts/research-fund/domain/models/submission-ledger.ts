import { isReceiptMissing } from "@/server/contexts/research-fund/domain/models/receipt-absence";

/**
 * 議員課に提出する帳簿（衆議院・参議院のフォーマット）。
 *
 * - 1 行 = 1 仕訳。1 枚の領収書に法定の区分が違う明細が混ざることがあるので、書類単位にしない
 * - 出すのは公開済み（published）の支出の仕訳だけ（下書き・確認済は含めない）
 * - 列の値は docs/old/20261006_2100_調研費議員課提出用帳簿の列の決定.md（#1654）に従う。
 *   領収書等番号・領収書有無・画像ファイル名は docs/old/20261006_2330_調研費領収書等番号の振り方の決定.md（#1685）に従う。
 *   決まっていない列は空欄で出す。備考には公開される note を出し、非公開の memo は出さない
 */

export const PARLIAMENT_HOUSES = ["representatives", "councillors"] as const;
/** representatives = 衆議院 / councillors = 参議院 */
export type ParliamentHouse = (typeof PARLIAMENT_HOUSES)[number];

export const PARLIAMENT_HOUSE_LABELS: Record<ParliamentHouse, string> = {
  representatives: "衆議院",
  councillors: "参議院",
};

export function isParliamentHouse(value: string): value is ParliamentHouse {
  return (PARLIAMENT_HOUSES as readonly string[]).includes(value);
}

/** 提出用の帳簿の 1 行に必要な仕訳の情報 */
export interface SubmissionLedgerEntry {
  readonly id: string;
  readonly entryDate: string; // YYYY-MM-DD
  readonly source: "scan" | "manual";
  /** 法定の区分。科目が区分を持たなければ null */
  readonly legalLabel: string | null;
  readonly description: string;
  readonly amount: number;
  readonly payeeName: string | null;
  readonly payeeAddress: string | null;
  readonly note: string | null;
  readonly documentId: string | null;
  /** 書類の領収書等番号。書類なし・未採番なら null */
  readonly receiptNumber: number | null;
  /** 書類の MIME タイプ。書類なしなら null */
  readonly documentMime: string | null;
  readonly receiptAbsenceReason: string | null;
}

/** 提出用の帳簿の対象（議員 × 年度）。領収書画像ファイル名に使う */
export interface SubmissionLedgerBook {
  readonly politicianSlug: string;
  readonly financialYear: number;
}

/** 書類なしの仕訳の「領収書等番号・徴難」（衆議院） */
const RECEIPT_ABSENT = "徴難";

/** 衆議院の「領収書等番号・徴難」。書類ありなら番号（未採番なら空欄）、書類なしなら 徴難 */
export function receiptNumberCell(entry: SubmissionLedgerEntry): string | null {
  if (entry.documentId === null) return RECEIPT_ABSENT;
  return entry.receiptNumber === null ? null : String(entry.receiptNumber);
}

/** 参議院の「領収書有無」 */
export function receiptPresenceCell(entry: SubmissionLedgerEntry): string {
  return entry.documentId === null ? "無" : "有";
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * 参議院の「領収書画像ファイル名」。{議員 slug}_{年度}_{番号 4 桁ゼロ埋め}.{拡張子}。
 * 書類なし・未採番・拡張子の分からない書類は空欄
 */
export function receiptImageFilename(
  entry: SubmissionLedgerEntry,
  book: SubmissionLedgerBook,
): string | null {
  if (entry.documentId === null || entry.receiptNumber === null) return null;
  const extension = entry.documentMime === null ? undefined : EXTENSIONS[entry.documentMime];
  if (!extension) return null;
  const number = String(entry.receiptNumber).padStart(4, "0");
  return `${book.politicianSlug}_${book.financialYear}_${number}.${extension}`;
}

type Column = (entry: SubmissionLedgerEntry, book: SubmissionLedgerBook) => string | number | null;
const blank: Column = () => null;
const PAYEE_NAME_HEADER = "支出を受けた者の氏名（団体にあっては、その名称）";
const PAYEE_ADDRESS_HEADER = "支出を受けた者の住所（団体にあっては、主たる事務所の所在地）";

/** 議員課の Excel の列順どおりに並べる */
const COLUMNS: Record<ParliamentHouse, readonly (readonly [string, Column])[]> = {
  representatives: [
    ["支出項目", (e) => e.legalLabel],
    ["支出の目的", (e) => e.description],
    ["金額", (e) => e.amount],
    ["年月日", (e) => e.entryDate],
    ["資金管理団体からの支出", blank],
    [PAYEE_NAME_HEADER, (e) => e.payeeName],
    [PAYEE_ADDRESS_HEADER, (e) => e.payeeAddress],
    ["備考", (e) => e.note],
    ["領収書等番号・徴難", receiptNumberCell],
    ["領収書等を徴し難かった事情", (e) => e.receiptAbsenceReason],
    ["メモ", blank],
  ],
  councillors: [
    ["支出項目", (e) => e.legalLabel],
    ["支出の目的", (e) => e.description],
    ["金額", (e) => e.amount],
    ["年月日", (e) => e.entryDate],
    ["1万円超として扱う", blank],
    ["資金管理団体からの支出", blank],
    [PAYEE_NAME_HEADER, (e) => e.payeeName],
    [PAYEE_ADDRESS_HEADER, (e) => e.payeeAddress],
    ["備考", (e) => e.note],
    ["領収書有無", receiptPresenceCell],
    ["領収書等を徴し難かった事情", (e) => e.receiptAbsenceReason],
    ["メモ", blank],
    ["特記事項", blank],
    ["領収書画像ファイル名", receiptImageFilename],
  ],
};

export function submissionLedgerHeaders(house: ParliamentHouse): string[] {
  return COLUMNS[house].map(([header]) => header);
}

/** 表計算ソフトが数式として評価する先頭文字。文字列のセルは先頭に ' を付けて文字列のまま開かせる */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** 1 仕訳を提出用の帳簿の 1 行にする。null の列は空欄 */
export function submissionLedgerRow(
  house: ParliamentHouse,
  entry: SubmissionLedgerEntry,
  book: SubmissionLedgerBook,
): string[] {
  return COLUMNS[house].map(([, column]) => {
    const value = column(entry, book);
    if (value === null) return "";
    if (typeof value === "number") return String(value);
    return FORMULA_PREFIX.test(value) ? `'${value}` : value;
  });
}

function escapeCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Excel で文字化けしないよう UTF-8 BOM を付け、改行は CRLF にする */
export function buildSubmissionLedgerCsv(
  house: ParliamentHouse,
  book: SubmissionLedgerBook,
  entries: readonly SubmissionLedgerEntry[],
): string {
  const rows = [
    submissionLedgerHeaders(house),
    ...entries.map((entry) => submissionLedgerRow(house, entry, book)),
  ];
  return `﻿${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}\r\n`;
}

export function submissionLedgerFilename(house: ParliamentHouse, financialYear: number): string {
  return `research_fund_ledger_${financialYear}_${house}.csv`;
}

type SubmissionLedgerIssue = "payee-missing" | "receipt-missing" | "receipt-number-missing";
export const SUBMISSION_LEDGER_ISSUE_LABELS: Record<SubmissionLedgerIssue, string> = {
  "payee-missing": "支払先が未設定",
  "receipt-missing": "書類も徴し難かった事情もない",
  "receipt-number-missing": "書類の領収書等番号が未採番",
};

interface SubmissionLedgerWarning {
  readonly entry: SubmissionLedgerEntry;
  readonly issues: readonly SubmissionLedgerIssue[];
}

/** 提出前に埋めるべき項目が欠けている仕訳（支払先が未設定、書類も徴し難かった事情もない、または書類が未採番） */
export function submissionLedgerWarnings(
  entries: readonly SubmissionLedgerEntry[],
): SubmissionLedgerWarning[] {
  return entries.flatMap((entry) => {
    const issues: SubmissionLedgerIssue[] = [];
    if (entry.payeeName === null) issues.push("payee-missing");
    if (isReceiptMissing(entry)) issues.push("receipt-missing");
    if (entry.documentId !== null && entry.receiptNumber === null) {
      issues.push("receipt-number-missing");
    }
    return issues.length ? [{ entry, issues }] : [];
  });
}
