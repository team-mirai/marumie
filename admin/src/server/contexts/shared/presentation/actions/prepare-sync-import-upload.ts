"use server";

import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { PrepareSyncImportUploadUsecase } from "@/server/contexts/shared/application/usecases/prepare-sync-import-upload-usecase";
import type { SyncImportUploadTarget } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";
import { buildSyncImportFileStorage } from "@/server/contexts/shared/infrastructure/storage/build-sync-import-file-storage";
import { toSyncImportErrorMessage } from "@/server/contexts/shared/presentation/actions/sync-import-error-message";
import { readSyncImportEnvironment } from "@/server/contexts/shared/presentation/loaders/read-sync-import-environment";

export type PrepareSyncImportUploadResponse =
  | { ok: true; target: SyncImportUploadTarget }
  | { ok: false; error: string };

/**
 * 同期用 JSON をブラウザからストレージへ直接置くための署名付き URL を発行する。
 * ファイル本体は Vercel の関数のリクエストボディ上限（4.5MB）を超えるので、この action には載せない。
 */
export async function prepareSyncImportUpload(data: {
  fileSize: number;
}): Promise<PrepareSyncImportUploadResponse> {
  await requireRole("admin");

  try {
    const usecase = new PrepareSyncImportUploadUsecase(buildSyncImportFileStorage());
    const target = await usecase.execute({
      fileSize: data.fileSize,
      environment: readSyncImportEnvironment(),
    });
    return { ok: true, target };
  } catch (error) {
    return {
      ok: false,
      error: toSyncImportErrorMessage(error, "Prepare sync import upload error"),
    };
  }
}
