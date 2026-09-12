import "server-only";
import { ScanJob } from "@/server/contexts/research-fund/domain/models/scan-job";
import type { ReceiptExtractionGateway } from "@/server/contexts/research-fund/domain/repositories/receipt-extraction-gateway.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type {
  ClaimedScanJob,
  ScanRepository,
} from "@/server/contexts/research-fund/domain/repositories/scan-repository.interface";
import { buildScanDraftEntries } from "@/server/contexts/research-fund/domain/services/scan-journal-builder";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";

interface ProcessScanJobsResult {
  /** この呼び出しで処理したジョブ数 */
  processed: number;
  succeeded: number;
  failed: number;
  /** まだ queued / running のジョブが残っているか。画面はこれが true の間だけ呼び続ける */
  hasMore: boolean;
}

type ExtractableMime = "image/jpeg" | "image/png" | "application/pdf";

const EXTRACTABLE_MIMES: readonly string[] = ["image/jpeg", "image/png", "application/pdf"];

/**
 * 待機中のスキャンジョブを少数だけ処理する。
 *
 * キュー基盤は使わず、画面が未処理の残っている間これを繰り返し呼ぶ（設計: ジョブ実行方式）。
 * 1 回の呼び出しで着手するのは SCAN_JOB_BATCH_SIZE 件までで、既に running が上限に
 * 達していれば 1 件も着手しない（多重実行の防止）。
 */
export class ProcessScanJobsUsecase {
  constructor(
    private scanRepository: ScanRepository,
    private storage: DocumentStorage,
    private gateway: ReceiptExtractionGateway,
  ) {}

  async execute(input: { bookId: string; userId: string }): Promise<ProcessScanJobsResult> {
    const validation = ResearchFundDocument.validateId(input.bookId);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);

    // 関数が途中で落ちて running のまま残ったジョブを待機中に戻す。これをしないと
    // 多重実行の防止が働いたまま、以後どのジョブも着手できなくなる。
    await this.scanRepository.releaseStaleJobs(input.bookId, ScanJob.staleBefore(new Date()));

    const before = await this.scanRepository.countUnfinished(input.bookId);
    const limit = ScanJob.claimableCount(before.running);
    if (limit === 0) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        hasMore: before.queued + before.running > 0,
      };
    }

    const jobs = await this.scanRepository.claimJobs(input.bookId, limit);
    let succeeded = 0;
    let failed = 0;
    for (const job of jobs) {
      const ok = await this.runJob(job, input);
      if (ok) succeeded += 1;
      else failed += 1;
    }

    const after = await this.scanRepository.countUnfinished(input.bookId);
    return {
      processed: jobs.length,
      succeeded,
      failed,
      hasMore: after.queued + after.running > 0,
    };
  }

  /** 1 ジョブを読み取って下書き仕訳にする。成功したら true。失敗は error に記録して飲み込む */
  private async runJob(
    job: ClaimedScanJob,
    input: { bookId: string; userId: string },
  ): Promise<boolean> {
    let rawJson: unknown;
    try {
      if (!EXTRACTABLE_MIMES.includes(job.mime)) {
        await this.scanRepository.failJob(job.id, "JPG・PNG・PDFのみ読み取れます");
        return false;
      }
      const bytes = await this.storage.download(job.storageKey);
      if (bytes.status === "invalid") {
        await this.scanRepository.failJob(job.id, bytes.errors[0].message);
        return false;
      }
      const extracted = await this.gateway.extract({
        document: { bytes: bytes.value, mime: job.mime as ExtractableMime },
        officePrompt: job.officePrompt,
      });
      if (extracted.status === "invalid") {
        await this.scanRepository.failJob(job.id, extracted.errors[0].message);
        return false;
      }
      rawJson = extracted.value;
      const accounts = await this.scanRepository.accounts();
      const entries = buildScanDraftEntries(extracted.value, {
        documentId: job.documentId,
        accounts,
      });
      if (entries.status === "invalid") {
        await this.scanRepository.failJob(job.id, entries.errors[0].message, rawJson);
        return false;
      }
      await this.scanRepository.completeJob({
        bookId: input.bookId,
        jobId: job.id,
        documentId: job.documentId,
        rawJson: extracted.value,
        entries: entries.value,
        userId: input.userId,
      });
      return true;
    } catch (error) {
      // 1 件の失敗で残りのジョブを巻き込まない。原因はジョブの error に残す
      await this.scanRepository.failJob(
        job.id,
        error instanceof Error && error.message
          ? error.message
          : "読み取りに失敗しました。再実行してください",
        rawJson,
      );
      return false;
    }
  }

  /** 失敗したジョブを待機中に戻す。戻せなければ false（既に処理済みなど） */
  async retry(input: { bookId: string; jobId: string }): Promise<boolean> {
    for (const result of [
      ResearchFundDocument.validateId(input.bookId),
      ResearchFundDocument.validateId(input.jobId),
    ]) {
      if (result.status === "invalid") throw new Error(result.errors[0].message);
    }
    return await this.scanRepository.requeueJob(input.bookId, input.jobId);
  }
}
