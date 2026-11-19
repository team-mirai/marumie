import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { ExportSubmissionLedgerCsvUsecase } from "@/server/contexts/research-fund/application/usecases/export-submission-ledger-csv-usecase";
import { GetReceiptPrintManifestUsecase } from "@/server/contexts/research-fund/application/usecases/get-receipt-print-manifest-usecase";
import { GetSubmissionLedgerUsecase } from "@/server/contexts/research-fund/application/usecases/get-submission-ledger-usecase";
import type { ReceiptPrintScope } from "@/server/contexts/research-fund/domain/models/receipt-print";
import type { ParliamentHouse } from "@/server/contexts/research-fund/domain/models/submission-ledger";
import { PrismaSubmissionLedgerRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-submission-ledger.repository";
import { buildDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/build-document-storage";
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

/** 議員課提出用の CSV。選択中の帳簿でなければ null（別の議員の帳簿は出さない） */
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

/** 署名付き URL の有効期限（秒）。数百件の書類をブラウザが順に取得し終えるまで切れない長さにする */
const RECEIPT_PRINT_URL_EXPIRES_IN = 3600;

/** 領収書の印刷用 PDF に入れる書類の一覧。選択中の帳簿でなければ null（別の議員の書類は出さない） */
export async function loadReceiptPrintManifest(
  politicianId: string,
  bookId: string,
  scope: ReceiptPrintScope,
) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) return null;
  return new GetReceiptPrintManifestUsecase(
    new PrismaSubmissionLedgerRepository(prisma),
    buildDocumentStorage(),
  ).execute(target.bookId, scope, RECEIPT_PRINT_URL_EXPIRES_IN);
}
