import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 書類の公開用の版を作る・作り直す対象に戻す（#1802）。実際に作るのは ProcessDocumentMaskingUsecase。
 * 作成中の書類は二重に作らないため受け付けない。前の版は新しい版ができた時点で置き換わる。
 */
export class RequestDocumentMaskingUsecase {
  constructor(private repository: DocumentMaskingRepository) {}

  async execute(input: {
    bookId: string;
    documentId: string;
  }): Promise<ResearchFundResult<undefined>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.documentId),
    ]) {
      if (result.status === "invalid") return result;
    }
    const outcome = await this.repository.request(input.bookId, input.documentId);
    if (outcome === "not-found")
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
        "書類が見つかりません",
      );
    if (outcome === "running")
      return invalidResearchFundResult(
        "documentId",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "公開用の版を作成中です。終わってから作り直してください",
      );
    return { status: "valid", value: undefined };
  }
}
