import { GetPromptOverviewUsecase } from "@/server/contexts/research-fund/application/usecases/get-prompt-overview-usecase";
import type { PromptRecord } from "@/server/contexts/research-fund/domain/models/prompt";
import type { PromptRepository } from "@/server/contexts/research-fund/domain/repositories/prompt-repository.interface";
import { DEFAULT_OFFICE_PROMPT, buildAutomaticReceiptPrompt } from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";
function setup() {
  const repository: jest.Mocked<PromptRepository> = { list: jest.fn(), create: jest.fn(), activate: jest.fn(), findActive: jest.fn() };
  return { repository, usecase: new GetPromptOverviewUsecase(repository) };
}
function record(version: number, body: string, isActive: boolean): PromptRecord {
  return { id: String(version), version, body, isActive, updatedAt: "2026-09-01T00:00:00.000Z", jobCount: version };
}
test("版が1つも無ければデフォルトテンプレートから始め、保存はv1になる", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([]);
  await expect(usecase.execute("2")).resolves.toEqual({
    versions: [], body: DEFAULT_OFFICE_PROMPT, activeVersion: null, nextVersion: 1,
    automaticPrompt: buildAutomaticReceiptPrompt(),
  });
});
test("有効版の本文を編集対象にし、変更要旨と次の版番号を返す", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([record(3, "a\nb\nc", false), record(2, "a\nb", true), record(1, "a", false)]);
  const result = await usecase.execute("2");
  expect(result.body).toBe("a\nb");
  expect(result.activeVersion).toBe(2);
  expect(result.nextVersion).toBe(4);
  expect(result.versions.map((v) => v.summary)).toEqual(["+1行", "+1行", "初版"]);
});
test("有効版が無ければ最新版を編集対象にする", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([record(2, "新", false), record(1, "旧", false)]);
  await expect(usecase.execute("2")).resolves.toMatchObject({ body: "新", activeVersion: 2, nextVersion: 3 });
});
test.each(["", "0", "-1", "abc"])("不正な議員IDではリポジトリを呼ばない: %j", async (politicianId) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(politicianId)).rejects.toThrow("ID");
  expect(repository.list).not.toHaveBeenCalled();
});
