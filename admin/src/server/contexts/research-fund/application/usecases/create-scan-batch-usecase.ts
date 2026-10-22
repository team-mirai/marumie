import "server-only";
import {
  type ClaimedDocument,
  claimUploadedDocument,
  validateDocumentUpload,
} from "@/server/contexts/research-fund/application/services/claim-uploaded-document";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentUpload } from "@/server/contexts/research-fund/domain/models/document-upload";
import {
  ScanBatchError,
  requireActivePrompt,
  validateScanBatchCount,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { DocumentUploadStorage } from "@/server/contexts/research-fund/domain/repositories/document-upload-storage.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

/**
 * ブラウザがストレージに置いた書類を登録し、バッチと queued ジョブ（1書類=1ジョブ）を作る。
 * 書類は正式なキーへ移してから中身（形式・サイズ）を確かめる（#1824）。
 * ジョブの実行（LLM 呼び出し）はここでは行わない。
 */
export class CreateScanBatchUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private storage: DocumentStorage & DocumentUploadStorage,
    private model: string,
  ) {}

  async execute(input: {
    politicianId: string;
    bookId: string;
    userId: string;
    documents: DocumentUpload[];
  }): Promise<ResearchFundResult<{ batchId: string }>> {
    const owner = { politicianId: input.politicianId, userId: input.userId };
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      validateScanBatchCount(input.documents.length),
      ...input.documents.map((document) => validateDocumentUpload(document, owner)),
    ]) {
      if (result.status === "invalid") return result;
    }
    const prompt = requireActivePrompt(await this.promptRepository.findActive(input.politicianId));

    const claimed: string[] = [];
    let cleanedUp = false;
    try {
      const documents: ClaimedDocument[] = [];
      for (const document of input.documents) {
        const result = await claimUploadedDocument(this.storage, document);
        // 置かれていない・中身が対応していない書類があれば、残りを登録せず片付ける
        if (result.status === "invalid") {
          cleanedUp = true;
          await this.discard(claimed, new ScanBatchError(result.errors[0].message));
          return result;
        }
        claimed.push(result.value.storageKey);
        documents.push(result.value);
      }
      const batchId = await this.scanRepository.createBatch({
        bookId: input.bookId,
        uploadedById: input.userId,
        promptId: prompt.id,
        model: this.model,
        documents,
      });
      return { status: "valid", value: { batchId } };
    } catch (error) {
      // 保存に失敗したら、先に登録した原本を残さない（片付け済みなら再実行しない）
      if (!cleanedUp) await this.discard(claimed, error);
      throw error;
    }
  }

  private async discard(storageKeys: string[], cause: unknown): Promise<void> {
    const failures: unknown[] = [];
    for (const storageKey of storageKeys) {
      try {
        await this.storage.remove(storageKey);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (failures.length > 0)
      throw new AggregateError(
        [cause, ...failures],
        "バッチの作成とアップロード済み原本の削除に失敗しました",
      );
  }
}
