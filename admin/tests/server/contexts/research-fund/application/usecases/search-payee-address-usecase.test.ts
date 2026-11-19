import { SearchPayeeAddressUsecase } from "@/server/contexts/research-fund/application/usecases/search-payee-address-usecase";
import type { PayeeAddressSearchGateway } from "@/server/contexts/research-fund/domain/repositories/payee-address-search-gateway.interface";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import { DEFAULT_ADDRESS_SEARCH_PROMPT } from "@/server/contexts/research-fund/domain/services/payee-address-search-prompt";
const candidate = { companyName: "株式会社テスト", postalCode: "100-0001", address: "東京都千代田区千代田1-1", confidence: "high" as const, source: "公式サイト" };
function setup() {
  const repository: jest.Mocked<PromptRepository> = { list: jest.fn(), create: jest.fn(), activate: jest.fn(), findActive: jest.fn() };
  const gateway: jest.Mocked<PayeeAddressSearchGateway> = { search: jest.fn() };
  gateway.search.mockResolvedValue({ candidates: [candidate], searchQuery: "株式会社テスト" });
  return { repository, gateway, usecase: new SearchPayeeAddressUsecase(repository, gateway) };
}
test("議員の有効版のプロンプトで検索し、候補を返す", async () => {
  const { repository, gateway, usecase } = setup();
  repository.findActive.mockResolvedValue({ id: "5", version: 2, body: "議員室の指示", isActive: true, updatedAt: "2026-10-01T00:00:00.000Z", jobCount: null });
  await expect(usecase.execute("2", " 株式会社テスト ", " 印刷業 ")).resolves.toEqual({
    success: true, data: { candidates: [candidate], searchQuery: "株式会社テスト" },
  });
  expect(repository.findActive).toHaveBeenCalledWith("2");
  const [prompt, name] = gateway.search.mock.calls[0];
  expect(prompt.startsWith("議員室の指示\n\n会社名: 株式会社テスト\n検索ヒント: 印刷業\n")).toBe(true);
  expect(prompt).not.toContain(DEFAULT_ADDRESS_SEARCH_PROMPT);
  expect(name).toBe("株式会社テスト");
});
test("版が無い議員は今と同じデフォルトのプロンプトで検索する", async () => {
  const { repository, gateway, usecase } = setup();
  repository.findActive.mockResolvedValue(null);
  await usecase.execute("2", "株式会社テスト");
  const [prompt] = gateway.search.mock.calls[0];
  expect(prompt.startsWith(`${DEFAULT_ADDRESS_SEARCH_PROMPT}\n\n会社名: 株式会社テスト\n\n`)).toBe(true);
});
test("候補が無ければ再検索を促す", async () => {
  const { repository, gateway, usecase } = setup();
  repository.findActive.mockResolvedValue(null);
  gateway.search.mockResolvedValue({ candidates: [], searchQuery: "不明" });
  await expect(usecase.execute("2", "不明")).resolves.toMatchObject({ success: false, error: { type: "NO_RESULTS" } });
});
test("名称が空なら検索しない", async () => {
  const { repository, gateway, usecase } = setup();
  await expect(usecase.execute("2", "  ")).resolves.toMatchObject({ success: false, error: { type: "NO_RESULTS" } });
  expect(repository.findActive).not.toHaveBeenCalled();
  expect(gateway.search).not.toHaveBeenCalled();
});
test("不正な議員IDではプロンプトを引かない", async () => {
  const { repository, gateway, usecase } = setup();
  await expect(usecase.execute("abc", "株式会社テスト")).rejects.toThrow("ID");
  expect(repository.findActive).not.toHaveBeenCalled();
  expect(gateway.search).not.toHaveBeenCalled();
});
