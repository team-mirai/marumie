import "server-only";

import {
  collectResearchFundSyncOrganizationSlugs,
  countImportingData,
  decideResearchFundSyncImport,
  type ResearchFundSyncImportDecision,
  type ResearchFundSyncImportPlan,
  type ResearchFundSyncImportPlanPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type {
  IResearchFundSyncImportRepository,
  ResearchFundSyncTargetPolitician,
} from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
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

    const [existing, existingOrganizationSlugs] = await Promise.all([
      this.repository.findPoliticiansBySlugs(
        file.politicians.map((politician) => politician.profile.slug),
      ),
      this.repository.findExistingOrganizationSlugs(collectResearchFundSyncOrganizationSlugs(file)),
    ]);
    const decisions = decideResearchFundSyncImport(
      file,
      new Map(existing.map((politician) => [politician.slug, politician])),
      new Set(existingOrganizationSlugs),
    );

    const politicians: ResearchFundSyncImportPlanPolitician[] = [];
    for (const decision of decisions) {
      politicians.push(await this.planPolitician(decision));
    }

    return {
      exportedAt: file.meta.exportedAt,
      sourceEnvironment: file.meta.sourceEnvironment,
      latestMigrationName: file.meta.latestMigrationName,
      politicians,
    };
  }

  private async planPolitician(
    decision: ResearchFundSyncImportDecision<ResearchFundSyncTargetPolitician>,
  ): Promise<ResearchFundSyncImportPlanPolitician> {
    const { politician } = decision;
    const { slug } = politician.profile;
    const importing = countImportingData(politician);

    if (decision.mode === "replace") {
      return {
        mode: "replace",
        slug,
        name: decision.target.name,
        importing,
        deleting: await this.repository.countPoliticianData(decision.target.id),
      };
    }

    return {
      mode: "create",
      slug,
      name: politician.profile.name,
      importing,
      creatingMembershipCount: decision.memberships.length,
      skippedOrganizationSlugs: decision.skippedOrganizationSlugs,
    };
  }
}
