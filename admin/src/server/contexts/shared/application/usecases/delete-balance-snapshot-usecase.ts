import "server-only";

import type { IBalanceSnapshotRepository } from "@/server/contexts/shared/domain/repositories/balance-snapshot-repository.interface";

export class DeleteBalanceSnapshotUsecase {
  constructor(private repository: IBalanceSnapshotRepository) {}

  async execute(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error("Balance snapshot ID is required");
      }

      await this.repository.delete(id);
    } catch (error) {
      throw new Error(
        `Failed to delete balance snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
