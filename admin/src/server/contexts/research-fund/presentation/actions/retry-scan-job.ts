"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildProcessScanJobsUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

/** 失敗したジョブを待機中に戻す。実行そのものは processScanJobs が拾う */
export async function retryScanJob(politicianId: string, bookId: string, jobId: string) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const requeued = await buildProcessScanJobsUsecase().retry({ bookId, jobId });
    if (!requeued)
      return {
        success: false as const,
        error: "このジョブは再実行できません。画面を再読み込みしてください",
      };
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "再実行に失敗しました。時間をおいて再度お試しください",
    };
  }
}
