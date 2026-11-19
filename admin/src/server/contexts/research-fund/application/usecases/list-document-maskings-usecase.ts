import "server-only";
import type { DocumentMasking } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

/** 帳簿の書類ごとの公開用の版の状態を、書類 ID をキーにして返す（#1802） */
export class ListDocumentMaskingsUsecase {
  constructor(private repository: DocumentMaskingRepository) {}

  async execute(bookId: string): Promise<Record<string, DocumentMasking>> {
    const maskings = await this.repository.listByBook(bookId);
    return Object.fromEntries(maskings.map((masking) => [masking.documentId, masking]));
  }
}
