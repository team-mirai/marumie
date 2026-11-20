import { GetResearchFundComingSoonPoliticiansUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-coming-soon-politicians-usecase";
import type { ResearchFundComingSoonPolitician } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function politician(
  slug: string,
  nameKana: string | null,
  note: string | null = null,
): ResearchFundComingSoonPolitician {
  return { slug, name: slug, nameKana, hasPhoto: false, note };
}

describe("GetResearchFundComingSoonPoliticiansUsecase", () => {
  it("「準備中」の議員をふりがなの五十音順に並べて返す", async () => {
    const repository = {
      findComingSoonPoliticians: jest
        .fn()
        .mockResolvedValue([
          politician("usami", "うさみのぼる", "12月中旬を目処に公開予定です。"),
          politician("no-kana", null),
          politician("anno", "あんのたかひろ"),
        ]),
    } as unknown as ResearchFundRepository;

    const result = await new GetResearchFundComingSoonPoliticiansUsecase(repository).execute();

    expect(result.map((item) => item.slug)).toEqual(["anno", "usami", "no-kana"]);
    expect(result[1].note).toBe("12月中旬を目処に公開予定です。");
  });
});
