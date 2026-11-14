import "server-only";

import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaPoliticalOrganizationRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-political-organization.repository";
import { GetPoliticalOrganizationUsecase } from "@/server/contexts/shared/application/usecases/get-political-organization-usecase";
import { GetPoliticianPhotoUrlUsecase } from "@/server/contexts/shared/application/usecases/get-politician-photo-url-usecase";
import { SupabasePoliticianPhotoStorage } from "@/server/contexts/shared/infrastructure/storage/supabase-politician-photo-storage";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import type { PoliticalOrganization } from "@/shared/models/political-organization";

export async function loadPoliticalOrganizationData(id: string): Promise<PoliticalOrganization> {
  try {
    const organizationId = parseInt(id, 10);

    if (Number.isNaN(organizationId)) {
      throw new Error("Invalid organization ID");
    }

    const repository = new PrismaPoliticalOrganizationRepository(prisma);
    const usecase = new GetPoliticalOrganizationUsecase(repository);
    return await usecase.execute(BigInt(organizationId));
  } catch (error) {
    console.error("Error fetching political organization:", error);
    throw new Error(error instanceof Error ? error.message : "政治団体の取得に失敗しました");
  }
}

/** 編集画面のプレビューに出す代表者の顔写真の一時的な URL。写真が無い・取得できないときは null */
export async function loadPoliticalOrganizationPhotoUrl(photoPath: string | null) {
  await requireRole("political_fund");
  return new GetPoliticianPhotoUrlUsecase(() => SupabasePoliticianPhotoStorage.fromEnv()).execute(
    photoPath,
  );
}
