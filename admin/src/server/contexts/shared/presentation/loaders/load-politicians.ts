import "server-only";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { ListPoliticiansUsecase } from "@/server/contexts/shared/application/usecases/list-politicians-usecase";
import { GetPoliticianPhotoUrlUsecase } from "@/server/contexts/shared/application/usecases/get-politician-photo-url-usecase";
import { GetPoliticianUsecase } from "@/server/contexts/shared/application/usecases/get-politician-usecase";
import { buildResearchFundPageUrl } from "@/server/contexts/shared/domain/services/research-fund-page-url";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";
import { readResearchFundPreviewSecret } from "@/shared/research-fund/preview-token";

export async function loadPoliticians() {
  await requireRole("research_fund");
  return new ListPoliticiansUsecase(new PrismaPoliticianRepository(prisma)).execute();
}

/** 議員一覧に、調研費ページの URL（非公開の議員はプレビュー URL）を添える。 */
export async function loadPoliticiansWithResearchFundPageUrl() {
  const politicians = await loadPoliticians();
  const webappUrl = process.env.WEBAPP_URL || "http://localhost:3000";
  const previewSecret = readResearchFundPreviewSecret();
  return politicians.map((politician) => ({
    ...politician,
    researchFundPageUrl: buildResearchFundPageUrl({
      webappUrl,
      previewSecret,
      slug: politician.slug,
      isResearchFundPublic: politician.isResearchFundPublic,
    }),
  }));
}

export async function loadPolitician(id: string) {
  await requireRole("research_fund");
  return new GetPoliticianUsecase(new PrismaPoliticianRepository(prisma)).execute(id);
}

/** 編集画面のプレビューに出す顔写真の一時的な URL。写真が無い・取得できないときは null */
export async function loadPoliticianPhotoUrl(photoPath: string | null) {
  await requireRole("research_fund");
  return new GetPoliticianPhotoUrlUsecase(() => SupabasePoliticianPhotoStorage.fromEnv()).execute(
    photoPath,
  );
}
