import "server-only";
import { DocumentMaskingPolicy } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { MaskableMime } from "@/server/contexts/research-fund/domain/models/masking-region";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
} from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import type { DocumentMaskingQueue } from "@/server/contexts/research-fund/domain/repositories/document-masking-queue.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import {
  MAX_MASKING_PAGES,
  MaskingPageLimitError,
  type ReceiptMaskingService,
} from "@/server/contexts/research-fund/application/services/receipt-masking-service";

interface ProcessDocumentMaskingResult {
  /** この呼び出しで着手した書類の数（0 か 1） */
  processed: number;
  succeeded: number;
  failed: number;
  /** 呼び出しの後に残っている pending / running の書類の数 */
  remaining: number;
}

const MASKABLE_MIMES: readonly string[] = ["image/jpeg", "image/png", "application/pdf"];

/**
 * 未作成の書類（どの帳簿でもよい）の公開用の版（個人情報を黒塗りし、メタデータを含まない画像だけの PDF）を
 * 1 件作る（#1802 / #1812）。キューからメッセージが届くたびに呼ばれる。
 *
 * - 着手は DB で取り合うので、同じメッセージが 2 回届いても同じ書類を二重に作らない
 * - running が上限に達していれば着手しない。作成中の処理が終わったときに次を依頼するので取りこぼさない
 * - 作り終えて pending が残っていれば次を依頼し、書類が尽きるまで順に作り進める
 */
export class ProcessDocumentMaskingUsecase {
  constructor(
    private repository: DocumentMaskingRepository,
    private storage: DocumentStorage,
    private masking: Pick<ReceiptMaskingService, "mask">,
    private queue: DocumentMaskingQueue,
  ) {}

  async execute(): Promise<ProcessDocumentMaskingResult> {
    const before = await this.repository.countUnfinished();
    if (DocumentMaskingPolicy.claimableCount(before.running) === 0)
      return { processed: 0, succeeded: 0, failed: 0, remaining: before.pending + before.running };

    const document = await this.repository.claimNext();
    if (!document)
      return { processed: 0, succeeded: 0, failed: 0, remaining: before.pending + before.running };

    const succeeded = await this.maskDocument(document);
    const after = await this.repository.countUnfinished();
    if (after.pending > 0) await this.queue.notify();
    return {
      processed: 1,
      succeeded: succeeded ? 1 : 0,
      failed: succeeded ? 0 : 1,
      remaining: after.pending + after.running,
    };
  }

  /** 1 書類の公開用の版を作って記録する。成功したら true。失敗は理由を記録して飲み込む */
  private async maskDocument(document: ClaimedMaskingDocument): Promise<boolean> {
    try {
      if (!MASKABLE_MIMES.includes(document.mime)) {
        await this.fail(document, "JPG・PNG・PDFのみ公開用の版を作れます");
        return false;
      }
      const original = await this.storage.download(document.storageKey);
      if (original.status === "invalid") {
        await this.fail(document, original.errors[0].message);
        return false;
      }
      const masked = await this.masking.mask({
        bytes: original.value,
        mime: document.mime as MaskableMime,
        instruction: document.instruction,
      });
      const uploaded = await this.storage.upload(masked.bytes, masked.mime);
      if (uploaded.status === "invalid") {
        await this.fail(document, uploaded.errors[0].message);
        return false;
      }
      const recorded = await this.repository.complete({
        claimed: document,
        maskedKey: uploaded.value,
        regionCount: masked.regionCount,
      });
      if (!recorded.recorded) {
        // 失効して別の実行が着手し直していた。こちらで作った版は使われないので消す
        await this.removeQuietly(uploaded.value);
        return false;
      }
      // 作り直した場合は前の版を消す（記録は新しい版に置き換わっている）
      if (recorded.replacedKey !== null) await this.removeQuietly(recorded.replacedKey);
      return true;
    } catch (error) {
      // 1 件の失敗で残りの書類を巻き込まない。原因は書類に残す
      await this.fail(document, failureMessage(error));
      return false;
    }
  }

  private async fail(document: ClaimedMaskingDocument, message: string): Promise<void> {
    await this.repository.fail(document, DocumentMaskingPolicy.errorMessage(message));
  }

  /** 使われなくなった版のファイルを消す。消せなくても作成の結果は変えない */
  private async removeQuietly(storageKey: string): Promise<void> {
    try {
      await this.storage.remove(storageKey);
    } catch {
      // 参照されないファイルが残るだけで、公開用の版の状態には影響しない
    }
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof MaskingPageLimitError)
    return DocumentMaskingPolicy.pageLimitMessage(error.pageCount, MAX_MASKING_PAGES);
  return error instanceof Error && error.message
    ? error.message
    : "公開用の版の作成に失敗しました。作り直してください";
}
