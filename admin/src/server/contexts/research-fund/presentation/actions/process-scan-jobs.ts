"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { buildProcessScanJobsUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-scan";

/**
 * 待機中のジョブを少数だけ読み取り、下書き仕訳にする。
 * 画面は hasMore が true の間これを繰り返し呼ぶ（キュー基盤は使わない）。
 */
export async function processScanJobs(politicianId: string, bookId: string) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await buildProcessScanJobsUsecase().execute({ bookId, userId: user.id });
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch {
    return {
      success: false as const,
      error: "読み取りの実行に失敗しました。時間をおいて再度お試しください",
    };
  }
}
