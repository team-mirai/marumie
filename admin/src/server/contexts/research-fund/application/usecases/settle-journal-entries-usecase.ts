import "server-only";
import {
  acceptJournalEntries,
  type JournalTarget,
} from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { validateSettlementDate } from "@/server/contexts/research-fund/domain/models/advance";
import { todayInJst } from "@/server/contexts/research-fund/domain/models/calendar-date";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 選んだ未精算の立替をまとめて精算済にする。精算は「立替者へまとめてお金を移した」記録なので、
 * 金額が確定した確認済・公開中の仕訳だけを対象にする（既存のまとめて操作と同じ「全件か無し」の扱い）。
 * 精算は公開内容を変えないので、webapp のキャッシュは無効化しない。
 */
export class SettleJournalEntriesUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, targets: readonly JournalTarget[], settledAt: string) {
    const { accepted: settling } = await acceptJournalEntries(
      this.repository,
      bookId,
      targets,
      JournalOperation.settle,
      {
        action: "精算する",
        cannot: "精算できない",
        notDone: "精算しませんでした",
        missing: "精算できない仕訳（支給・返還など）が選ばれています",
      },
    );
    const date = validateSettlementDate(
      settledAt,
      settling.map((entry) => entry.entryDate),
      todayInJst(new Date()),
    );
    if (date.status === "invalid") throw new JournalReviewError(date.errors[0].message);
    await this.repository.settleMany(bookId, settling, date.value);
    return { settled: settling.length, settledAt: date.value };
  }
}
