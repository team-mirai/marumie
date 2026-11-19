import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export class GetDocumentUsecase {
  constructor(
    private repository: DocumentRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(input: {
    bookId: string;
    documentId: string;
    expiresIn: number;
  }): Promise<ResearchFundResult<{ document: ResearchFundDocument; signedUrl: string }>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.documentId),
      ResearchFundDocument.validateExpiry(input.expiresIn),
    ]) {
      if (result.status === "invalid") return result;
    }
    const document = await this.repository.findById(input.bookId, input.documentId);
    if (!document || document.bookId !== input.bookId) {
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "書類が見つかりません",
      );
    }
    const url = await this.storage.createSignedUrl(document.storageKey, input.expiresIn);
    if (url.status === "invalid") return url;
    return { status: "valid", value: { document, signedUrl: url.value } };
  }
}
