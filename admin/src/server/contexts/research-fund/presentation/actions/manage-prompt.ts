"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { RollbackPromptUsecase } from "@/server/contexts/research-fund/application/usecases/rollback-prompt-usecase";
import { SavePromptUsecase } from "@/server/contexts/research-fund/application/usecases/save-prompt-usecase";
import { PromptError } from "@/server/contexts/research-fund/domain/models/prompt";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

type Mutation = { type: "save"; body: string } | { type: "rollback"; version: number };

export async function mutatePrompt(politicianId: string, bookId: string, mutation: Mutation) {
  const user = await requireAuth();
  if (!(await requireJournalTarget(politicianId, bookId)))
    return { success: false as const, error: "現在の対象帳簿を選択し直してください" };
  try {
    const repository = new PrismaPromptRepository(prisma);
    let version: number | undefined;
    if (mutation.type === "save")
      version = await new SavePromptUsecase(repository).execute(
        politicianId,
        mutation.body,
        user.id,
      );
    else if (mutation.type === "rollback")
      await new RollbackPromptUsecase(repository).execute(politicianId, mutation.version);
    else throw new PromptError("操作が不正です");
    revalidatePath("/(auth)", "layout");
    return { success: true as const, version };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof PromptError ? error.message : "読み取りプロンプトの保存に失敗しました",
    };
  }
}
