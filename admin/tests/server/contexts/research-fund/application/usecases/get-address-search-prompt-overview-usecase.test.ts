import { GetAddressSearchPromptOverviewUsecase } from "@/server/contexts/research-fund/application/usecases/get-address-search-prompt-overview-usecase";
import type { PromptRecord } from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import { DEFAULT_ADDRESS_SEARCH_PROMPT, buildAutomaticAddressSearchPrompt } from "@/server/contexts/research-fund/domain/services/payee-address-search-prompt";
function setup() {
  const repository: jest.Mocked<PromptRepository> = { list: jest.fn(), create: jest.fn(), activate: jest.fn(), findActive: jest.fn() };
  return { repository, usecase: new GetAddressSearchPromptOverviewUsecase(repository) };
}
function record(version: number, body: string, isActive: boolean): PromptRecord {
  return { id: String(version), version, body, isActive, updatedAt: "2026-10-01T00:00:00.000Z", jobCount: null };
}
test("版が1つも無ければ今の住所検索プロンプトから始め、保存はv1になる", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([]);
  await expect(usecase.execute("2")).resolves.toEqual({
    versions: [], body: DEFAULT_ADDRESS_SEARCH_PROMPT, activeVersion: null, nextVersion: 1,
    automaticPrompt: buildAutomaticAddressSearchPrompt(),
  });
});
test("議員の版履歴から有効版の本文と変更要旨を返す", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([record(2, "a\nb", false), record(1, "a", true)]);
  const result = await usecase.execute("2");
  expect(repository.list).toHaveBeenCalledWith("2");
  expect(result).toMatchObject({ body: "a", activeVersion: 1, nextVersion: 3 });
  expect(result.versions.map((v) => v.summary)).toEqual(["+1行", "初版"]);
});
test.each(["", "0", "abc"])("不正な議員IDではリポジトリを呼ばない: %j", async (politicianId) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(politicianId)).rejects.toThrow("ID");
  expect(repository.list).not.toHaveBeenCalled();
});
