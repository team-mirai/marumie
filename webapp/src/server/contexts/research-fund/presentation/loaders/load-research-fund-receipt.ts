import "server-only";

import { GetResearchFundReceiptUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-receipt-usecase";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";
import { SupabaseReceiptStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-receipt-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";

/**
 * 領収書の署名URL。署名URLは短時間で失効するのでキャッシュしない。
 * ストレージが未設定の環境（領収書を使わないローカルなど）では null を返す。
 */
export async function loadResearchFundReceiptUrl(entryId: string): Promise<string | null> {
  const storage = SupabaseReceiptStorage.fromEnv();
  if (!storage) return null;
  const usecase = new GetResearchFundReceiptUsecase(
    new PrismaResearchFundRepository(prisma),
    storage,
  );
  return await usecase.execute(entryId);
}
