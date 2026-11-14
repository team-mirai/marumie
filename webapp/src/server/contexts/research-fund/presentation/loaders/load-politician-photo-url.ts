import "server-only";

import { GetPoliticianPhotoUrlUsecase } from "@/server/contexts/research-fund/application/usecases/get-politician-photo-url-usecase";
import { PrismaPoliticianPhotoRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-politician-photo.repository";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/research-fund/infrastructure/storage/supabase-politician-photo-storage";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { readResearchFundPreviewSecret } from "@/shared/research-fund/preview-token";

/**
 * 議員の顔写真の署名URL。署名URLは短時間で失効するのでキャッシュしない。
 * ストレージが未設定の環境（ローカルなど）では null を返し、画面は人型のアイコンになる。
 */
export async function loadPoliticianPhotoUrl(pathSlug: string): Promise<string | null> {
  const storage = SupabasePoliticianPhotoStorage.fromEnv();
  if (!storage) return null;
  const usecase = new GetPoliticianPhotoUrlUsecase(
    new PrismaPoliticianPhotoRepository(prisma),
    storage,
  );
  return await usecase.execute({ pathSlug, previewSecret: readResearchFundPreviewSecret() });
}
