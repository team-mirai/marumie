import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 徴難（領収書等を徴し難かった）と、徴し難かった事情の業務ルール。
 *
 * 議員課に提出する帳簿では、領収書等を徴し難かった支出を「徴難」とし、徴し難かった事情を書く。
 * - 徴難は書類（documentId）の有無とは独立に付ける。振込明細などの書類はあるが領収書は無い支出も徴難にできる
 * - 徴難を付けられるのは支出の仕訳だけ（支給は付けない。DB の CHECK 制約とも一致させる）
 * - 事情を持てるのは徴難の仕訳だけ（DB の CHECK 制約とも一致させる）。徴難を外すと事情も消える
 * - receiptAbsenceReason が null なら「事情が未入力」
 * 徴難と事情は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中・精算済の仕訳でも変更できる。
 */

/** 徴し難かった事情の上限文字数。帳簿の 1 セルに収まる長さにとどめる */
export const RECEIPT_ABSENCE_REASON_MAX_LENGTH = 500;

/** 徴難・徴し難かった事情の判定に使う仕訳の最小の形 */
interface ReceiptAbsenceEntry {
  readonly source: "scan" | "manual" | "grant";
  readonly documentId: string | null;
  readonly receiptAbsent: boolean;
  readonly receiptAbsenceReason: string | null;
}

/** 前後の空白（全角スペース・改行を含む）を落とし、空白だけなら「未入力」として null にする */
export function normalizeReceiptAbsenceReason(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** 徴し難かった事情を検証する。正規化した結果（未入力なら null）を返す */
export function validateReceiptAbsenceReason(value: string): ResearchFundResult<string | null> {
  const reason = normalizeReceiptAbsenceReason(value);
  if (reason !== null && reason.length > RECEIPT_ABSENCE_REASON_MAX_LENGTH) {
    return invalidResearchFundResult(
      "receiptAbsenceReason",
      RF_ERROR_CODES.INVALID_RECEIPT_ABSENCE_REASON,
      `徴し難かった事情は${RECEIPT_ABSENCE_REASON_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return { status: "valid", value: reason };
}

/** 徴難を付け外しできる仕訳か（支出だけ。書類の有無は問わない） */
export function canMarkReceiptAbsent(entry: Pick<ReceiptAbsenceEntry, "source">) {
  return entry.source !== "grant";
}

/** 徴し難かった事情を書ける仕訳か（徴難の支出だけ） */
export function canHaveReceiptAbsenceReason(
  entry: Pick<ReceiptAbsenceEntry, "source" | "receiptAbsent">,
) {
  return canMarkReceiptAbsent(entry) && entry.receiptAbsent;
}

/** 書類が無く、徴難も付いていない支出か（議員課提出前に書類を紐づけるか徴難にする必要がある） */
export function isReceiptMissing(
  entry: Pick<ReceiptAbsenceEntry, "source" | "documentId" | "receiptAbsent">,
) {
  return canMarkReceiptAbsent(entry) && entry.documentId === null && !entry.receiptAbsent;
}

/** 徴難なのに徴し難かった事情が未入力の支出か（議員課提出前に事情を埋める必要がある） */
export function isReceiptAbsenceReasonMissing(entry: ReceiptAbsenceEntry) {
  return canHaveReceiptAbsenceReason(entry) && entry.receiptAbsenceReason === null;
}
