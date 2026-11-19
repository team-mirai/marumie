import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { VercelAIPayeeAddressSearchGateway } from "@/server/contexts/research-fund/infrastructure/llm/vercel-ai-payee-address-search-gateway";
jest.mock("@ai-sdk/anthropic", () => ({
  anthropic: Object.assign(jest.fn((modelId: string) => ({ modelId })), {
    tools: { webSearch_20260209: jest.fn(() => ({ type: "web_search" })) },
  }),
}));
jest.mock("ai", () => ({ generateText: jest.fn() }));
const originalModel = process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
});
afterAll(() => {
  if (originalModel === undefined) delete process.env.COUNTERPART_ADDRESS_SEARCH_MODEL;
  else process.env.COUNTERPART_ADDRESS_SEARCH_MODEL = originalModel;
});
function respond(text: string) {
  jest.mocked(generateText).mockResolvedValue({ text } as never);
}
test("渡されたプロンプトのまま、取引先の住所検索と同じモデルと Web 検索で検索する", async () => {
  respond(JSON.stringify({ candidates: [{ companyName: "株式会社テスト", postalCode: "100-0001", address: "東京都千代田区千代田1-1", confidence: "high", source: "公式サイト" }], searchQuery: "株式会社テスト 本社" }));
  await expect(new VercelAIPayeeAddressSearchGateway().search("組み立て済みのプロンプト", "株式会社テスト")).resolves.toEqual({
    candidates: [{ companyName: "株式会社テスト", postalCode: "100-0001", address: "東京都千代田区千代田1-1", confidence: "high", source: "公式サイト" }],
    searchQuery: "株式会社テスト 本社",
  });
  expect(anthropic).toHaveBeenCalledWith("claude-opus-5-5");
  expect(anthropic.tools.webSearch_20260209).toHaveBeenCalledWith({ maxUses: 3 });
  expect(generateText).toHaveBeenCalledWith(expect.objectContaining({ prompt: "組み立て済みのプロンプト" }));
});
test("モデルは環境変数で差し替えられる", async () => {
  process.env.COUNTERPART_ADDRESS_SEARCH_MODEL = " claude-sonnet-5 ";
  respond("{}");
  await new VercelAIPayeeAddressSearchGateway().search("p", "名称");
  expect(anthropic).toHaveBeenCalledWith("claude-sonnet-5");
});
test("前後に文章が付いても JSON を取り出し、欠けた値は補って最大5件にする", async () => {
  const candidates = Array.from({ length: 6 }, (_, i) => ({ companyName: `社${i}`, address: `住所${i}`, confidence: "unknown" }));
  respond(`検索結果です。\n${JSON.stringify({ candidates })}\n以上です。`);
  const result = await new VercelAIPayeeAddressSearchGateway().search("p", "名称");
  expect(result.candidates).toHaveLength(5);
  expect(result.candidates[0]).toEqual({ companyName: "社0", postalCode: null, address: "住所0", confidence: "low", source: "LLM知識" });
  expect(result.searchQuery).toBe("名称");
});
test.each(["該当なし", "{ 壊れた JSON", JSON.stringify({ candidates: "なし" })])("解析できない応答は候補なしにする: %s", async (text) => {
  respond(text);
  await expect(new VercelAIPayeeAddressSearchGateway().search("p", "名称")).resolves.toEqual({ candidates: [], searchQuery: "名称" });
});
