import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ManageScanUsecase } from "@/server/contexts/research-fund/application/usecases/manage-scan-usecase";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { PrismaScanRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-scan.repository";
import { SupabaseDocumentStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-document-storage";
import { researchFundDocumentBucket } from "@/server/contexts/research-fund/infrastructure/storage/document-bucket";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

export function buildScanUsecase(): ManageScanUsecase {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("領収書ストレージが未設定です");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return new ManageScanUsecase(
    new PrismaScanRepository(prisma),
    new PrismaPromptRepository(prisma),
    new SupabaseDocumentStorage(client, researchFundDocumentBucket()),
    // 読み取りの実行は #1365。ここでは作成時点のモデル名をジョブに記録するだけ
    process.env.RESEARCH_FUND_EXTRACTION_MODEL?.trim() || "claude-sonnet-5",
  );
}

export async function loadScan(politicianId: string, bookId: string) {
  const target = await requireJournalTarget(politicianId, bookId);
  if (!target) notFound();
  const data = await buildScanUsecase().list(target.politicianId, bookId);
  return { ...data, target };
}
