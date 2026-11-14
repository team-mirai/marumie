import { GetResearchFundPoliticianCardsUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-politician-cards-usecase";
import type { ResearchFundPoliticianSource } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function build(politicians: ResearchFundPoliticianSource[]) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(null),
    findPublishedByOrganization: jest.fn().mockResolvedValue(null),
    findPoliticians: jest.fn().mockResolvedValue(politicians),
    findPublishedPageRefs: jest.fn().mockResolvedValue([]),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetResearchFundPoliticianCardsUsecase(repository), repository };
}

describe("GetResearchFundPoliticianCardsUsecase", () => {
  it("公開済みの仕訳がある議員を表示順のまま、肩書きと写真の有無を添えて返す", async () => {
    const { usecase, repository } = build([
      {
        slug: "sample-taro",
        name: "サンプル 太郎",
        house: "shugiin",
        constituency: "比例東京",
        hasPhoto: true,
        publishedMonths: ["2026-02"],
        publishedThrough: null,
      },
      {
        slug: "sample-jiro",
        name: "サンプル 次郎",
        house: null,
        constituency: null,
        hasPhoto: false,
        publishedMonths: ["2026-03"],
        publishedThrough: null,
      },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([
      { slug: "sample-taro", name: "サンプル 太郎", title: "衆議院議員・比例東京", hasPhoto: true },
      { slug: "sample-jiro", name: "サンプル 次郎", title: null, hasPhoto: false },
    ]);
    expect(repository.findPoliticians).toHaveBeenCalledWith(2026);
  });

  it("帳簿はあっても公開済みの仕訳が無い議員は、リンク先に中身が無いので返さない", async () => {
    const { usecase } = build([
      {
        slug: "sample-taro",
        name: "サンプル 太郎",
        house: null,
        constituency: null,
        hasPhoto: false,
        publishedMonths: [],
        publishedThrough: null,
      },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([]);
  });
});
