"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { PublicationError } from "@/server/contexts/research-fund/domain/models/publication";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { PublishJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/publish-journal-entries-usecase";
import { PrismaPublicationRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-publication.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";

export async function publishJournalEntries(
  politicianId: string,
  bookId: string,
  ids: readonly string[],
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const result = await new PublishJournalEntriesUsecase(
      new PrismaPublicationRepository(prisma),
      new WebappCacheInvalidator(),
    ).execute(bookId, ids);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof PublicationError ? error.message : "仕訳の公開に失敗しました",
    };
  }
}
