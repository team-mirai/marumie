import "server-only";
import { findDuplicateDocuments } from "@/server/contexts/research-fund/domain/models/duplicate-document";
import {
  summarizeScanBatch,
  type ScanOverview,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { DuplicateDocumentRepository } from "@/server/contexts/research-fund/domain/repositories/duplicate-document-repository.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

/**
 * 帳簿のスキャンバッチを進捗つきで返す。有効なプロンプト版とモデル名、
 * 同じ書類を二重にスキャンした可能性のある書類も添える
 */
export class ListScanBatchesUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private duplicateDocumentRepository: DuplicateDocumentRepository,
    private model: string,
  ) {}

  async execute(politicianId: string, bookId: string): Promise<ScanOverview> {
    const [batches, prompt, documents] = await Promise.all([
      this.scanRepository.listBatches(bookId),
      this.promptRepository.findActive(politicianId),
      this.duplicateDocumentRepository.listScannedDocuments(bookId),
    ]);
    return {
      batches: batches.map((batch) => ({ ...batch, progress: summarizeScanBatch(batch.jobs) })),
      activePromptVersion: prompt?.version ?? null,
      model: this.model,
      duplicates: findDuplicateDocuments(documents),
    };
  }
}
