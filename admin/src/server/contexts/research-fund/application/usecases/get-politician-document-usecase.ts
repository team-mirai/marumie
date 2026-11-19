import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentRepository } from "@/server/contexts/research-fund/domain/repositories/document-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 議員のいずれかの帳簿に属する書類の署名 URL を返す。
 * 支払先は議員単位、書類は帳簿単位なので、支払先の表記の最初の書類は選択中とは別の帳簿のことがある（#1755）。
 */
export class GetPoliticianDocumentUsecase {
  constructor(
    private repository: DocumentRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(input: {
    politicianId: string;
    documentId: string;
    expiresIn: number;
  }): Promise<ResearchFundResult<{ document: ResearchFundDocument; signedUrl: string }>> {
    for (const result of [
      ResearchFundDocument.validateId(input.politicianId),
      ResearchFundDocument.validateId(input.documentId),
      ResearchFundDocument.validateExpiry(input.expiresIn),
    ]) {
      if (result.status === "invalid") return result;
    }
    const document = await this.repository.findByPolitician(input.politicianId, input.documentId);
    if (!document) {
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
