import "server-only";
import {
  summarizeScanBatch,
  type ScanOverview,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

/** 帳簿のスキャンバッチを進捗つきで返す。有効なプロンプト版とモデル名も添える */
export class ListScanBatchesUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private model: string,
  ) {}

  async execute(politicianId: string, bookId: string): Promise<ScanOverview> {
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
}
