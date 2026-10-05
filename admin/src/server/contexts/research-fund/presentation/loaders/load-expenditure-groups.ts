import "server-only";
import { notFound } from "next/navigation";
import { GetExpenditureGroupFormUsecase } from "@/server/contexts/research-fund/application/usecases/get-expenditure-group-form-usecase";
import { ListExpenditureGroupsUsecase } from "@/server/contexts/research-fund/application/usecases/list-expenditure-groups-usecase";
import { ExpenditureGroupError } from "@/server/contexts/research-fund/domain/models/expenditure-group";
import { PrismaExpenditureGroupRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-expenditure-group.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

function repository() {
  return new PrismaExpenditureGroupRepository(prisma);
}

export async function loadExpenditureGroups(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  return { ...(await new ListExpenditureGroupsUsecase(repository()).execute(bookId)), target };
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
    return {
      ...(await new GetExpenditureGroupFormUsecase(repository()).execute(bookId, groupId)),
      target,
    };
  } catch (error) {
    // DB 障害やプログラムエラーを 404 に化けさせず、監視に届かせる。
    if (error instanceof ExpenditureGroupError) notFound();
    throw error;
  }
}
