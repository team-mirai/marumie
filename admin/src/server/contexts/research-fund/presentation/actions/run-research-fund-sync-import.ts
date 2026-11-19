"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { ImportResearchFundSyncUsecase } from "@/server/contexts/research-fund/application/usecases/import-research-fund-sync-usecase";
import type { ResearchFundSyncImportResult } from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import { PrismaResearchFundSyncImportRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund-sync-import.repository";
import { toSyncImportErrorMessage } from "@/server/contexts/shared/presentation/actions/sync-import-error-message";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { WebappCacheInvalidator } from "@/server/contexts/shared/infrastructure/services/webapp-cache-invalidator";
import { buildSyncImportFileStorage } from "@/server/contexts/shared/infrastructure/storage/build-sync-import-file-storage";
import { readSyncImportEnvironment } from "@/server/contexts/shared/presentation/loaders/read-sync-import-environment";

export type RunResearchFundSyncImportResponse =
  | { ok: true; result: ResearchFundSyncImportResult }
  | { ok: false; error: string };

/**
 * ストレージに置かれた調研費の同期用 JSON を取り込み、ファイルに入っている議員室の調研費データを置き換える。
 * 取り返しがつかない操作なので、画面で入力された議員 slug がファイルと一致するときだけ実行する。
 */
export async function runResearchFundSyncImport(data: {
  storageKey: string;
  confirmation: string;
}): Promise<RunResearchFundSyncImportResponse> {
  await requireRole("admin");

  try {
    const usecase = new ImportResearchFundSyncUsecase(
      new PrismaResearchFundSyncImportRepository(prisma),
      new WebappCacheInvalidator(),
      buildSyncImportFileStorage(),
    );

    const result = await usecase.execute({
      storageKey: data.storageKey,
      confirmation: data.confirmation,
      environment: readSyncImportEnvironment(),
    });

    // ここまで来れば DB の置き換えは確定している。admin の画面（議員一覧・帳簿・仕訳など）の
    // 再検証に失敗しても、取り込みを失敗扱いにはしない（再実行で成功済みの置換をもう一度走らせない）。
    try {
      revalidatePath("/(auth)", "layout");
    } catch (error) {
      console.error("Run research fund sync import revalidation error:", error);
    }

    return { ok: true, result };
  } catch (error) {
    return {
      ok: false,
      error: toSyncImportErrorMessage(error, "Run research fund sync import error"),
    };
  }
}
