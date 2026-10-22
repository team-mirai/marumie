import "server-only";
import {
  claimUploadedDocument,
  validateDocumentUpload,
} from "@/server/contexts/research-fund/application/services/claim-uploaded-document";
import { acceptJournalEntry } from "@/server/contexts/research-fund/application/services/journal-review-targets";
import type {
  DocumentUpload,
  DocumentUploadOwner,
} from "@/server/contexts/research-fund/domain/models/document-upload";
import { JournalOperation } from "@/server/contexts/research-fund/domain/models/journal-operation";
import { JournalReviewError } from "@/server/contexts/research-fund/domain/models/journal-review";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { DocumentUploadStorage } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import type { JournalReviewRepository } from "@/server/contexts/research-fund/domain/repositories/journal-review-repository.interface";

/**
 * 領収書なしで作った支出の仕訳に、あとから届いた領収書ファイルを紐づける。
 *
 * ブラウザが Storage に置いた原本を正式なキーへ移して中身を確かめ（#1824）、書類として登録して仕訳に紐づける。
 * 読み取りジョブは作らないので、この書類から AI 読み取りで新しい仕訳ができることはない。紐づけても仕訳の徴難と徴し難かった事情はそのまま残る
 * （徴難は書類の有無と独立）。公開中の仕訳は対象にしないので、webapp のキャッシュは無効化しない。
 */
export class AttachJournalDocumentUsecase {
  constructor(
    private repository: JournalReviewRepository,
    private storage: DocumentStorage & DocumentUploadStorage,
  ) {}

  async execute(
    bookId: string,
    id: string,
    updatedAt: string,
    upload: DocumentUpload,
    owner: DocumentUploadOwner,
  ): Promise<void> {
    const validation = validateDocumentUpload(upload, owner);
    if (validation.status === "invalid") throw new JournalReviewError(validation.errors[0].message);
    const entry = await acceptJournalEntry(
      this.repository,
      bookId,
      id,
      updatedAt,
      JournalOperation.attachDocument,
    );
    const claimed = await claimUploadedDocument(this.storage, upload);
    if (claimed.status === "invalid") throw new JournalReviewError(claimed.errors[0].message);
    try {
      await this.repository.attachDocument(bookId, entry, claimed.value);
    } catch (error) {
      // 紐づけに失敗したら、先にアップロードした原本を残さない
      try {
        await this.storage.remove(claimed.value.storageKey);
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
