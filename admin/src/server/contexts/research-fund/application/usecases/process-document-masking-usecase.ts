import "server-only";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import { DocumentMaskingPolicy } from "@/server/contexts/research-fund/domain/models/document-masking";
import type { MaskableMime } from "@/server/contexts/research-fund/domain/models/masking-region";
import type {
  ClaimedMaskingDocument,
  DocumentMaskingRepository,
} from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import {
  MAX_MASKING_PAGES,
  MaskingPageLimitError,
  type ReceiptMaskingService,
} from "@/server/contexts/research-fund/application/services/receipt-masking-service";

interface ProcessDocumentMaskingResult {
  /** この呼び出しで処理した書類の数 */
  processed: number;
  succeeded: number;
  failed: number;
  /** まだ pending / running の書類が残っているか。画面はこれが true の間だけ呼び続ける */
  hasMore: boolean;
}

const MASKABLE_MIMES: readonly string[] = ["image/jpeg", "image/png", "application/pdf"];

/**
 * 未作成の書類の公開用の版（個人情報を黒塗りし、メタデータを含まない画像だけの PDF）を少数だけ作る（#1802）。
 *
 * 読み取りと同じくキュー基盤は使わず、帳簿の画面を開いている間これを繰り返し呼ぶ。読み取りとは別に進むので、
 * 読み取りを待たせない。1 回の呼び出しで着手するのは MASKING_BATCH_SIZE 件までで、既に running が上限に
 * 達していれば 1 件も着手しない（同じ書類を二重に作らない）。
 */
export class ProcessDocumentMaskingUsecase {
  constructor(
    private repository: DocumentMaskingRepository,
    private storage: DocumentStorage,
    private masking: Pick<ReceiptMaskingService, "mask">,
  ) {}

  async execute(input: { bookId: string }): Promise<ProcessDocumentMaskingResult> {
    const validation = ResearchFundDocument.validateId(input.bookId);
    if (validation.status === "invalid") throw new Error(validation.errors[0].message);

    // 関数が途中で落ちて running のまま残った書類を待機に戻す。これをしないと
    // 多重実行の防止が働いたまま、以後どの書類も作れなくなる。
    await this.repository.releaseStale(input.bookId, DocumentMaskingPolicy.staleBefore(new Date()));

    const before = await this.repository.countUnfinished(input.bookId);
    const limit = DocumentMaskingPolicy.claimableCount(before.running);
    if (limit === 0) {
      return {
        processed: 0,
        succeeded: 0,
        failed: 0,
        hasMore: before.pending + before.running > 0,
      };
    }

    const documents = await this.repository.claim(input.bookId, limit);
    let succeeded = 0;
    let failed = 0;
    for (const document of documents) {
      if (await this.maskDocument(document)) succeeded += 1;
      else failed += 1;
    }

    const after = await this.repository.countUnfinished(input.bookId);
    return {
      processed: documents.length,
      succeeded,
      failed,
      hasMore: after.pending + after.running > 0,
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
