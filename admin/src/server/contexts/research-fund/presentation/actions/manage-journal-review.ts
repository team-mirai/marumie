"use server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { ManageJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/manage-journal-review-usecase";
import { PrismaJournalReviewRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-journal-review.repository";
import {
  JournalReviewError,
  type JournalEdit,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

type Mutation =
  | { type: "create"; input: JournalEdit }
  | { type: "save"; id: string; updatedAt: string; input: JournalEdit; approve: boolean }
  | { type: "discard"; id: string; updatedAt: string };
export async function mutateJournalReview(
  politicianId: string,
  bookId: string,
  mutation: Mutation,
) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const usecase = new ManageJournalReviewUsecase(new PrismaJournalReviewRepository(prisma));
    let id: string | undefined;
    if (mutation.type === "create") id = await usecase.create(bookId, mutation.input, user.id);
    else if (mutation.type === "save")
      await usecase.save(bookId, mutation.id, mutation.updatedAt, mutation.input, mutation.approve);
    else if (mutation.type === "discard")
      await usecase.discard(bookId, mutation.id, mutation.updatedAt);
    else throw new JournalReviewError("操作が不正です");
    revalidatePath("/(auth)", "layout");
    return { success: true as const, id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof JournalReviewError ? error.message : "仕訳の保存に失敗しました",
    };
  }
}
