"use server";

import { requireAdmin } from "@/server/contexts/auth/presentation/loaders/require-admin";
import { PreviewOrganizationSyncImportUsecase } from "@/server/contexts/data-import/application/usecases/preview-organization-sync-import-usecase";
import type { OrganizationSyncImportPlan } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaOrganizationSyncImportRepository } from "@/server/contexts/data-import/infrastructure/repositories/prisma-organization-sync-import.repository";
import { buildSyncImportFileStorage } from "@/server/contexts/data-import/infrastructure/storage/build-sync-import-file-storage";
import { toSyncImportErrorMessage } from "@/server/contexts/data-import/presentation/actions/sync-import-error-message";
import { readSyncImportEnvironment } from "@/server/contexts/data-import/presentation/loaders/read-sync-import-environment";

export type PreviewSyncImportResponse =
  | { ok: true; plan: OrganizationSyncImportPlan }
  | { ok: false; error: string };

/**
 * ストレージに置かれた同期用 JSON を読み、実行したら何が起きるか（dry-run）だけを返す。DB は変更しない。
 */
export async function previewSyncImport(data: {
  storageKey: string;
}): Promise<PreviewSyncImportResponse> {
  await requireAdmin();

  try {
    const usecase = new PreviewOrganizationSyncImportUsecase(
      new PrismaOrganizationSyncImportRepository(prisma),
      buildSyncImportFileStorage(),
    );

    const plan = await usecase.execute({
      storageKey: data.storageKey,
      environment: readSyncImportEnvironment(),
    });

    return { ok: true, plan };
  } catch (error) {
    return { ok: false, error: toSyncImportErrorMessage(error, "Preview sync import error") };
  }
}
