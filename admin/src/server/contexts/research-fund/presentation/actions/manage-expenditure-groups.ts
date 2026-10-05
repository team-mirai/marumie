"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { DeleteExpenditureGroupUsecase } from "@/server/contexts/research-fund/application/usecases/delete-expenditure-group-usecase";
import { ReorderExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/reorder-expenditure-groups-usecase";
import { SaveExpenditureGroupUsecase } from "@/server/contexts/research-fund/application/usecases/save-expenditure-group-usecase";
import { SaveUsagePolicyUsecase } from "@/server/contexts/research-fund/application/usecases/save-usage-policy-usecase";
import {
  ExpenditureGroupError,
  type ExpenditureGroupEdit,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import { PrismaExpenditureGroupRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-expenditure-group.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";

function dependencies() {
  return [new PrismaExpenditureGroupRepository(prisma), new WebappCacheInvalidator()] as const;
}

function failure(error: unknown, fallback: string) {
  return {
    success: false as const,
    error: error instanceof ExpenditureGroupError ? error.message : fallback,
  };
}

export async function saveUsagePolicy(politicianId: string, bookId: string, policyComment: string) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const { cacheWarning } = await new SaveUsagePolicyUsecase(...dependencies()).execute(
      bookId,
      policyComment,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return failure(error, "活用方針の保存に失敗しました");
  }
}

export async function saveExpenditureGroup(
  politicianId: string,
  bookId: string,
  groupId: string | null,
  input: ExpenditureGroupEdit,
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const { id, cacheWarning } = await new SaveExpenditureGroupUsecase(...dependencies()).execute(
      bookId,
      groupId,
      input,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const, id, cacheWarning };
  } catch (error) {
    return failure(error, "支出群の保存に失敗しました");
  }
}

export async function deleteExpenditureGroup(
  politicianId: string,
  bookId: string,
  groupId: string,
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const { cacheWarning } = await new DeleteExpenditureGroupUsecase(...dependencies()).execute(
      bookId,
      groupId,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return failure(error, "支出群の削除に失敗しました");
  }
}

/** 一覧に出ている支出群の ID を、表示したい順に過不足なく渡す */
export async function reorderExpenditureGroups(
  politicianId: string,
  bookId: string,
  groupIds: string[],
) {
  await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const { cacheWarning } = await new ReorderExpenditureGroupsUsecase(...dependencies()).execute(
      bookId,
      groupIds,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const, cacheWarning };
  } catch (error) {
    return failure(error, "並べ替えに失敗しました");
  }
}
