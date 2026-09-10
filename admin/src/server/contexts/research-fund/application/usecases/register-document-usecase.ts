import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export class RegisterDocumentUsecase {
  constructor(
    private repository: DocumentRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(input: {
    bookId: string;
    bytes: Uint8Array;
    mime: string;
    originalFilename: string;
  }): Promise<ResearchFundResult<ResearchFundDocument>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateFile(input.bytes, input.mime),
      ResearchFundDocument.validateFilename(input.originalFilename),
    ]) {
      if (result.status === "invalid") return result;
    }
    const uploaded = await this.storage.upload(input.bytes, input.mime);
    if (uploaded.status === "invalid") return uploaded;
    try {
      const document = await this.repository.create({
        bookId: input.bookId,
        mime: input.mime,
        originalFilename: input.originalFilename,
        storageKey: uploaded.value,
      });
      return { status: "valid", value: document };
    } catch (error) {
      try {
        await this.storage.remove(uploaded.value);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "書類の登録とアップロード済み原本の削除に失敗しました",
        );
      }
      throw error;
    }
  }
}
