import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 支払先を紐づける仕訳を受け付け、帳簿の議員（紐づけてよい支払先の持ち主）とあわせて返す。
 * 既存の支払先を紐づける usecase と、支払先を作成して紐づける usecase が同じ判定を共有するために置く。
 */
export async function acceptPayeeLinkTargets(
  repository: JournalReviewRepository,
  bookId: string,
  targets: readonly JournalTarget[],
) {
  const politicianId = await repository.politicianId(bookId);
  if (politicianId === null) throw new JournalReviewError("帳簿が見つかりません");
  const { accepted } = await acceptJournalEntries(
    repository,
    bookId,
    targets,
    JournalOperation.setPayee,
    {
      action: "支払先を設定する",
      cannot: "支払先を設定できない",
      notDone: "変更しませんでした",
      missing: "支払先を設定できない仕訳（支給・返還など）が選ばれています",
    },
  );
  return { politicianId, accepted };
}
