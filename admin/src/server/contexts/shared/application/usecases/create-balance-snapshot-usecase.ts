import "server-only";

import { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
import type {
  CreateBalanceSnapshotInput,
  IBalanceSnapshotRepository,
} from "@/server/contexts/shared/domain/repositories/balance-snapshot-repository.interface";

export class CreateBalanceSnapshotUsecase {
  constructor(private repository: IBalanceSnapshotRepository) {}

  async execute(input: CreateBalanceSnapshotInput): Promise<BalanceSnapshot> {
    try {
      if (!input.political_organization_id) {
        throw new Error("Political organization ID is required");
      }

      if (!input.snapshot_date) {
        throw new Error("Snapshot date is required");
      }

      if (input.balance === undefined || input.balance === null) {
        throw new Error("Balance is required");
      }

      const dateError = BalanceSnapshot.validateSnapshotDate(input.snapshot_date);
      if (dateError) {
        throw new Error(dateError);
      }

      return await this.repository.create(input);
    } catch (error) {
      throw new Error(
        `Failed to create balance snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
