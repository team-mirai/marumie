jest.mock("@/server/contexts/research-fund/presentation/loaders/load-research-fund-receipt", () => ({
  loadResearchFundReceiptUrl: jest.fn(),
}));

import { GET } from "@/app/api/research-fund/receipts/[entryId]/route";
import { loadResearchFundReceiptUrl } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-receipt";

const loadResearchFundReceiptUrlMock = loadResearchFundReceiptUrl as jest.Mock;

describe("GET /api/research-fund/receipts/[entryId]", () => {
  beforeEach(() => {
    loadResearchFundReceiptUrlMock.mockReset();
  });

  it("公開済みの仕訳に領収書が紐づいていても、リダイレクトせず 404 を返す", async () => {
    loadResearchFundReceiptUrlMock.mockResolvedValue("https://storage.example/signed");

    const response = await GET(new Request("http://localhost/api/research-fund/receipts/12"), {
      params: Promise.resolve({ entryId: "12" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Location")).toBeNull();
    expect(loadResearchFundReceiptUrlMock).not.toHaveBeenCalled();
  });
});
