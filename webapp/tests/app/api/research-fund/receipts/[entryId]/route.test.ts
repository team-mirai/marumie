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

  // 領収書の公開を止めている間は usecase が null を返す（tests/.../get-research-fund-receipt-usecase.test.ts）。
  it("領収書を返せないときは、リダイレクトせず 404 を返す", async () => {
    loadResearchFundReceiptUrlMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/research-fund/receipts/12"), {
      params: Promise.resolve({ entryId: "12" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Location")).toBeNull();
    expect(loadResearchFundReceiptUrlMock).toHaveBeenCalledWith("12");
  });

  it("領収書を返せるときは、キャッシュさせずに署名URLへリダイレクトする", async () => {
    loadResearchFundReceiptUrlMock.mockResolvedValue("https://storage.example/signed");

    const response = await GET(new Request("http://localhost/api/research-fund/receipts/12"), {
      params: Promise.resolve({ entryId: "12" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://storage.example/signed");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
