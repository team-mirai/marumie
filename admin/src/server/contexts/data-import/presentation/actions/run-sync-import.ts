"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/server/contexts/auth/presentation/loaders/require-admin";
import { ImportOrganizationSyncUsecase } from "@/server/contexts/data-import/application/usecases/import-organization-sync-usecase";
import type { OrganizationSyncImportResult } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaOrganizationSyncImportRepository } from "@/server/contexts/data-import/infrastructure/repositories/prisma-organization-sync-import.repository";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { toSyncImportErrorMessage } from "@/server/contexts/data-import/presentation/actions/sync-import-error-message";
import { readSyncImportEnvironment } from "@/server/contexts/data-import/presentation/loaders/read-sync-import-environment";

export type RunSyncImportResponse =
  | { ok: true; result: OrganizationSyncImportResult }
  | { ok: false; error: string };

/**
 * 同期用 JSON を取り込み、政治団体 1 件分の政治資金データを置き換える。
 * 取り返しがつかない操作なので、画面で入力された slug がファイルと一致するときだけ実行する。
 */
export async function runSyncImport(data: {
  file: File;
  confirmationSlug: string;
}): Promise<RunSyncImportResponse> {
  await requireAdmin();

  try {
    if (!data.file) {
      return { ok: false, error: "ファイルが選択されていません" };
    }

    const usecase = new ImportOrganizationSyncUsecase(
      new PrismaOrganizationSyncImportRepository(prisma),
      new WebappCacheInvalidator(),
    );

    const result = await usecase.execute({
      fileText: await data.file.text(),
      confirmationSlug: data.confirmationSlug,
      environment: readSyncImportEnvironment(),
    });

    // ここまで来れば DB の置き換えは確定している。admin 側のデータキャッシュ無効化
    // （webapp のキャッシュ無効化は usecase が行う）に失敗しても、取り込みを失敗扱いにはしない。
    // 失敗扱いにすると管理者が再実行し、成功済みの置換をもう一度走らせてしまう。
    try {
      updateTag("transactions-data");
      updateTag("transactions-for-csv");
    } catch (error) {
      console.error("Run sync import cache invalidation error:", error);
    }

    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: toSyncImportErrorMessage(error, "Run sync import error") };
  }
}
