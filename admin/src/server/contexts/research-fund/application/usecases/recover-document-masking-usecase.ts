import "server-only";
import { DocumentMaskingPolicy } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { DocumentMaskingQueue } from "@/server/contexts/research-fund/domain/repositories/document-masking-queue.interface";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

interface RecoverDocumentMaskingResult {
  /** 作成中のまま止まっていたので作り直しの対象に戻した書類の数 */
  retried: number;
  /** 作り直しても止まったので失敗にした書類の数 */
  failedStale: number;
  /** キューに依頼した数（キューを使える環境だけ） */
  notified: number;
  /** その場で作った書類の数（キューを使えない環境だけ） */
  processed: number;
  /** 終わった時点で残っている pending / running の書類の数 */
  remaining: number;
}

/**
 * 公開用の版の作成の取りこぼしを拾い直す（#1812）。定期実行（Vercel Cron）から呼ぶ。
 *
 * 作成中のまま止まった書類を作り直しの対象に戻し、キューに積めなかった書類・この仕組みより前から
 * 未作成の書類も含めて、pending が残っていればキューに依頼し直す。
 * キューを使えない環境（ローカルなど）では、明示的に呼ばれたときにその場で pending が尽きるまで作る。
 */
export class RecoverDocumentMaskingUsecase {
  constructor(
    private repository: DocumentMaskingRepository,
    private queue: DocumentMaskingQueue,
    private process: { execute(): Promise<{ processed: number; remaining: number }> },
  ) {}

  async execute(now: Date = new Date()): Promise<RecoverDocumentMaskingResult> {
    const stale = await this.repository.releaseStale(
      DocumentMaskingPolicy.staleBefore(now),
      DocumentMaskingPolicy.staleOutcome,
    );
    const base = { retried: stale.retried, failedStale: stale.failed };

    if (!this.queue.enabled) {
      let processed = 0;
      let remaining = 0;
      for (;;) {
        const result = await this.process.execute();
        remaining = result.remaining;
        if (result.processed === 0) break;
        processed += result.processed;
      }
      return { ...base, notified: 0, processed, remaining };
    }

    // 作成中の処理は終わると次を依頼するので、空いている枠の分だけ依頼すれば足りる
    const counts = await this.repository.countUnfinished();
    const notified = Math.min(counts.pending, DocumentMaskingPolicy.claimableCount(counts.running));
    for (let i = 0; i < notified; i += 1) await this.queue.notify();
    return { ...base, notified, processed: 0, remaining: counts.pending + counts.running };
  }
}
