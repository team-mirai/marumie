import "server-only";

import {
  collectDistinctCounterpartsAndDonors,
  type OrganizationSyncImportPlan,
  SyncImportOrganizationNotFoundError,
  toCounterpartKey,
  toDonorKey,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type { IOrganizationSyncImportRepository } from "@/server/contexts/data-import/domain/repositories/organization-sync-import-repository.interface";
import { parseOrganizationSyncImportFile } from "@/server/contexts/data-import/domain/services/organization-sync-import-parser";
import {
  assertSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/data-import/domain/services/sync-import-availability";

interface PreviewOrganizationSyncImportInput {
  fileText: string;
  environment: SyncImportEnvironment;
}

/**
 * 取り込みを実行せず、何が起きるか（dry-run）だけを組み立てる。
 * 置き換えは取り返しがつかないので、実行前に必ずこれを見せる。
 */
export class PreviewOrganizationSyncImportUsecase {
  constructor(private readonly repository: IOrganizationSyncImportRepository) {}

  async execute(input: PreviewOrganizationSyncImportInput): Promise<OrganizationSyncImportPlan> {
    assertSyncImportAllowed(input.environment);

    const file = parseOrganizationSyncImportFile(input.fileText);

    const organization = await this.repository.findOrganizationBySlug(file.meta.organizationSlug);
    if (!organization) {
      throw new SyncImportOrganizationNotFoundError(
        `ファイルの政治団体 slug "${file.meta.organizationSlug}" に一致する政治団体がこの環境にありません`,
      );
    }

    const { counterparts, donors } = collectDistinctCounterpartsAndDonors(file);
    const counterpartKeys = counterparts.map(toCounterpartKey);
    const donorKeys = donors.map(toDonorKey);

    const [
      deletingTransactionCount,
      deletingBalanceSnapshotCount,
      existingCounterpartKeys,
      existingDonorKeys,
    ] = await Promise.all([
      this.repository.countTransactions(organization.id),
      this.repository.countBalanceSnapshots(organization.id),
      this.repository.findExistingCounterpartKeys(counterpartKeys),
      this.repository.findExistingDonorKeys(donorKeys),
    ]);

    return {
      organizationSlug: file.meta.organizationSlug,
      organizationDisplayName: organization.displayName,
      exportedAt: file.meta.exportedAt,
      sourceEnvironment: file.meta.sourceEnvironment,
      latestMigrationName: file.meta.latestMigrationName,
      deletingTransactionCount,
      importingTransactionCount: file.transactions.length,
      deletingBalanceSnapshotCount,
      importingBalanceSnapshotCount: file.balanceSnapshots.length,
      newCounterpartCount: counterpartKeys.length - existingCounterpartKeys.length,
      newDonorCount: donorKeys.length - existingDonorKeys.length,
      upsertingReportProfileCount: file.organizationReportProfiles.length,
    };
  }
}
