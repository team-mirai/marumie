import "server-only";
import { notFound } from "next/navigation";
import { ManageExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-expenditure-groups-usecase";
import { PrismaExpenditureGroupRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-expenditure-group.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

function usecase() {
  return new ManageExpenditureGroupsUsecase(new PrismaExpenditureGroupRepository(prisma));
}

export async function loadExpenditureGroups(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  return { ...(await usecase().list(bookId)), target };
}

/** groupId が null なら新規フォーム。見つからない支出群は 404 にする */
export async function loadExpenditureGroupForm(
  politicianId: string,
  bookId: string,
  groupId: string | null,
) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  try {
    return { ...(await usecase().form(bookId, groupId)), target };
  } catch {
    notFound();
  }
}
