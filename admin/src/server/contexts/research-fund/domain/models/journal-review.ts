import { z } from "zod";
import type { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
import type {
  JournalLine,
  ResearchFundAccount,
} from "@/server/contexts/research-fund/domain/models/journal-posting";

export const journalEditSchema = z.object({
  entryDate: z.iso.date(),
  description: z.string().trim().min(1).max(255),
  amount: z.number().int().positive().max(999_999_999_999),
  accountKey: z.string().min(1).max(50),
  note: z.string(),
  memo: z.string(),
});
export type JournalEdit = z.infer<typeof journalEditSchema>;
export interface ReviewAccount extends ResearchFundAccount {
  label: string;
  /** 法律上の区分（法定区分）。科目マスタで科目ごとに一意に決まる。要確認など区分を持たない科目は null */
  legalLabel: string | null;
}
/** 科目マスタで「要確認（科目未確定）」を表す科目キー。この文字列との比較は isAccountUnconfirmed に閉じる */
const UNCONFIRMED_ACCOUNT_KEY = "needs-review";
/** 科目が未確定（要確認）か。確認済にできるかの判定や画面の注意表示が共通で使う */
export function isAccountUnconfirmed(accountKey: string): boolean {
  return accountKey === UNCONFIRMED_ACCOUNT_KEY;
}
/** 科目に対応する法律上の区分。科目が未確定（要確認・未選択）か区分を持たない科目なら null（未定） */
export function legalLabelOf(
  accounts: readonly ReviewAccount[],
  accountKey: string,
): string | null {
  if (isAccountUnconfirmed(accountKey)) return null;
  return accounts.find((a) => a.key === accountKey)?.legalLabel ?? null;
}
export interface ReviewEntry extends JournalEdit, JournalEntry {
  id: string;
  source: "scan" | "manual" | "grant";
  documentId: string | null;
  splitGroup: string | null;
  updatedAt: string;
  model: string | null;
  promptVersion: number | null;
  /**
   * 立替者（事務所内の管理情報）。null なら調研費口座からの直接支出。
   * JournalEdit に含めないのは、立替情報だけは公開中の仕訳でも変更でき、
   * 複式の行・hash・公開内容に影響しない別系統の更新として扱うため。
   */
  advancedBy: string | null;
  /** 立替の精算日（YYYY-MM-DD）。null なら未精算 */
  settledAt: string | null;
}
export interface JournalWrite extends JournalEdit {
  hash: string;
  lines: readonly JournalLine[];
  status: ReviewEntry["status"];
}
export class JournalReviewError extends Error {}
