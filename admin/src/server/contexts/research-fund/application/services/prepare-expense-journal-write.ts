import "server-only";
import {
  JournalReviewError,
  type JournalEdit,
  type JournalWrite,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import { buildExpenseJournalWrite } from "@/server/contexts/research-fund/domain/services/expense-journal-builder";

/**
 * 手入力した支出の仕訳を保存する形に組み立てるための段取り（帳簿の年度と科目マスタの取得）。
 * 組み立てと不変条件の判定は buildExpenseJournalWrite（ドメイン）が持つ。
 */
export async function prepareExpenseJournalWrite(
  repository: JournalReviewRepository,
  bookId: string,
  raw: JournalEdit,
  source: "manual" | "scan",
  documentId: string | null,
): Promise<JournalWrite> {
  const [year, accounts] = await Promise.all([repository.year(bookId), repository.accounts()]);
  const write = buildExpenseJournalWrite({ raw, source, documentId, year, accounts });
  if (write.status === "invalid") throw new JournalReviewError(write.errors[0].message);
  return write.value;
}
