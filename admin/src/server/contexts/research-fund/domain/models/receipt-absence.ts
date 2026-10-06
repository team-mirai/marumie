import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 領収書等を徴し難かった事情の業務ルール。
 *
 * 議員課に提出する帳簿では、領収書等が無い支出に「徴し難かった事情」を書く。
 * - 事情を持てるのは、書類（documentId）の無い支出の仕訳だけ（DB の CHECK 制約とも一致させる）
 * - receiptAbsenceReason が null なら「事情が未入力」
 * 事情は議員課提出用の帳簿の情報で公開内容に影響しないので、公開中・精算済の仕訳でも変更できる。
 */

/** 徴し難かった事情の上限文字数。帳簿の 1 セルに収まる長さにとどめる */
export const RECEIPT_ABSENCE_REASON_MAX_LENGTH = 500;

/** 徴し難かった事情を持てるかの判定に使う仕訳の最小の形 */
interface ReceiptAbsenceEntry {
  readonly source: "scan" | "manual" | "grant";
  readonly documentId: string | null;
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

/** 徴し難かった事情を書ける仕訳か（書類の無い支出だけ） */
export function canHaveReceiptAbsenceReason(
  entry: Omit<ReceiptAbsenceEntry, "receiptAbsenceReason">,
) {
  return entry.source !== "grant" && entry.documentId === null;
}

/** 書類も徴し難かった事情もない支出か（議員課提出前に埋める必要がある） */
export function isReceiptMissing(entry: ReceiptAbsenceEntry) {
  return canHaveReceiptAbsenceReason(entry) && entry.receiptAbsenceReason === null;
}
