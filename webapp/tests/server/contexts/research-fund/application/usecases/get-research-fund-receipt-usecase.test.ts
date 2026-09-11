import { GetResearchFundReceiptUsecase } from "@/server/contexts/research-fund/application/usecases/get-research-fund-receipt-usecase";
import type { ReceiptStorage } from "@/server/contexts/research-fund/domain/repositories/receipt-storage.interface";
import type { ResearchFundRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-repository.interface";

function build(receipt: { storageKey: string } | null) {
  const repository: ResearchFundRepository = {
    findPublished: jest.fn().mockResolvedValue(null),
    findPublishedByOrganization: jest.fn().mockResolvedValue(null),
    findPoliticians: jest.fn().mockResolvedValue([]),
    findPublishedPageRefs: jest.fn().mockResolvedValue([]),
    findPublishedReceipt: jest.fn().mockResolvedValue(receipt),
  };
  const storage: ReceiptStorage = {
    createSignedUrl: jest.fn().mockResolvedValue("https://storage.example/signed"),
  };
  return { usecase: new GetResearchFundReceiptUsecase(repository, storage), repository, storage };
}

describe("GetResearchFundReceiptUsecase", () => {
  it("公開済みの仕訳に紐づく領収書は署名URLを返す", async () => {
    const { usecase, storage } = build({ storageKey: "key-1" });

    expect(await usecase.execute("12")).toBe("https://storage.example/signed");
    expect(storage.createSignedUrl).toHaveBeenCalledWith("key-1", 300);
  });

  it("公開されていない・存在しない仕訳の領収書は返さない", async () => {
    const { usecase, storage } = build(null);

    expect(await usecase.execute("12")).toBeNull();
    expect(storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("仕訳IDでない入力ではストレージにも問い合わせない", async () => {
    const { usecase, repository } = build({ storageKey: "key-1" });

    expect(await usecase.execute("../secret")).toBeNull();
    expect(await usecase.execute("0")).toBeNull();
    expect(repository.findPublishedReceipt).not.toHaveBeenCalled();
  });
});
