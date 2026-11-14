import "server-only";

import { prisma } from "@/server/contexts/public-finance/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/public-finance/infrastructure/repositories/prisma-political-organization.repository";
import { SupabaseOrganizationPhotoStorage } from "@/server/contexts/public-finance/infrastructure/storage/supabase-organization-photo-storage";
import { GetOrganizationPhotoUrlUsecase } from "@/server/contexts/public-finance/application/usecases/get-organization-photo-url-usecase";

/**
 * 政治団体の代表者の顔写真の署名URL。署名URLは短時間で失効するのでキャッシュしない。
 * ストレージが未設定の環境では null を返す。
 */
export async function loadOrganizationPhotoUrl(slug: string): Promise<string | null> {
  const storage = SupabaseOrganizationPhotoStorage.fromEnv();
  if (!storage) return null;
  const usecase = new GetOrganizationPhotoUrlUsecase(
    new PrismaPoliticalOrganizationRepository(prisma),
    storage,
  );
  return await usecase.execute(slug);
}
