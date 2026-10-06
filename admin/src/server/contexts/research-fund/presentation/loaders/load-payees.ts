import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { ListPayeesUsecase } from "@/server/contexts/research-fund/application/usecases/list-payees-usecase";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

/** 支払先の一覧。選択中の帳簿の議員の支払先だけを返す */
export async function loadPayees(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const payees = await new ListPayeesUsecase(new PrismaPayeeRepository(prisma)).execute(
    target.politicianId,
  );
  return { payees, target };
}
