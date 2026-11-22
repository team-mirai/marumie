/**
 * 領収書等番号（議員課提出用の帳簿の列）の採番ルール。
 * 決定の詳細は docs/old/20261006_2330_調研費領収書等番号の振り方の決定.md（#1685）。
 *
 * - 帳簿（議員 × 年度）ごとに 1 から始まる整数の通し番号。書類ごとに 1 つ
 * - 採番の対象は、領収書等番号が付く仕訳（isReceiptNumberedEntry）が 1 件以上紐づいている未採番の書類
 *   （提出用 CSV・印刷用 PDF に番号が出る行と揃える）
 * - 紐づく公開済みの仕訳の最も早い日付の順。同じ日付なら書類の登録順（id 順）
 * - 採番済みの番号は変えない。未採番の書類には帳簿内の最大番号 + 1 から振る。欠番は詰めない
 */

/**
 * 領収書等番号が付く仕訳の条件のうち、仕訳の列で決まるもの（公開済みで、徴難でない）。
 * リポジトリが書類に紐づく仕訳を検索するときの条件にもそのまま使う
 */
export const RECEIPT_NUMBERED_ENTRY_CONDITION = {
  status: "published",
  receiptAbsent: false,
} as const;

/** 領収書等番号が付くかの判定に使う仕訳の最小の形 */
interface ReceiptNumberingEntry {
  readonly status: string;
  readonly receiptAbsent: boolean;
  readonly documentId: string | null;
}

/**
 * 領収書等番号が付く仕訳か: 公開済みで、徴難でなく、書類が紐づいている。
 * 採番の対象・提出用の帳簿の番号の列・印刷用 PDF に入れる書類・未採番の件数はすべてこの条件で決める
 * （徴難の仕訳は書類があっても帳簿に 徴難 と出し、番号は出さない）
 */
export function isReceiptNumberedEntry<T extends ReceiptNumberingEntry>(
  entry: T,
): entry is T & { readonly documentId: string } {
  return (
    entry.documentId !== null &&
    entry.status === RECEIPT_NUMBERED_ENTRY_CONDITION.status &&
    entry.receiptAbsent === RECEIPT_NUMBERED_ENTRY_CONDITION.receiptAbsent
  );
}

/** 領収書等番号が付く仕訳なのに、書類がまだ採番されていないか */
export function awaitsReceiptNumber<
  T extends ReceiptNumberingEntry & { readonly receiptNumber: number | null },
>(entry: T): entry is T & { readonly documentId: string; readonly receiptNumber: null } {
  return isReceiptNumberedEntry(entry) && entry.receiptNumber === null;
}

/** 採番の判定に使う帳簿の書類の最小の形 */
export interface ReceiptNumberingDocument {
  readonly id: string;
  /** 採番済みの番号。null なら未採番 */
  readonly receiptNumber: number | null;
  /** 紐づく領収書等番号が付く仕訳（isReceiptNumberedEntry）の最も早い日付（YYYY-MM-DD）。無ければ null */
  readonly firstPublishedEntryDate: string | null;
}

export interface ReceiptNumberAssignment {
  readonly documentId: string;
  readonly receiptNumber: number;
}

function compareIds(a: string, b: string) {
  const left = BigInt(a);
  const right = BigInt(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** 帳簿の書類（採番済みを含むすべて）から、未採番の書類に振る番号を決める */
export function planReceiptNumbers(
  documents: readonly ReceiptNumberingDocument[],
): ReceiptNumberAssignment[] {
  const max = documents.reduce((value, d) => Math.max(value, d.receiptNumber ?? 0), 0);
  return documents
    .filter(
      (d): d is ReceiptNumberingDocument & { firstPublishedEntryDate: string } =>
        d.receiptNumber === null && d.firstPublishedEntryDate !== null,
    )
    .sort(
      (a, b) =>
        a.firstPublishedEntryDate.localeCompare(b.firstPublishedEntryDate) ||
        compareIds(a.id, b.id),
    )
    .map((d, i) => ({ documentId: d.id, receiptNumber: max + i + 1 }));
}
