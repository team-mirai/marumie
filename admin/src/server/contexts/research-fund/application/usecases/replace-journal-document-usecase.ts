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
 * 仕訳に紐づいた書類のファイルを差し替える（#1827）。例: 納品書で登録しておき、あとで届いた正式な領収書に替える。
 *
 * ブラウザが Storage に置いた原本を正式なキーへ移して中身を確かめ（新規登録と同じ基準。#1824）、書類の原本を入れ替える。
 * 読み取りはやり直さないので、仕訳の内容・確認状況・領収書等番号はそのまま残る。公開用の版は新しい原本から作り直す。
 * 公開中の仕訳（同じ書類に紐づく別の仕訳を含む）は対象にしないので、webapp のキャッシュは無効化しない。
 */
export class ReplaceJournalDocumentUsecase {
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
      JournalOperation.replaceDocument,
    );
    const claimed = await claimUploadedDocument(this.storage, upload);
    if (claimed.status === "invalid") throw new JournalReviewError(claimed.errors[0].message);
    let replaced: { storageKey: string; maskedKey: string | null };
    try {
      replaced = await this.repository.replaceDocument(bookId, entry, claimed.value);
    } catch (error) {
      // 差し替えに失敗したら、先にアップロードした原本を残さない
      try {
        await this.storage.remove(claimed.value.storageKey);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "書類の差し替えとアップロード済み原本の削除に失敗しました",
        );
      }
      throw error;
    }
    // 前の原本と公開用の版はもう参照されない。消せなくても差し替えの結果は変えない
    for (const key of [replaced.storageKey, replaced.maskedKey]) {
      if (key === null) continue;
      try {
        await this.storage.remove(key);
      } catch {
        // 参照されないファイルが残るだけ
      }
    }
  }
}
