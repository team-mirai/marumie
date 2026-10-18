import "server-only";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 領収書なしで作った支出の仕訳に、あとから届いた領収書ファイルを紐づける。
 *
 * 原本を Storage に保存し、書類として登録して仕訳に紐づける。読み取りジョブは作らないので、
 * この書類から AI 読み取りで新しい仕訳ができることはない。紐づけた仕訳の徴し難かった事情は消える
 * （書類と事情を同時に持たない）。公開中の仕訳は対象にしないので、webapp のキャッシュは無効化しない。
 */
export class AttachJournalDocumentUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(
    bookId: string,
    id: string,
    updatedAt: string,
    file: { bytes: Uint8Array; mime: string; originalFilename: string },
  ): Promise<void> {
    for (const result of [
      ResearchFundDocument.validateFile(file.bytes, file.mime),
      ResearchFundDocument.validateFilename(file.originalFilename),
    ]) {
      if (result.status === "invalid") throw new JournalReviewError(result.errors[0].message);
    }
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.attachDocument,
    );
    const uploaded = await this.storage.upload(file.bytes, file.mime);
    if (uploaded.status === "invalid") throw new JournalReviewError(uploaded.errors[0].message);
    try {
      await this.repository.attachDocument(bookId, entry, {
        storageKey: uploaded.value,
        mime: file.mime,
        originalFilename: file.originalFilename,
      });
    } catch (error) {
      // 紐づけに失敗したら、先にアップロードした原本を残さない
      try {
        await this.storage.remove(uploaded.value);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "領収書の紐づけとアップロード済み原本の削除に失敗しました",
        );
      }
      throw error;
    }
  }
}
