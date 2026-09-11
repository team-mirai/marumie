import { GetResearchFundPoliticiansUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-politicians-usecase";
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
  return { usecase: new GetResearchFundPoliticiansUsecase(repository), repository };
}

describe("GetResearchFundPoliticiansUsecase", () => {
  it("公開済みの月から公開範囲のラベルを組み立てる", async () => {
    const { usecase, repository } = build([
      {
        slug: "sample-taro",
        name: "サンプル 太郎",
        publishedMonths: ["2026-02", "2026-04"],
        publishedThrough: "2026-08",
      },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([
      {
        slug: "sample-taro",
        name: "サンプル 太郎",
        ready: true,
        statusLabel: "2026年2月〜8月分を公開中",
      },
    ]);
    expect(repository.findPoliticians).toHaveBeenCalledWith(2026);
  });

  it("公開済みの仕訳が無い議員も隠さず「準備中」で返す", async () => {
    const { usecase } = build([
      { slug: "sample-jiro", name: "サンプル 次郎", publishedMonths: [], publishedThrough: null },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([
      { slug: "sample-jiro", name: "サンプル 次郎", ready: false, statusLabel: "準備中" },
    ]);
  });

  it("公開範囲が未設定なら実データの月だけでラベルを作る", async () => {
    const { usecase } = build([
      {
        slug: "sample-hanako",
        name: "サンプル 花子",
        publishedMonths: ["2026-03"],
        publishedThrough: null,
      },
    ]);

    expect((await usecase.execute({ financialYear: 2026 }))[0].statusLabel).toBe(
      "2026年3月分を公開中",
    );
  });
});
