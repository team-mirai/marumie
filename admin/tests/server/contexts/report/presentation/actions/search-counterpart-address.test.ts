import { searchCounterpartAddressAction } from "@/server/contexts/report/presentation/actions/search-counterpart-address";
import { VercelAIGateway } from "@/server/contexts/report/infrastructure/llm/vercel-ai-gateway";

jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({
  requireAuth: jest.fn(),
}));
jest.mock("@/server/contexts/report/infrastructure/llm/vercel-ai-gateway", () => ({
  VercelAIGateway: jest.fn(),
}));

describe("searchCounterpartAddressAction", () => {
  let errorLog: jest.SpyInstance;
  beforeEach(() => {
    errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorLog.mockRestore());

  it("API の失敗時は生のエラーメッセージを返さず、詳細はサーバーログに残す", async () => {
    const apiError = new Error("model: claude-sonnet-4-20250514");
    jest.mocked(VercelAIGateway).mockImplementation(
      () => ({ searchAddress: jest.fn().mockRejectedValue(apiError) }) as never,
    );

    const result = await searchCounterpartAddressAction("株式会社テスト");

    expect(result).toEqual({
      success: false,
      error: {
        type: "API_ERROR",
        message: "住所検索に失敗しました。時間をおいて再度お試しください。",
        retryable: true,
      },
    });
    expect(errorLog).toHaveBeenCalledWith("Error searching counterpart address:", apiError);
  });
});
