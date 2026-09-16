import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

type JournalEntryStatus = "draft" | "approved" | "published";

/**
 * 許される状態遷移。公開済みから確認済みへ戻せるのは、公開後に誤りを見つけたときに
 * 修正して再公開できるようにするため（確認済みから下書きへは戻せない）。
 */
const allowed: readonly (readonly [JournalEntryStatus, JournalEntryStatus])[] = [
  ["draft", "approved"],
  ["approved", "published"],
  ["published", "approved"],
];

export interface JournalEntry {
  readonly status: JournalEntryStatus;
}

export const JournalEntry = {
  transition(
    entry: JournalEntry,
    nextStatus: JournalEntryStatus,
  ): ResearchFundResult<JournalEntry> {
    if (!allowed.some(([from, to]) => from === entry.status && to === nextStatus)) {
      return invalidResearchFundResult(
        "status",
        RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "仕訳は下書きから確認済み、確認済みから公開済み、公開済みから確認済みへのみ変更できます",
      );
    }
    return { status: "valid", value: Object.freeze({ ...entry, status: nextStatus }) };
  },
};
