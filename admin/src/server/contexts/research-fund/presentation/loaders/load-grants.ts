import "server-only";
import { notFound } from "next/navigation";
import { ManageGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-grants-usecase";
import { PrismaGrantRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-grant.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export async function loadGrants(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const data = await new ManageGrantsUsecase(new PrismaGrantRepository(prisma)).list(bookId);
  return { ...data, target };
}
