import { GetPublishedResearchFundPagesUsecase } from "@/server/contexts/research-fund/application/usecases/get-published-research-fund-pages-usecase";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function build(refs: { slug: string; financialYear: number }[]) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(null),
    findPublishedPageRefs: jest.fn().mockResolvedValue(refs),
    findPublishedReceipt: jest.fn().mockResolvedValue(null),
  };
  return { usecase: new GetPublishedResearchFundPagesUsecase(repository), repository };
}

describe("GetPublishedResearchFundPagesUsecase", () => {
  it("公開ページが成立する議員×年度を返す", async () => {
    const { usecase } = build([
      { slug: "sample-taro", financialYear: 2025 },
      { slug: "sample-taro", financialYear: 2026 },
    ]);

    expect(await usecase.execute()).toEqual([
      { slug: "sample-taro", financialYear: 2025 },
      { slug: "sample-taro", financialYear: 2026 },
    ]);
  });

  it("公開ページが1件も無ければ空配列を返す", async () => {
    const { usecase } = build([]);

    expect(await usecase.execute()).toEqual([]);
  });
});
