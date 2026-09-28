import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import {
  ScanBatchError,
  summarizeScanBatch,
  validateScanUpload,
  type ScanOverview,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import {
  planReread,
  validateRereadInstruction,
} from "@/server/contexts/research-fund/domain/models/scan-reread";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

interface UploadedDocument {
  bytes: Uint8Array;
  mime: string;
  originalFilename: string;
}

export class ManageScanUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private storage: DocumentStorage,
    private model: string,
  ) {}

  async list(politicianId: string, bookId: string): Promise<ScanOverview> {
    const [batches, prompt] = await Promise.all([
      this.scanRepository.listBatches(bookId),
      this.promptRepository.findActive(politicianId),
    ]);
    return {
      batches: batches.map((batch) => ({ ...batch, progress: summarizeScanBatch(batch.jobs) })),
      activePromptVersion: prompt?.version ?? null,
      model: this.model,
    };
  }

  /**
   * 書類を Storage に保存し、バッチと queued ジョブ（1書類=1ジョブ）を作る。
   * ジョブの実行（LLM 呼び出し）はここでは行わない。
   */
  async createBatch(input: {
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
    const prompt = await this.promptRepository.findActive(input.politicianId);
    if (!prompt)
      throw new ScanBatchError(
        "読み取りプロンプトが未保存です。「読み取りプロンプト」から保存してください",
      );

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

  /**
   * 選んだ下書きが紐づく書類を、指示つきで読み直すバッチと queued ジョブを作る。
   * 読み直しは書類単位で、成功したジョブがその書類の下書きをすべて置き換える（ProcessScanJobsUsecase）。
   * 確認済・公開中の仕訳を含む書類と、書類の紐づかない下書きは対象にしない。
   */
  async reread(input: {
    politicianId: string;
    bookId: string;
    userId: string;
    entryIds: readonly string[];
    instruction: string;
  }): Promise<
    ResearchFundResult<{ batchId: string; documentCount: number; excludedCount: number }>
  > {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ...input.entryIds.map((id) => ResearchFundDocument.validateId(id)),
    ]) {
      if (result.status === "invalid") return result;
    }
    if (input.entryIds.length === 0)
      return invalidResearchFundResult(
        "entryIds",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        "読み直す下書きを選んでください",
      );
    const instruction = validateRereadInstruction(input.instruction);
    if (instruction.status === "invalid") return instruction;
    const prompt = await this.promptRepository.findActive(input.politicianId);
    if (!prompt)
      throw new ScanBatchError(
        "読み取りプロンプトが未保存です。「読み取りプロンプト」から保存してください",
      );

    const candidates = await this.scanRepository.findRereadCandidates(input.bookId, [
      ...new Set(input.entryIds),
    ]);
    const plan = planReread(candidates);
    if (plan.status === "invalid") return plan;
    const { documentIds, excludedCount } = plan.value;
    if (documentIds.length === 0)
      return invalidResearchFundResult(
        "entryIds",
        RF_ERROR_CODES.INVALID_DOCUMENT,
        excludedCount > 0
          ? "選んだ下書きの書類には確認済・公開中の仕訳があるため、読み直せません"
          : "書類の紐づいた下書きを選んでください",
      );
    const batchId = await this.scanRepository.createRereadBatch({
      bookId: input.bookId,
      uploadedById: input.userId,
      promptId: prompt.id,
      model: this.model,
      documentIds,
      instruction: instruction.value,
    });
    return {
      status: "valid",
      value: { batchId, documentCount: documentIds.length, excludedCount },
    };
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
