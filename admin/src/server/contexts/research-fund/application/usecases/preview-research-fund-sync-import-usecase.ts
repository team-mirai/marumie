import "server-only";

import {
  collectMembershipOrganizationSlugs,
  countImportingData,
  type ResearchFundSyncImportPlan,
  type ResearchFundSyncImportPlanPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type { ResearchFundSyncExport } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type { IResearchFundSyncImportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import { loadResearchFundSyncImportFile } from "@/server/contexts/research-fund/application/services/load-research-fund-sync-import-file";
import { isSyncImportStorageKey } from "@/server/contexts/shared/domain/models/sync-import-file";
import type { ISyncImportFileStorage } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";
import {
  assertSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/shared/domain/services/sync-import-availability";

interface PreviewResearchFundSyncImportInput {
  /** ブラウザがストレージに置いた同期用 JSON のキー（PrepareSyncImportUploadUsecase が発行）。 */
  storageKey: string;
  environment: SyncImportEnvironment;
}

/**
 * 取り込みを実行せず、議員室ごとに何が起きるか（dry-run）だけを組み立てる。
 * 置き換えは取り返しがつかないので、実行前に必ずこれを見せる。
 */
export class PreviewResearchFundSyncImportUsecase {
  constructor(
    private readonly repository: IResearchFundSyncImportRepository,
    private readonly fileStorage: ISyncImportFileStorage,
  ) {}

  async execute(input: PreviewResearchFundSyncImportInput): Promise<ResearchFundSyncImportPlan> {
    assertSyncImportAllowed(input.environment);

    try {
      return await this.buildPlan(input.storageKey);
    } catch (error) {
      // 確認で弾かれたファイルは画面側でもキーを捨てるので、取り込みに使われることはない。
      // ストレージに残さないよう消しておく（消せなくても元のエラーを優先して返す）。
      if (isSyncImportStorageKey(input.storageKey)) {
        await this.fileStorage.remove(input.storageKey).catch((removeError: unknown) => {
          console.error("Research fund sync import file cleanup error:", removeError);
        });
      }
      throw error;
    }
  }

  private async buildPlan(storageKey: string): Promise<ResearchFundSyncImportPlan> {
    const file = await loadResearchFundSyncImportFile(
      this.repository,
      this.fileStorage,
      storageKey,
    );

    const existing = await this.repository.findPoliticiansBySlugs(
      file.politicians.map((politician) => politician.profile.slug),
    );
    const existingBySlug = new Map(existing.map((politician) => [politician.slug, politician]));
    const existingOrganizationSlugs = new Set(
      await this.repository.findExistingOrganizationSlugs([
        ...new Set(file.politicians.flatMap(collectMembershipOrganizationSlugs)),
      ]),
    );

    const politicians: ResearchFundSyncImportPlanPolitician[] = [];
    for (const politician of file.politicians) {
      politicians.push(
        await this.planPolitician(
          politician,
          existingBySlug.get(politician.profile.slug),
          existingOrganizationSlugs,
        ),
      );
    }

    return {
      exportedAt: file.meta.exportedAt,
      sourceEnvironment: file.meta.sourceEnvironment,
      latestMigrationName: file.meta.latestMigrationName,
      politicians,
    };
  }

  private async planPolitician(
    politician: ResearchFundSyncExport["politicians"][number],
    target: { id: string; name: string } | undefined,
    existingOrganizationSlugs: Set<string>,
  ): Promise<ResearchFundSyncImportPlanPolitician> {
    const { slug } = politician.profile;
    const importing = countImportingData(politician);

    if (target) {
      return {
        mode: "replace",
        slug,
        name: target.name,
        importing,
        deleting: await this.repository.countPoliticianData(target.id),
      };
    }

    return {
      mode: "create",
      slug,
      name: politician.profile.name,
      importing,
      creatingMembershipCount: politician.memberships.filter((membership) =>
        existingOrganizationSlugs.has(membership.organizationSlug),
      ).length,
      skippedOrganizationSlugs: collectMembershipOrganizationSlugs(politician).filter(
        (organizationSlug) => !existingOrganizationSlugs.has(organizationSlug),
      ),
    };
  }
}
