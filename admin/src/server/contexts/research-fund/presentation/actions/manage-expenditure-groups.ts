"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-expenditure-groups-usecase";
import {
  ExpenditureGroupError,
  type ExpenditureGroupEdit,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";
import { PrismaExpenditureGroupRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-expenditure-group.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

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
    await new ManageExpenditureGroupsUsecase(
      new PrismaExpenditureGroupRepository(prisma),
    ).savePolicyComment(bookId, policyComment);
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
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
    const id = await new ManageExpenditureGroupsUsecase(
      new PrismaExpenditureGroupRepository(prisma),
    ).save(bookId, groupId, input);
    revalidatePath("/(auth)", "layout");
    return { success: true as const, id };
  } catch (error) {
    return failure(error, "支出群の保存に失敗しました");
  }
}
