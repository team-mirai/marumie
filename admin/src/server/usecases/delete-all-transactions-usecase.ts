import type { ITransactionRepository } from "../repositories/interfaces/transaction-repository.interface";
import type { TransactionFilters } from "@/server/domain/types/transaction";

export interface DeleteAllTransactionsResult {
  deletedCount: number;
}

export class DeleteAllTransactionsUsecase {
  constructor(private repository: ITransactionRepository) {}

  async execute(organizationId?: string): Promise<DeleteAllTransactionsResult> {
    try {
      let filters: TransactionFilters | undefined;

      if (organizationId) {
        filters = {
          political_organization_ids: [organizationId],
        };
      }

      const deletedCount = await this.repository.deleteAll(filters);

      return {
        deletedCount,
      };
    } catch (error) {
      throw new Error(
        `Failed to delete transactions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
