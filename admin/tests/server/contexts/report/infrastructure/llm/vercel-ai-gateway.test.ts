import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { VercelAIGateway } from "@/server/contexts/report/infrastructure/llm/vercel-ai-gateway";

jest.mock("@ai-sdk/anthropic", () => ({
  anthropic: Object.assign(jest.fn((modelId: string) => ({ modelId })), {
    tools: { webSearch_20260209: jest.fn(() => ({ type: "web_search" })) },
  }),
}));
jest.mock("ai", () => ({ generateText: jest.fn() }));

const responseText = JSON.stringify({
  candidates: [
    {
      companyName: "株式会社テスト",
      postalCode: "100-0001",
      address: "東京都千代田区千代田1-1",
      confidence: "high",
      source: "公式サイト",
    },
  ],
  searchQuery: "株式会社テスト",
});

describe("VercelAIGateway", () => {
  const originalModel = process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
    jest.mocked(generateText).mockResolvedValue({ text: responseText } as never);
  });
  afterAll(() => {
    if (originalModel === undefined) delete process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
    else process.env.COUNTERPART_ADDRESS_SEARCH_MODEL = originalModel;
  });

  it("未設定なら claude-opus-5-5 と最新の Web 検索ツールで検索し、候補を返す", async () => {
    const result = await new VercelAIGateway().searchAddress({ companyName: "株式会社テスト" });

    expect(anthropic).toHaveBeenCalledWith("claude-opus-5-5");
    expect(anthropic.tools.webSearch_20260209).toHaveBeenCalledWith({ maxUses: 3 });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "claude-opus-5-5" },
        tools: { web_search: { type: "web_search" } },
      }),
    );
    expect(result.candidates).toEqual([
      {
        companyName: "株式会社テスト",
        postalCode: "100-0001",
        address: "東京都千代田区千代田1-1",
        confidence: "high",
        source: "公式サイト",
      },
    ]);
  });

  it("環境変数でモデルを差し替えられる", async () => {
    process.env.COUNTERPART_ADDRESS_SEARCH_MODEL = " custom-model ";
    await new VercelAIGateway().searchAddress({ companyName: "株式会社テスト" });
    expect(anthropic).toHaveBeenCalledWith("custom-model");
  });
});
