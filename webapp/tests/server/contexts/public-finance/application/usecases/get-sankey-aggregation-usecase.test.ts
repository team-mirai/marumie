import { GetSankeyAggregationUsecase } from "@/server/contexts/public-finance/application/usecases/get-sankey-aggregation-usecase";
import type { CategoryAggregation } from "@/server/contexts/public-finance/domain/models/category-aggregation";
import type { IBalanceSheetRepository } from "@/server/contexts/public-finance/domain/repositories/balance-sheet-repository.interface";
import type { IBalanceSnapshotRepository } from "@/server/contexts/public-finance/domain/repositories/balance-snapshot-repository.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { ITransactionRepository } from "@/server/contexts/public-finance/domain/repositories/transaction-repository.interface";
import type { SankeyData } from "@/server/contexts/shared/domain/models/sankey-data";

/** サンキー図の「合計」に流れ込む額と、「合計」から残高の列（nodeType が expense の最後の列）へ流れる額 */
function sankeyTotals(sankey: SankeyData, cashNodeId: string) {
  const total = sankey.nodes.find((n) => n.nodeType === "total");
  const into = sankey.links.filter((l) => l.target === total?.id);
  const toCash = sankey.links.filter((l) => l.source === total?.id && l.target === cashNodeId);
  return {
    income: into.reduce((sum, l) => sum + l.value, 0),
    balance: toCash.reduce((sum, l) => sum + l.value, 0),
  };
}

describe("GetSankeyAggregationUsecase", () => {
  const transactionRepository = {
    getCategoryAggregationForSankey: jest.fn(),
  } as unknown as jest.Mocked<ITransactionRepository>;
  const organizationRepository = {
    findBySlugs: jest.fn(),
  } as unknown as jest.Mocked<IPoliticalOrganizationRepository>;
  const balanceSnapshotRepository = {
    getTotalLatestBalancesByYear: jest.fn(),
  } as unknown as jest.Mocked<IBalanceSnapshotRepository>;
  const balanceSheetRepository = {
    getCurrentLiabilities: jest.fn(),
  } as unknown as jest.Mocked<IBalanceSheetRepository>;

  const usecase = new GetSankeyAggregationUsecase(
    transactionRepository,
    organizationRepository,
    balanceSnapshotRepository,
    balanceSheetRepository,
  );

  const aggregation: CategoryAggregation = {
    income: [
      { category: "寄附", subcategory: "個人からの寄附", totalAmount: 6_000_000 },
      { category: "その他", subcategory: "雑収入", totalAmount: 200_000 },
      { category: "その他", subcategory: "返金", totalAmount: -50_000 },
    ],
    expense: [{ category: "政治活動費", subcategory: "宣伝費", totalAmount: 3_000_000 }],
  };

  const setUp = (balances: { previous: number; current: number; liability: number }) => {
    organizationRepository.findBySlugs.mockResolvedValue([
      { id: "1" } as Awaited<ReturnType<IPoliticalOrganizationRepository["findBySlugs"]>>[number],
    ]);
    transactionRepository.getCategoryAggregationForSankey.mockResolvedValue(aggregation);
    balanceSnapshotRepository.getTotalLatestBalancesByYear.mockResolvedValue({
      previousYear: balances.previous,
      currentYear: balances.current,
    });
    balanceSheetRepository.getCurrentLiabilities.mockResolvedValue(balances.liability);
  };

  it.each([
    { name: "未払費用が無い", previous: 1_000_000, current: 2_000_000, liability: 0 },
    { name: "未払費用が現金を下回る", previous: 1_000_000, current: 2_000_000, liability: 500_000 },
    { name: "未払費用が現金を上回る", previous: 0, current: 500_000, liability: 1_500_000 },
  ])(
    "詳細の区分の見出しの総額は、図の「合計」への流入と「現金残高」への流出と一致する（$name）",
    async (balances) => {
      setUp(balances);

      const { sankeyData, summary } = await usecase.execute({
        slugs: ["sample"],
        financialYear: 2026,
        categoryType: "friendly-category",
      });

      const cashNode = sankeyData.nodes.find(
        (n) => n.nodeType === "expense" && n.label === "現金残高",
      );
      const expected = sankeyTotals(sankeyData, cashNode?.id ?? "");
      expect(summary).toEqual({
        income: expected.income,
        expense: expected.income - expected.balance,
        balance: expected.balance,
      });
    },
  );

  it("図のノードの表示ラベルを変えても、見出しの総額は変わらない", async () => {
    setUp({ previous: 1_000_000, current: 2_000_000, liability: 500_000 });
    const params = {
      slugs: ["sample"],
      financialYear: 2026,
      categoryType: "friendly-category" as const,
    };
    const before = await usecase.execute(params);

    // 収入・支出の区分名が変わっても（図のラベルが変わっても）総額は同じ
    transactionRepository.getCategoryAggregationForSankey.mockResolvedValue({
      income: aggregation.income.map((item) => ({ ...item, category: `${item.category}（改）` })),
      expense: aggregation.expense.map((item) => ({ ...item, category: `${item.category}（改）` })),
    });
    const after = await usecase.execute(params);

    expect(after.sankeyData.nodes.map((n) => n.label)).not.toEqual(
      before.sankeyData.nodes.map((n) => n.label),
    );
    expect(after.summary).toEqual(before.summary);
    expect(before.summary).toEqual({ income: 7_200_000, expense: 5_200_000, balance: 2_000_000 });
  });
});
