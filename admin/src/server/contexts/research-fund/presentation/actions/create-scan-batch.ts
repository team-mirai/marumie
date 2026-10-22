"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import type { DocumentUpload } from "@/server/contexts/research-fund/domain/models/document-upload";
import {
  ScanBatchError,
  SCAN_BATCH_MAX_DOCUMENTS,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { notifyDocumentMasking } from "@/server/contexts/research-fund/presentation/loaders/load-document-masking";
import { buildCreateScanBatchUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

/**
 * ブラウザがストレージに置いた書類（prepareDocumentUploads で発行したキー）を登録し、
 * バッチと queued ジョブを作る。ファイル本体は Vercel の関数のリクエストボディ上限（4.5MB）を
 * 超えうるので、この action にはキーと元ファイル名だけを載せる（#1824）。
 */
export async function createScanBatch(
  politicianId: string,
  bookId: string,
  uploads: DocumentUpload[],
) {
  const user = await requireResearchFundWriter(politicianId);
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  if (!Array.isArray(uploads) || uploads.length === 0)
    return { success: false as const, error: "書類を1枚以上選んでください" };
  if (uploads.length > SCAN_BATCH_MAX_DOCUMENTS)
    return {
      success: false as const,
      error: `1回にアップロードできるのは${SCAN_BATCH_MAX_DOCUMENTS}枚までです`,
    };
  try {
    const documents = uploads.map((upload) => ({
      uploadKey: String(upload?.uploadKey),
      originalFilename: String(upload?.originalFilename),
    }));
    const result = await buildCreateScanBatchUsecase().execute({
      politicianId,
      bookId,
      userId: user.id,
      documents,
    });
    if (result.status === "invalid")
      return { success: false as const, error: result.errors[0].message };
    // 登録した書類の公開用の版を、画面を開いていなくても作り始める（#1812）
    await notifyDocumentMasking();
    revalidatePath("/(auth)", "layout");
    return { success: true as const, batchId: result.value.batchId, count: documents.length };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof ScanBatchError
          ? error.message
          : "書類のアップロードに失敗しました。時間をおいて再度お試しください",
    };
  }
}
