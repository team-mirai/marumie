import { GetResearchFundCsvUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-csv-usecase";
import type { PublishedResearchFund } from "@/server/contexts/research-fund/domain/models/published-research-fund";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function published(): PublishedResearchFund {
  return {
    politician: { name: "サンプル 太郎", slug: "sample-taro" },
    financialYear: 2026,
    asOfDate: null,
    nextUpdateNote: null,
    policyComment: null,
    details: null,
    publishedThrough: null,
    rows: [{ date: "2026-02-10", accountKey: "taxi", amount: 3_000, type: "expense" }],
    accounts: { taxi: { label: "タクシー代", legalLabel: "⑨ 滞在費", legalCategoryKey: "stay" } },
    expenses: [
      {
        id: "1",
        entryId: "1",
        date: "2026-02-10",
        accountKey: "taxi",
        description: "タクシー代",
        amount: 3_000,
        note: null,
        splitGroup: null,
        hasReceipt: true,
      },
    ],
    groups: [],
  };
}

function setup(value: PublishedResearchFund | null) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(value),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundCsvUsecase(repository), repository };
}

describe("GetResearchFundCsvUsecase", () => {
  it("published の支出を CSV にして返す", async () => {
    const { usecase, repository } = setup(published());

    const csv = await usecase.execute({ slug: "sample-taro", financialYear: 2026 });

    expect(repository.findPublished).toHaveBeenCalledWith("sample-taro", 2026);
    expect(csv?.split("\n")).toEqual([
      '"日付","カテゴリー","法定区分","項目","金額","特記事項","分割グループ","領収書"',
      '"2026-02-10","タクシー代","⑨ 滞在費","タクシー代","3000","","","あり"',
    ]);
  });

  it("帳簿が無ければ null を返す", async () => {
    const { usecase } = setup(null);

    expect(await usecase.execute({ slug: "unknown", financialYear: 2026 })).toBeNull();
  });
});
