import "server-only";

import type { BalanceSnapshot } from "@/server/contexts/shared/domain/models/balance-snapshot";
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

      // 未来日付のチェック
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 時刻をリセットして日付のみで比較
      const snapshotDate = new Date(input.snapshot_date);
      snapshotDate.setHours(0, 0, 0, 0);

      if (snapshotDate > today) {
        throw new Error("未来の日付は登録できません");
      }

      return await this.repository.create(input);
    } catch (error) {
      throw new Error(
        `Failed to create balance snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
