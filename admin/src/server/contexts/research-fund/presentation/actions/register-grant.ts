"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-grants-usecase";
import { GrantRegistrationError } from "@/server/contexts/research-fund/domain/models/grant-registration";
import { PrismaGrantRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-grant.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function registerGrant(politicianId: string, bookId: string, month: string) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    await new ManageGrantsUsecase(new PrismaGrantRepository(prisma)).register(
      bookId,
      month,
      user.id,
    );
    revalidatePath("/(auth)", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof GrantRegistrationError ? error.message : "支給の登録に失敗しました",
    };
  }
}
