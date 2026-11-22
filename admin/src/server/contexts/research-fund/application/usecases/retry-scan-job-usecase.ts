import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { ScanJob } from "@/server/contexts/research-fund/domain/models/scan-job";
import type { ScanRepository } from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

/**
 * 失敗したジョブを待機中に戻す。再実行できなければ却下理由を返す（既に処理済みなど）。
 * 実行そのものは ProcessScanJobsUsecase が拾う。
 */
export class RetryScanJobUsecase {
  constructor(private scanRepository: ScanRepository) {}

  async execute(input: { bookId: string; jobId: string }): Promise<ResearchFundResult<undefined>> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.jobId),
    ]) {
      if (result.status === "invalid") throw new Error(result.errors[0].message);
    }
    const retry = ScanJob.retry(await this.scanRepository.findJobStatus(input.bookId, input.jobId));
    if (retry.status === "invalid") return retry;
    // 判定の後に同時に走った再実行などが状態を変えていれば戻さない（二重に実行しない）
    const requeued = await this.scanRepository.requeueJob(input.bookId, input.jobId, retry.value);
    if (!requeued) return ScanJob.retryRejection();
    return { status: "valid", value: undefined };
  }
}
