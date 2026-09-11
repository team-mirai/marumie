import "server-only";
import { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";
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

  async snapshot(bookId: string) {
    const snapshot = await this.repository.snapshot(bookId);
    if (!snapshot) throw new PublicationError("帳簿が見つかりません");
    return snapshot;
  }

  async publish(bookId: string, ids: readonly string[]) {
    const unique = [...new Set(ids)];
    if (unique.length === 0) throw new PublicationError("公開する仕訳を選んでください");
    if (unique.some((id) => !/^[1-9]\d*$/.test(id))) throw new PublicationError("仕訳IDが不正です");
    const target = await this.repository.pending(bookId, unique);
    if (!target) throw new PublicationError("帳簿が見つかりません");
    if (target.entries.length !== unique.length)
      throw new PublicationError("選んだ仕訳が見つかりません。画面を再読み込みしてください");
    // 下書きは公開できない。確認済 → 公開済 の遷移だけをドメインが許す。
    for (const entry of target.entries) {
      if (JournalEntry.transition(entry, "published").status === "invalid")
        throw new PublicationError(
          "確認済の仕訳だけを公開できます。下書きは先に確認済にしてください",
        );
      // 画面のチェックリストに出ない仕訳は before / after で確認できないので公開させない。
      if (!Publication.isPublishable(entry.rowCount))
        throw new PublicationError(
          "この画面で公開できない仕訳が含まれています。画面を再読み込みしてください",
        );
    }
    const publishedThrough = Publication.advancePublishedThrough(
      target.publishedThrough,
      target.entries.map((entry) => entry.entryDate),
    );
    await this.repository.publish(bookId, unique, publishedThrough);
    // 公開自体は確定しているので、キャッシュ無効化の失敗は警告として返す。
    let cacheWarning: string | null = null;
    try {
      await this.cacheInvalidator.invalidateWebappCache();
    } catch (error) {
      cacheWarning =
        error instanceof Error ? error.message : "ウェブアプリのキャッシュを更新できませんでした";
    }
    return { count: unique.length, publishedThrough, cacheWarning };
  }
}
