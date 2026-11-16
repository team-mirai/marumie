import "server-only";

import {
  type ResearchFundSyncExport,
  ResearchFundSyncExportNotFoundError,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type { IResearchFundSyncExportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";
import { buildResearchFundSyncExport } from "@/server/contexts/research-fund/domain/services/research-fund-sync-export-builder";
import type { IDatabaseMigrationRepository } from "@/server/contexts/shared/domain/repositories/database-migration-repository.interface";

interface ExportResearchFundSyncInput {
  politicianIds: string[];
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  exportedAt: Date;
}

/** 選んだ議員室の調研費データを、環境間同期用の構造に書き出す。 */
export class ExportResearchFundSyncUsecase {
  constructor(
    private readonly syncExportRepository: IResearchFundSyncExportRepository,
    private readonly migrationRepository: IDatabaseMigrationRepository,
  ) {}

  async execute(input: ExportResearchFundSyncInput): Promise<ResearchFundSyncExport> {
    const politicianIds = [...new Set(input.politicianIds)];
    const sources = await this.syncExportRepository.findSourcesByPoliticianIds(politicianIds);

    if (!sources) {
      throw new ResearchFundSyncExportNotFoundError(
        `Politician not found: ${politicianIds.join(", ")}`,
      );
    }

    const latestMigrationName = await this.migrationRepository.findLatestAppliedMigrationName();

    return buildResearchFundSyncExport({
      sources,
      exportedAt: input.exportedAt,
      sourceEnvironment: input.sourceEnvironment,
      latestMigrationName,
    });
  }
}
