import { GetResearchFundComingSoonPageUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-coming-soon-page-usecase";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function build(found: unknown) {
  const repository = {
    findComingSoonProfile: jest.fn().mockResolvedValue(found),
  } as unknown as ResearchFundRepository;
  return new GetResearchFundComingSoonPageUsecase(repository);
}

describe("GetResearchFundComingSoonPageUsecase", () => {
  it("「準備中」の議員なら、肩書きを組み立てたプロフィールと添え書きを返す", async () => {
    const result = await build({
      politician: {
        name: "サンプル準備",
        slug: "sample-usami",
        nameKana: null,
        house: "shugiin",
        constituency: "比例東京",
        profileUrl: null,
        websiteUrl: null,
        snsUrls: [],
        hasPhoto: true,
      },
      note: "12月中旬を目処に公開予定です。",
    }).execute("sample-usami");

    expect(result?.politician.title).toContain("衆議院議員");
    expect(result?.politician).not.toHaveProperty("house");
    expect(result?.note).toBe("12月中旬を目処に公開予定です。");
    expect(result?.dataNote).toContain("所属議員の調研費を随時公開しています。");
  });

  it("「準備中」でなければ null（404）", async () => {
    expect(await build(null).execute("nobody")).toBeNull();
  });
});
