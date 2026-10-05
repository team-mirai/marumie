import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import {
  ScanBatchError,
  requireActivePrompt,
  validateScanUpload,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

interface UploadedDocument {
  bytes: Uint8Array;
  mime: string;
  originalFilename: string;
}

/**
 * 書類を Storage に保存し、バッチと queued ジョブ（1書類=1ジョブ）を作る。
 * ジョブの実行（LLM 呼び出し）はここでは行わない。
 */
export class CreateScanBatchUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private storage: DocumentStorage,
    private model: string,
  ) {}

  async execute(input: {
    politicianId: string;
    bookId: string;
    userId: string;
    documents: UploadedDocument[];
  }): Promise<ResearchFundResult<{ batchId: string }>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      validateScanUpload(input.documents),
      ...input.documents.flatMap((document) => [
        ResearchFundDocument.validateFile(document.bytes, document.mime),
        ResearchFundDocument.validateFilename(document.originalFilename),
      ]),
    ]) {
      if (result.status === "invalid") return result;
    }
    const prompt = requireActivePrompt(await this.promptRepository.findActive(input.politicianId));

    const uploaded: string[] = [];
    let cleanedUp = false;
    try {
      const documents = [];
      for (const document of input.documents) {
        const result = await this.storage.upload(document.bytes, document.mime);
        // 事前検証を通ったので通常は起きないが、起きたら残りをアップロードせず片付ける
        if (result.status === "invalid") {
          cleanedUp = true;
          await this.discard(uploaded, new ScanBatchError("書類のアップロードに失敗しました"));
          return result;
        }
        uploaded.push(result.value);
        documents.push({
          storageKey: result.value,
          mime: document.mime,
          originalFilename: document.originalFilename,
        });
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
      // 保存に失敗したら、先にアップロードした原本を残さない（片付け済みなら再実行しない）
      if (!cleanedUp) await this.discard(uploaded, error);
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
