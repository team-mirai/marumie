import type { BalanceSheetData } from "@/types/balance-sheet";
import type { ITransactionRepository } from "../repositories/interfaces/transaction-repository.interface";
import type { IBalanceSnapshotRepository } from "../repositories/interfaces/balance-snapshot-repository.interface";
import type { IPoliticalOrganizationRepository } from "../repositories/interfaces/political-organization-repository.interface";

export interface GetBalanceSheetParams {
  slugs: string[];
  financialYear: number;
}

export interface GetBalanceSheetResult {
  balanceSheetData: BalanceSheetData;
}

export class GetBalanceSheetUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private balanceSnapshotRepository: IBalanceSnapshotRepository,
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
  ) {}

  async execute(params: GetBalanceSheetParams): Promise<GetBalanceSheetResult> {
    try {
      // 1. slugから政治団体を取得
      const organizations = await this.politicalOrganizationRepository.findBySlugs(params.slugs);

      if (organizations.length === 0) {
        throw new Error(
          `Political organizations with slugs "${params.slugs.join(", ")}" not found`,
        );
      }

      const balanceSheetData = await this.calculateBalanceSheet(params, organizations);

      return { balanceSheetData };
    } catch (error) {
      throw new Error(
        `Failed to get balance sheet data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async calculateBalanceSheet(
    params: GetBalanceSheetParams,
    organizations: { id: string }[],
  ): Promise<BalanceSheetData> {
    const orgIds = organizations.map((org) => org.id);

    // 2. 各組織の最新残高の合計を取得
    const currentAssets =
      await this.balanceSnapshotRepository.getTotalLatestBalanceByOrgIds(orgIds);

    // 4. 固定負債を計算（借入金の収入 - 支出）
    const [borrowingIncome, borrowingExpense, currentLiabilities] = await Promise.all([
      this.transactionRepository.getBorrowingIncomeTotal(orgIds, params.financialYear),
      this.transactionRepository.getBorrowingExpenseTotal(orgIds, params.financialYear),
      this.transactionRepository.getLiabilityBalance(orgIds, params.financialYear),
    ]);
    const fixedLiabilities = borrowingIncome - borrowingExpense;

    // 5. 固定資産は決め打ちでゼロ
    const fixedAssets = 0;

    // 6. 純資産と債務超過を計算
    const [netAssets, debtExcess] = this.calculateNetAssetsAndDebtExcess(
      currentAssets,
      fixedAssets,
      currentLiabilities,
      fixedLiabilities,
    );

    const balanceSheetData: BalanceSheetData = {
      left: {
        currentAssets,
        fixedAssets,
        debtExcess,
      },
      right: {
        currentLiabilities,
        fixedLiabilities,
        netAssets,
      },
    };

    return balanceSheetData;
  }

  private calculateNetAssetsAndDebtExcess(
    currentAssets: number,
    fixedAssets: number,
    currentLiabilities: number,
    fixedLiabilities: number,
  ): [netAssets: number, debtExcess: number] {
    const totalAssets = currentAssets + fixedAssets;
    const totalLiabilities = currentLiabilities + fixedLiabilities;

    const balance = totalAssets - totalLiabilities;

    if (balance >= 0) {
      // 資産が負債を上回る場合：純資産あり、債務超過なし
      return [balance, 0];
    } else {
      // 負債が資産を上回る場合：純資産なし、債務超過あり
      return [0, Math.abs(balance)];
    }
  }
}
