import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { DocumentMaskingPolicy } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 依頼の直後に状態が変わったときに依頼し直す回数の上限 */
const REQUEST_ATTEMPTS = 3;

/**
 * 書類の公開用の版を作る・作り直す対象に戻す（#1802）。実際に作るのは ProcessDocumentMaskingUsecase。
 * 作成中の書類は二重に作らないため受け付けない。前の版は新しい版ができた時点で置き換わる。
 * 追加の指示は書類に保存し、キュー・定期実行・止まったあとの作り直しでも使う。空なら指示なしで作り直す（#1867）
 */
export class RequestDocumentMaskingUsecase {
  constructor(private repository: DocumentMaskingRepository) {}

  async execute(input: {
    bookId: string;
    documentId: string;
    instruction?: string | null;
  }): Promise<ResearchFundResult<undefined>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.documentId),
    ]) {
      if (result.status === "invalid") return result;
    }
    const instruction = DocumentMaskingPolicy.validateInstruction(input.instruction);
    if (instruction.status === "invalid") return instruction;
    for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
      const outcome = await this.repository.request(
        input.bookId,
        input.documentId,
        instruction.value,
        DocumentMaskingPolicy.requestableStatuses,
      );
      if (outcome === null)
        return invalidResearchFundResult(
          "documentId",
          RF_ERROR_CODES.DOCUMENT_NOT_FOUND,
          "書類が見つかりません",
        );
      if (outcome.requested) return { status: "valid", value: undefined };
      const rejection = DocumentMaskingPolicy.validateRequest(outcome.status);
      if (rejection.status === "invalid") return rejection;
      // 戻せなかった直後に作成が終わり、いまは依頼を受けられる状態になっている。もう一度依頼する
    }
    throw new Error("Document masking status kept changing while requesting");
  }
}
