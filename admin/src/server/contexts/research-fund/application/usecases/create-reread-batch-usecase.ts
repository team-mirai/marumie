import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { requireActivePrompt } from "@/server/contexts/research-fund/domain/models/scan-batch";
import {
  planReread,
  validateRereadInstruction,
  validateRereadSelection,
} from "@/server/contexts/research-fund/domain/models/scan-reread";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 選んだ下書きが紐づく書類を、指示つきで読み直すバッチと queued ジョブを作る。
 * 読み直しは書類単位で、成功したジョブがその書類の下書きをすべて置き換える（ProcessScanJobsUsecase）。
 * 確認済・公開中の仕訳を含む書類と、書類の紐づかない下書きは対象にしない。
 */
export class CreateRereadBatchUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private promptRepository: PromptRepository,
    private model: string,
  ) {}

  async execute(input: {
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
      validateRereadSelection(input.entryIds),
    ]) {
      if (result.status === "invalid") return result;
    }
    const instruction = validateRereadInstruction(input.instruction);
    if (instruction.status === "invalid") return instruction;
    const prompt = requireActivePrompt(await this.promptRepository.findActive(input.politicianId));

    const candidates = await this.scanRepository.findRereadCandidates(input.bookId, [
      ...new Set(input.entryIds),
    ]);
    const plan = planReread(candidates);
    if (plan.status === "invalid") return plan;
    const { documentIds, excludedCount } = plan.value;
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
}
