import type { PublishedExpense } from "@/server/contexts/research-fund/domain/models/published-research-fund";

/**
 * 調研費の領収書を公開ページ・配信 API から出すかどうか。
 *
 * 当面は領収書を出さずに公開する方針（2026-09-29）のため false にしている。
 * 表示・配信の部品は残してあり、公開を再開するときはここを true に戻すだけでよい。
 */
export const RESEARCH_FUND_RECEIPTS_PUBLISHED: boolean = false;

type ReceiptFields = Pick<PublishedExpense, "hasReceipt" | "receiptReady" | "receiptMime">;

/**
 * 公開してよい範囲の領収書の情報にする。公開を止めている間は、書類が付いていても
 * 「領収書なし」として返し、画面がフラグを見なくても領収書を出さないようにする。
 */
export function discloseReceipt<T extends ReceiptFields>(
  expense: T,
  receiptsPublished: boolean,
): T {
  if (receiptsPublished) return expense;
  return { ...expense, hasReceipt: false, receiptReady: false, receiptMime: null };
}
