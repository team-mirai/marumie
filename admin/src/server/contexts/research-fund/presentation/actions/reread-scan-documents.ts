"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ScanBatchError } from "@/server/contexts/research-fund/domain/models/scan-batch";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildCreateRereadBatchUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

/**
 * 選んだ下書きが紐づく書類を、指示つきで読み直す queued ジョブにする。
 * 実行（LLM 呼び出しと下書きの置き換え）はスキャン画面の processScanJobs が拾う。
 */
export async function rereadScanDocuments(
  politicianId: string,
  bookId: string,
  input: { entryIds: string[]; instruction: string },
) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await buildCreateRereadBatchUsecase().execute({
      politicianId,
      bookId,
      userId: user.id,
      entryIds: input.entryIds,
      instruction: input.instruction,
    });
    if (result.status === "invalid")
      return { success: false as const, error: result.errors[0].message };
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result.value };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof ScanBatchError
          ? error.message
          : "読み直しの依頼に失敗しました。時間をおいて再度お試しください",
    };
  }
}
