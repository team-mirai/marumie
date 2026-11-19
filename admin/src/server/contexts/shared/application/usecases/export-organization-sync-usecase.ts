import "server-only";

import {
  type OrganizationSyncExport,
  OrganizationSyncExportNotFoundError,
} from "@/server/contexts/shared/domain/models/organization-sync-export";
import type { IDatabaseMigrationRepository } from "@/server/contexts/shared/domain/repositories/database-migration-repository.interface";
import type { IOrganizationSyncExportRepository } from "@/server/contexts/shared/domain/repositories/organization-sync-export-repository.interface";
import { buildOrganizationSyncExport } from "@/server/contexts/shared/domain/services/organization-sync-export-builder";

interface ExportOrganizationSyncInput {
  politicalOrganizationId: string;
  /** 書き出し元の環境識別（VERCEL_ENV 相当）。 */
  sourceEnvironment: string;
  exportedAt: Date;
}

/** 政治団体 1 件分のデータを、環境間同期用の構造に書き出す。 */
export class ExportOrganizationSyncUsecase {
  constructor(
    private readonly syncExportRepository: IOrganizationSyncExportRepository,
    private readonly migrationRepository: IDatabaseMigrationRepository,
  ) {}

  async execute(input: ExportOrganizationSyncInput): Promise<OrganizationSyncExport> {
    const source = await this.syncExportRepository.findSourceByOrganizationId(
      input.politicalOrganizationId,
    );

    if (!source) {
      throw new OrganizationSyncExportNotFoundError(
        `Political organization not found: ${input.politicalOrganizationId}`,
      );
    }

    const latestMigrationName = await this.migrationRepository.findLatestAppliedMigrationName();

    return buildOrganizationSyncExport({
      source,
      exportedAt: input.exportedAt,
      sourceEnvironment: input.sourceEnvironment,
      latestMigrationName,
    });
  }
}
