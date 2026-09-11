import "server-only";
import { notFound } from "next/navigation";
import { ManagePromptUsecase } from "@/server/contexts/research-fund/application/usecases/manage-prompt-usecase";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadPrompts(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  // プロンプトは議員室（議員）ごと。年度帳簿をまたいで同じ版を使う
  const data = await new ManagePromptUsecase(new PrismaPromptRepository(prisma)).list(
    target.politicianId,
  );
  return { ...data, target };
}
