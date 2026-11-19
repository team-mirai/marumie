import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 書類の公開用の版を開く署名 URL を返す（admin で原本と見比べるため。#1802） */
export class GetMaskedDocumentUsecase {
  constructor(
    private repository: DocumentMaskingRepository,
    private storage: DocumentStorage,
  ) {}

  async execute(input: {
    bookId: string;
    documentId: string;
    expiresIn: number;
  }): Promise<ResearchFundResult<{ signedUrl: string }>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.documentId),
      ResearchFundDocument.validateExpiry(input.expiresIn),
    ]) {
      if (result.status === "invalid") return result;
    }
    const maskedKey = await this.repository.findMaskedKey(input.bookId, input.documentId);
    if (!maskedKey) {
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
        maskedKey === null ? "公開用の版はまだありません" : "書類が見つかりません",
      );
    }
    const url = await this.storage.createSignedUrl(maskedKey, input.expiresIn);
    if (url.status === "invalid") return url;
    return { status: "valid", value: { signedUrl: url.value } };
  }
}
