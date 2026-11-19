import { GetResearchFundPoliticiansUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-politicians-usecase";
import type { ResearchFundPoliticianSource } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function build(politicians: ResearchFundPoliticianSource[]) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(null),
    findPublishedForHome: jest.fn().mockResolvedValue([]),
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
        name: "サンプル 太郎", house: null, constituency: null, hasPhoto: true,
        publishedMonths: ["2026-02", "2026-04"],
        publishedThrough: "2026-08",
        nameKana: null,
      },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([
      {
        slug: "sample-taro",
        name: "サンプル 太郎",
        nameKana: null,
        statusLabel: "2026年2-8月分を公開中",
        hasPhoto: true,
      },
    ]);
    expect(repository.findPoliticians).toHaveBeenCalledWith(2026);
  });

  it("帳簿はあっても公開済みの仕訳が無い議員は返さない", async () => {
    const { usecase } = build([
      {
        slug: "sample-taro",
        name: "サンプル 太郎", house: null, constituency: null, hasPhoto: false,
        publishedMonths: ["2026-02"],
        publishedThrough: null,
        nameKana: null,
      },
      { slug: "sample-jiro", name: "サンプル 次郎", nameKana: null, house: null, constituency: null, hasPhoto: false, publishedMonths: [], publishedThrough: "2026-08" },
    ]);

    expect((await usecase.execute({ financialYear: 2026 })).map((entry) => entry.slug)).toEqual([
      "sample-taro",
    ]);
  });

  it("公開済みの仕訳がある議員が1人もいなければ空で返す", async () => {
    const { usecase } = build([
      { slug: "sample-jiro", name: "サンプル 次郎", nameKana: null, house: null, constituency: null, hasPhoto: false, publishedMonths: [], publishedThrough: null },
    ]);

    expect(await usecase.execute({ financialYear: 2026 })).toEqual([]);
  });

  it("公開範囲が未設定なら実データの月だけでラベルを作る", async () => {
    const { usecase } = build([
      {
        slug: "sample-hanako",
        name: "サンプル 花子", house: null, constituency: null, hasPhoto: false,
        publishedMonths: ["2026-03"],
        publishedThrough: null,
        nameKana: null,
      },
    ]);

    expect((await usecase.execute({ financialYear: 2026 }))[0].statusLabel).toBe(
      "2026年3月分を公開中",
    );
  });

  it("議員をふりがなの五十音順に並べる", async () => {
    const source = (slug: string, nameKana: string | null): ResearchFundPoliticianSource => ({
      slug,
      name: slug,
      nameKana,
      house: null,
      constituency: null,
      hasPhoto: false,
      publishedMonths: ["2026-02"],
      publishedThrough: null,
    });
    const { usecase } = build([
      source("yamada", "やまだ"),
      source("anno", "あんの"),
      source("kawai", "かわい"),
    ]);

    expect((await usecase.execute({ financialYear: 2026 })).map((entry) => entry.slug)).toEqual([
      "anno",
      "kawai",
      "yamada",
    ]);
  });
});
