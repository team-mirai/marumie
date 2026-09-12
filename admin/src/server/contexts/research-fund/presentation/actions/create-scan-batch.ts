"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import {
  ScanBatchError,
  SCAN_BATCH_MAX_DOCUMENTS,
} from "@/server/contexts/research-fund/domain/models/scan-batch";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildScanUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

/**
 * 書類をアップロードしてバッチと queued ジョブを作る。
 * File はサーバーアクションの境界を越えられるが、Uint8Array に読み出してから usecase に渡す。
 */
export async function createScanBatch(politicianId: string, bookId: string, formData: FormData) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  const files = formData
    .getAll("documents")
    .filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) return { success: false as const, error: "書類を1枚以上選んでください" };
  if (files.length > SCAN_BATCH_MAX_DOCUMENTS)
    return {
      success: false as const,
      error: `1回にアップロードできるのは${SCAN_BATCH_MAX_DOCUMENTS}枚までです`,
    };
  try {
    const documents = await Promise.all(
      files.map(async (file) => ({
        bytes: new Uint8Array(await file.arrayBuffer()),
        mime: file.type,
        originalFilename: file.name,
      })),
    );
    const result = await buildScanUsecase().createBatch({
      politicianId,
      bookId,
      userId: user.id,
      documents,
    });
    if (result.status === "invalid")
      return { success: false as const, error: result.errors[0].message };
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
