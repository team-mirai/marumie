import "server-only";
import { JournalEntryHash } from "@/server/contexts/research-fund/domain/models/journal-entry-hash";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  JournalReviewError,
  journalEditSchema,
  type JournalEdit,
  type JournalWrite,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 支出の仕訳の入力を検証し、保存する形（複式の行・hash）に組み立てる。
 * 手動作成と編集の保存で同じ検証をするために、ここに置く。
 * 確認済にできるかの判定は JournalOperation.approve が持つので、ここでは扱わない。
 */
export async function prepareExpenseJournalWrite(
  repository: JournalReviewRepository,
  bookId: string,
  raw: JournalEdit,
  source: "manual" | "scan",
  documentId: string | null,
  status: JournalWrite["status"],
): Promise<JournalWrite> {
  const parsed = journalEditSchema.safeParse(raw);
  if (!parsed.success)
    throw new JournalReviewError("日付・金額・項目名・科目を正しく入力してください");
  const input = parsed.data;
  const year = await repository.year(bookId);
  if (!year || Number(input.entryDate.slice(0, 4)) !== year)
    throw new JournalReviewError("帳簿の年度内の日付を指定してください");
  const accounts = await repository.accounts();
  const account = accounts.find((a) => a.key === input.accountKey);
  const assetAccount = accounts.find((a) => a.key === "bank");
  if (!account || !assetAccount) throw new JournalReviewError("科目が見つかりません");
  const posting = JournalPosting.generate({
    pattern: "expense",
    source,
    amount: input.amount,
    account,
    assetAccount,
  });
  if (posting.status === "invalid") throw new JournalReviewError(posting.errors[0].message);
  const hash = JournalEntryHash.generate({ ...input, documentId });
  if (hash.status === "invalid") throw new JournalReviewError(hash.errors[0].message);
  return { ...input, status, hash: hash.value, lines: posting.value.lines };
}
