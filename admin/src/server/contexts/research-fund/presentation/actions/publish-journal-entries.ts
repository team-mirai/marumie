"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { PublicationError } from "@/server/contexts/research-fund/domain/models/publication";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { publishJournalEntriesUsecase } from "@/server/contexts/research-fund/presentation/loaders/load-publication";

export async function publishJournalEntries(
  politicianId: string,
  bookId: string,
  ids: readonly string[],
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await publishJournalEntriesUsecase().publish(bookId, ids);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof PublicationError ? error.message : "仕訳の公開に失敗しました",
    };
  }
}
