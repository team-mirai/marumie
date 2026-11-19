"use server";

import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { PreviewResearchFundSyncImportUsecase } from "@/server/contexts/research-fund/application/usecases/preview-research-fund-sync-import-usecase";
import type { ResearchFundSyncImportPlan } from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import { PrismaResearchFundSyncImportRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund-sync-import.repository";
import { toSyncImportErrorMessage } from "@/server/contexts/shared/presentation/actions/sync-import-error-message";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { buildSyncImportFileStorage } from "@/server/contexts/shared/infrastructure/storage/build-sync-import-file-storage";
import { readSyncImportEnvironment } from "@/server/contexts/shared/presentation/loaders/read-sync-import-environment";

export type PreviewResearchFundSyncImportResponse =
  | { ok: true; plan: ResearchFundSyncImportPlan }
  | { ok: false; error: string };

/**
 * ストレージに置かれた調研費の同期用 JSON を読み、実行したら何が起きるか（dry-run）だけを返す。DB は変更しない。
 */
export async function previewResearchFundSyncImport(data: {
  storageKey: string;
}): Promise<PreviewResearchFundSyncImportResponse> {
  await requireRole("admin");

  try {
    const usecase = new PreviewResearchFundSyncImportUsecase(
      new PrismaResearchFundSyncImportRepository(prisma),
      buildSyncImportFileStorage(),
    );

    const plan = await usecase.execute({
      storageKey: data.storageKey,
      environment: readSyncImportEnvironment(),
    });

    return { ok: true, plan };
  } catch (error) {
    return {
      ok: false,
      error: toSyncImportErrorMessage(error, "Preview research fund sync import error"),
    };
  }
}
