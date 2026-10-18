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
    // どの仕訳がなぜ公開できないかを、まとめて利用者に示す（1 件ずつ直して出し直させない）
    const rejections = target.entries.flatMap((entry) => {
      const rejection = Publication.entryRejection(entry);
      return rejection ? [`「${entry.description}」${rejection}`] : [];
    });
    if (rejections.length > 0)
      throw new PublicationError(`公開できない仕訳があります。${rejections.join("／")}`);
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
