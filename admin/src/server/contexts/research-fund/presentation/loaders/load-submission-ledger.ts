import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { ExportSubmissionLedgerCsvUsecase } from "@/server/contexts/research-fund/application/usecases/export-submission-ledger-csv-usecase";
import { GetSubmissionLedgerUsecase } from "@/server/contexts/research-fund/application/usecases/get-submission-ledger-usecase";
import type { ParliamentHouse } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import { PrismaSubmissionLedgerRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-submission-ledger.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";

/** 議員課提出用の帳簿の画面。選択中の帳簿でなければ 404 */
export async function loadSubmissionLedger(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const ledger = await new GetSubmissionLedgerUsecase(
    new PrismaSubmissionLedgerRepository(prisma),
  ).execute(target.bookId);
  if (!ledger) notFound();
  return { ...ledger, target };
}

/** 議員課提出用の CSV。選択中の帳簿でなければ null（別の議員・テナントの帳簿は出さない） */
export async function loadSubmissionLedgerCsv(
  politicianId: string,
  bookId: string,
  house: ParliamentHouse,
) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return null;
  return new ExportSubmissionLedgerCsvUsecase(new PrismaSubmissionLedgerRepository(prisma)).execute(
    target.bookId,
    house,
  );
}
