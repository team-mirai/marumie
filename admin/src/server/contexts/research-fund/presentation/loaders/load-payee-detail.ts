import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { GetPayeeDetailUsecase } from "@/server/contexts/research-fund/application/usecases/get-payee-detail-usecase";
import { PrismaPayeeRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-payee.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

/** 支払先の詳細。選択中の帳簿の議員の支払先だけを返し、帳簿でその支払先に紐づいた仕訳を添える */
export async function loadPayeeDetail(politicianId: string, bookId: string, payeeId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const detail = await new GetPayeeDetailUsecase(new PrismaPayeeRepository(prisma)).execute(
    target.politicianId,
    target.bookId,
    payeeId,
  );
  if (!detail) notFound();
  return { ...detail, target };
}
