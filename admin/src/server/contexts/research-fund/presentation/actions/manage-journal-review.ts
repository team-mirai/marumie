"use server";
import "server-only";
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
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";

type Mutation =
  | { type: "create"; input: JournalEdit }
  | { type: "save"; id: string; updatedAt: string; input: JournalEdit; approve: boolean }
  | { type: "discard"; id: string; updatedAt: string }
  | { type: "approve-many"; targets: readonly { id: string; updatedAt: string }[] }
  | { type: "discard-many"; targets: readonly { id: string; updatedAt: string }[] }
  | { type: "revert-many-to-draft"; targets: readonly { id: string; updatedAt: string }[] }
  | { type: "unpublish"; id: string; updatedAt: string }
  | { type: "revert-to-draft"; id: string; updatedAt: string }
  // 立替情報は事務所内の管理情報なので、公開中の仕訳でも変更でき、公開ページのキャッシュも無効化しない。
  | {
      type: "set-advanced-by";
      targets: readonly { id: string; updatedAt: string }[];
      advancedBy: string;
    }
  | {
      type: "settle-many";
      targets: readonly { id: string; updatedAt: string }[];
      settledAt: string;
    }
  | { type: "unsettle-many"; targets: readonly { id: string; updatedAt: string }[] };
export async function mutateJournalReview(
  politicianId: string,
  bookId: string,
  mutation: Mutation,
) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const usecase = new ManageJournalReviewUsecase(
      new PrismaJournalReviewRepository(prisma),
      new WebappCacheInvalidator(),
    );
    let id: string | undefined;
    let approved: { approved: number; skipped: number } | undefined;
    let discarded: number | undefined;
    let reverted: number | undefined;
    let cacheWarning: string | null | undefined;
    let advance: { updated: number; advancedBy: string | null } | undefined;
    let settlement: { settled: number; settledAt: string } | undefined;
    let unsettled: number | undefined;
    if (mutation.type === "create") id = await usecase.create(bookId, mutation.input, user.id);
    else if (mutation.type === "save")
      await usecase.save(bookId, mutation.id, mutation.updatedAt, mutation.input, mutation.approve);
    else if (mutation.type === "discard")
      await usecase.discard(bookId, mutation.id, mutation.updatedAt);
    else if (mutation.type === "approve-many")
      approved = await usecase.approveMany(bookId, mutation.targets);
    else if (mutation.type === "discard-many")
      ({ discarded } = await usecase.discardMany(bookId, mutation.targets));
    else if (mutation.type === "revert-many-to-draft")
      ({ reverted } = await usecase.revertManyToDraft(bookId, mutation.targets));
    else if (mutation.type === "unpublish")
      ({ cacheWarning } = await usecase.unpublish(bookId, mutation.id, mutation.updatedAt));
    else if (mutation.type === "revert-to-draft")
      await usecase.revertToDraft(bookId, mutation.id, mutation.updatedAt);
    else if (mutation.type === "set-advanced-by")
      advance = await usecase.setAdvancedBy(bookId, mutation.targets, mutation.advancedBy);
    else if (mutation.type === "settle-many")
      settlement = await usecase.settleMany(bookId, mutation.targets, mutation.settledAt);
    else if (mutation.type === "unsettle-many")
      ({ unsettled } = await usecase.unsettleMany(bookId, mutation.targets));
    else throw new JournalReviewError("操作が不正です");
    revalidatePath("/(auth)", "layout");
    return {
      success: true as const,
      id,
      approved,
      discarded,
      reverted,
      cacheWarning,
      advance,
      settlement,
      unsettled,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof JournalReviewError ? error.message : "仕訳の保存に失敗しました",
    };
  }
}
