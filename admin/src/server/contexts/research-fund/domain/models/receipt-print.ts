import {
  legalCategoryNumber,
  type SubmissionLedgerBook,
  type SubmissionLedgerEntry,
} from "@/server/contexts/research-fund/domain/models/submission-ledger";

/**
 * 議員課に提出する、領収書等番号を印字した領収書の印刷用 PDF に入れる書類（#1777）。
 *
 * - 対象は公開済みの支出の仕訳（提出用の帳簿の行）が 1 件以上紐づく書類。1 書類は 1 回だけ入れる
 * - 未採番の書類は入れず、件数だけ数えて採番を促す
 * - 「1万円超」は書類単位で、紐づく仕訳の金額の合計が 10,000 円を超えるもの（ちょうど 10,000 円は入れない）
 * - 並びは提出用の帳簿（CSV）と同じく大項目の番号順 → 日付 → 領収書等番号。
 *   大項目は紐づく仕訳のうち最も小さい番号、日付は紐づく仕訳のうち最も早い日付を使う
 */

/** 通常の提出では、この金額を超える領収書だけを出す */
const RECEIPT_PRINT_THRESHOLD = 10000;

export const RECEIPT_PRINT_SCOPES = ["over-threshold", "all"] as const;
/** over-threshold = 1万円超に絞る（通常の提出） / all = 全件（少額開示請求への対応） */
export type ReceiptPrintScope = (typeof RECEIPT_PRINT_SCOPES)[number];

export function isReceiptPrintScope(value: string): value is ReceiptPrintScope {
  return (RECEIPT_PRINT_SCOPES as readonly string[]).includes(value);
}

/** 印刷用 PDF に入れる 1 書類 */
interface ReceiptPrintDocument {
  readonly documentId: string;
  /** 未採番なら null（PDF には入れない） */
  readonly receiptNumber: number | null;
  readonly mime: string | null;
  /** 紐づく仕訳の大項目の番号のうち最も小さいもの。どれも区分なしなら null */
  readonly legalCategory: number | null;
  /** 紐づく仕訳のうち最も早い日付（YYYY-MM-DD） */
  readonly firstDate: string;
  /** 紐づく仕訳の金額の合計 */
  readonly totalAmount: number;
}

function minNullable(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** 提出用の帳簿の仕訳を書類ごとにまとめる。書類なしの仕訳は除く */
export function groupReceiptPrintDocuments(
  entries: readonly SubmissionLedgerEntry[],
): ReceiptPrintDocument[] {
  const documents = new Map<string, ReceiptPrintDocument>();
  for (const entry of entries) {
    if (entry.documentId === null) continue;
    const category = legalCategoryNumber(entry.legalLabel);
    const current = documents.get(entry.documentId);
    documents.set(
      entry.documentId,
      current
        ? {
            ...current,
            legalCategory: minNullable(current.legalCategory, category),
            firstDate: entry.entryDate < current.firstDate ? entry.entryDate : current.firstDate,
            totalAmount: current.totalAmount + entry.amount,
          }
        : {
            documentId: entry.documentId,
            receiptNumber: entry.receiptNumber,
            mime: entry.documentMime,
            legalCategory: category,
            firstDate: entry.entryDate,
            totalAmount: entry.amount,
          },
    );
  }
  return [...documents.values()];
}

function inScope(document: ReceiptPrintDocument, scope: ReceiptPrintScope): boolean {
  return scope === "all" || document.totalAmount > RECEIPT_PRINT_THRESHOLD;
}

function compareNullsLast(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** 大項目の番号順（区分なしは最後）→ 日付 → 領収書等番号 */
function compareDocuments(a: ReceiptPrintDocument, b: ReceiptPrintDocument): number {
  return (
    compareNullsLast(a.legalCategory, b.legalCategory) ||
    a.firstDate.localeCompare(b.firstDate) ||
    compareNullsLast(a.receiptNumber, b.receiptNumber)
  );
}

interface ReceiptPrintSelection {
  /** PDF に入れる書類（採番済み）を印刷する順に並べたもの */
  readonly documents: readonly (ReceiptPrintDocument & { readonly receiptNumber: number })[];
  /** 範囲内だが未採番で PDF に入らない書類の件数 */
  readonly unnumberedCount: number;
}

/** 範囲（1万円超 / 全件）の書類を選び、印刷する順に並べる */
export function selectReceiptPrintDocuments(
  entries: readonly SubmissionLedgerEntry[],
  scope: ReceiptPrintScope,
): ReceiptPrintSelection {
  const inRange = groupReceiptPrintDocuments(entries).filter((d) => inScope(d, scope));
  const numbered = inRange.filter(
    (d): d is ReceiptPrintDocument & { receiptNumber: number } => d.receiptNumber !== null,
  );
  return {
    documents: numbered.sort(compareDocuments),
    unnumberedCount: inRange.length - numbered.length,
  };
}

export function receiptPrintFilename(book: SubmissionLedgerBook, scope: ReceiptPrintScope): string {
  const suffix = scope === "all" ? "all" : "over10000";
  return `research_fund_receipts_${book.politicianSlug}_${book.financialYear}_${suffix}.pdf`;
}
