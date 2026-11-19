import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 支出の仕訳に徴難（領収書等を徴し難かった）を付ける・外す。書類の有無は問わない。
 * 外すと徴し難かった事情も消す（事情は徴難の仕訳だけが持てる）。
 *
 * 徴難は議員課提出用の帳簿の情報で公開内容を変えないので、公開中・精算済の仕訳でも変更でき、
 * webapp のキャッシュは無効化しない。
 */
export class SetReceiptAbsentUsecase {
  constructor(private repository: JournalReviewRepository) {}
  async execute(bookId: string, id: string, updatedAt: string, receiptAbsent: boolean) {
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.setReceiptAbsent,
    );
    await this.repository.setReceiptAbsent(bookId, entry, receiptAbsent);
    return { receiptAbsent };
  }
}
