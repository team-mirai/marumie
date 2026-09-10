import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

type JournalEntryStatus = "draft" | "approved" | "published";

export interface JournalEntry {
  readonly status: JournalEntryStatus;
}

export const JournalEntry = {
  transition(
    entry: JournalEntry,
    nextStatus: JournalEntryStatus,
  ): ResearchFundResult<JournalEntry> {
    if (
      !(
        (entry.status === "draft" && nextStatus === "approved") ||
        (entry.status === "approved" && nextStatus === "published")
      )
    ) {
      return invalidResearchFundResult(
        "status",
        RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "仕訳は下書きから確認済み、確認済みから公開済みへのみ変更できます",
      );
    }
    return { status: "valid", value: Object.freeze({ ...entry, status: nextStatus }) };
  },
};
