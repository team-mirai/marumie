import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";

/**
 * 失敗したジョブを待機中に戻す。戻せなければ false（既に処理済みなど）。
 * 実行そのものは ProcessScanJobsUsecase が拾う。
 */
export class RetryScanJobUsecase {
  constructor(private scanRepository: ScanRepository) {}

  async execute(input: { bookId: string; jobId: string }): Promise<boolean> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.jobId),
    ]) {
      if (result.status === "invalid") throw new Error(result.errors[0].message);
    }
    return await this.scanRepository.requeueJob(input.bookId, input.jobId);
  }
}
