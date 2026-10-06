import "server-only";
import { invalidateWebappCache } from "@/server/contexts/research-fund/application/services/invalidate-webapp-cache";
import {
  Publication,
  PublicationError,
} from "@/server/contexts/research-fund/domain/models/publication";
import type { PublicationRepository } from "@/server/contexts/research-fund/domain/repositories/publication-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

export class PublishJournalEntriesUsecase {
  constructor(
    private repository: PublicationRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(bookId: string, ids: readonly string[]) {
    const unique = [...new Set(ids)];
    const selectionRejection = Publication.selectionRejection(unique);
    if (selectionRejection) throw new PublicationError(selectionRejection);
    const target = await this.repository.pending(bookId, unique);
    if (!target) throw new PublicationError("帳簿が見つかりません");
    if (target.entries.length !== unique.length)
      throw new PublicationError("選んだ仕訳が見つかりません。画面を再読み込みしてください");
    for (const entry of target.entries) {
      const rejection = Publication.entryRejection(entry);
      if (rejection) throw new PublicationError(rejection);
    }
    const publishedThrough = Publication.advancePublishedThrough(
      target.publishedThrough,
      target.entries.map((entry) => entry.entryDate),
    );
    await this.repository.publish(bookId, unique, publishedThrough);
    return {
      count: unique.length,
      publishedThrough,
      cacheWarning: await invalidateWebappCache(this.cacheInvalidator),
    };
  }
}
