import "server-only";

import { BalanceSheet } from "@/server/contexts/public-finance/domain/models/balance-sheet";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { BalanceSheetData } from "@/types/balance-sheet";

export interface GetBalanceSheetParams {
  slugs: string[];
  financialYear: number;
}

export interface GetBalanceSheetResult {
  balanceSheetData: BalanceSheetData;
}

/**
 * 貸借対照表を取得するユースケース
 *
 * リポジトリから生データを取得し、
 * ドメインモデルで貸借対照表を生成する。
 */
export class GetBalanceSheetUsecase {
  constructor(
    private balanceSheetRepository: IBalanceSheetRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetBalanceSheetParams): Promise<GetBalanceSheetResult> {
    try {
      const organizations = await this.politicalOrganizationRepository.findBySlugs(params.slugs);

      if (organizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      const orgIds = organizations.map((org) => org.id);

      const [currentAssets, borrowingIncome, borrowingExpense, currentLiabilities] =
        await Promise.all([
          this.balanceSheetRepository.getCurrentAssets(orgIds),
          this.balanceSheetRepository.getBorrowingIncome(orgIds, params.financialYear),
          this.balanceSheetRepository.getBorrowingExpense(orgIds, params.financialYear),
          this.balanceSheetRepository.getCurrentLiabilities(orgIds, params.financialYear),
        ]);

      const balanceSheetData = BalanceSheet.fromInput({
        currentAssets,
        borrowingIncome,
        borrowingExpense,
        currentLiabilities,
      });

      return { balanceSheetData };
    } catch (error) {
      throw new Error(
        `Failed to get balance sheet data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
