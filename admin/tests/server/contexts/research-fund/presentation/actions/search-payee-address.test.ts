import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { SearchPayeeAddressUsecase } from "@/server/contexts/research-fund/application/usecases/search-payee-address-usecase";
import { searchPayeeAddress } from "@/server/contexts/research-fund/presentation/actions/search-payee-address";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({ requireResearchFundWriter: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
jest.mock("@ai-sdk/anthropic", () => ({ anthropic: jest.fn() }));
jest.mock("ai", () => ({ generateText: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.mocked(requireResearchFundWriter).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireResearchFundWriter>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("帳簿の議員のプロンプトで検索する", async () => {
  const result = { success: true as const, data: { candidates: [], searchQuery: "株式会社テスト" } };
  const search = jest.spyOn(SearchPayeeAddressUsecase.prototype, "execute").mockResolvedValue(result);
  await expect(searchPayeeAddress("2", "1", "株式会社テスト", "印刷業")).resolves.toBe(result);
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(search).toHaveBeenCalledWith("2", "株式会社テスト", "印刷業");
});
test("別の対象からの検索は、その議員のプロンプトを使わずに断る", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const search = jest.spyOn(SearchPayeeAddressUsecase.prototype, "execute");
  await expect(searchPayeeAddress("3", "1", "株式会社テスト")).resolves.toMatchObject({ success: false });
  expect(search).not.toHaveBeenCalled();
});
test("認証失敗時は検索しない", async () => {
  jest.mocked(requireResearchFundWriter).mockRejectedValueOnce(new Error("auth"));
  const search = jest.spyOn(SearchPayeeAddressUsecase.prototype, "execute");
  await expect(searchPayeeAddress("2", "1", "株式会社テスト")).rejects.toThrow("auth");
  expect(search).not.toHaveBeenCalled();
});
test.each([
  ["request timeout", "TIMEOUT"],
  ["Request Timeout", "TIMEOUT"],
  ["429 Too Many Requests", "RATE_LIMIT"],
  ["Rate limit exceeded", "RATE_LIMIT"],
  ["failed to generate text", "API_ERROR"],
  ["private api detail", "API_ERROR"],
])("検索の失敗（%s）は内部の詳細を出さずに種類で返す", async (message, type) => {
  jest.spyOn(SearchPayeeAddressUsecase.prototype, "execute").mockRejectedValueOnce(new Error(message));
  const result = await searchPayeeAddress("2", "1", "株式会社テスト");
  expect(result).toMatchObject({ success: false, error: { type } });
  expect(JSON.stringify(result)).not.toContain(message);
});
