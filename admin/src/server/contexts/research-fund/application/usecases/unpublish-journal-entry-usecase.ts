import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

/**
 * 公開中の仕訳を確認済に戻し、公開ページから取り下げる。
 * 帳簿の公開範囲（publishedThrough）は、残った公開中の仕訳の最新月末を超えないよう戻す
 * （公開中の仕訳が無くなれば未設定）。日付を誤った仕訳を取り下げたときに、公開ページの
 * 「〜支給分」が実データより先の月を指したまま残らないようにするため。
 */
export class UnpublishJournalEntryUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}
  async execute(bookId: string, id: string, updatedAt: string) {
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.unpublish,
    );
    await this.repository.unpublish(bookId, entry);
    // 取り下げ自体は確定しているので、キャッシュ無効化の失敗は警告として返す（公開と同じ扱い）。
    let cacheWarning: string | null = null;
    try {
      await this.cacheInvalidator.invalidateWebappCache();
    } catch (error) {
      cacheWarning =
        error instanceof Error ? error.message : "ウェブアプリのキャッシュを更新できませんでした";
    }
    return { cacheWarning };
  }
}
