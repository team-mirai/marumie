import { ManagePromptUsecase } from "@/server/contexts/research-fund/application/usecases/manage-prompt-usecase";
import type { PromptRecord } from "@/server/contexts/research-fund/domain/models/prompt";
import { DEFAULT_OFFICE_PROMPT, buildAutomaticReceiptPrompt } from "@/server/contexts/research-fund/domain/services/receipt-extraction-prompt";
function setup() {
  const repository = { list: jest.fn(), create: jest.fn(), activate: jest.fn() };
  return { repository, usecase: new ManagePromptUsecase(repository) };
}
function record(version: number, body: string, isActive: boolean): PromptRecord {
  return { id: String(version), version, body, isActive, updatedAt: "2026-09-01T00:00:00.000Z", jobCount: version };
}
test("版が1つも無ければデフォルトテンプレートから始め、保存はv1になる", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([]);
  await expect(usecase.list("2")).resolves.toEqual({
    versions: [], body: DEFAULT_OFFICE_PROMPT, activeVersion: null, nextVersion: 1,
    automaticPrompt: buildAutomaticReceiptPrompt(),
  });
});
test("有効版の本文を編集対象にし、変更要旨と次の版番号を返す", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([record(3, "a\nb\nc", false), record(2, "a\nb", true), record(1, "a", false)]);
  const result = await usecase.list("2");
  expect(result.body).toBe("a\nb");
  expect(result.activeVersion).toBe(2);
  expect(result.nextVersion).toBe(4);
  expect(result.versions.map((v) => v.summary)).toEqual(["+1行", "+1行", "初版"]);
});
test("有効版が無ければ最新版を編集対象にする", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([record(2, "新", false), record(1, "旧", false)]);
  await expect(usecase.list("2")).resolves.toMatchObject({ body: "新", activeVersion: 2, nextVersion: 3 });
});
test("保存は正規化した本文と更新者を渡し、採番された版を返す", async () => {
  const { repository, usecase } = setup();
  repository.create.mockResolvedValue(4);
  await expect(usecase.save("2", "  本文  ", "user")).resolves.toBe(4);
  expect(repository.create).toHaveBeenCalledWith("2", "本文", "user");
});
test("空の本文は保存しない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.save("2", "   ", "user")).rejects.toThrow("プロンプト本文");
  expect(repository.create).not.toHaveBeenCalled();
});
test("巻き戻しは既存の版を有効にするだけで、新しい版を作らない", async () => {
  const { repository, usecase } = setup();
  await usecase.rollback("2", 1);
  expect(repository.activate).toHaveBeenCalledWith("2", 1);
  expect(repository.create).not.toHaveBeenCalled();
});
test.each([0, -1, 1.5, NaN, "1", null])("不正な版の指定では巻き戻さない: %j", async (version) => {
  const { repository, usecase } = setup();
  await expect(usecase.rollback("2", version)).rejects.toThrow("版の指定");
  expect(repository.activate).not.toHaveBeenCalled();
});
test.each(["", "0", "-1", "abc"])("不正な議員IDではリポジトリを呼ばない: %j", async (politicianId) => {
  const { repository, usecase } = setup();
  await expect(usecase.list(politicianId)).rejects.toThrow("ID");
  await expect(usecase.save(politicianId, "本文", "user")).rejects.toThrow("ID");
  await expect(usecase.rollback(politicianId, 1)).rejects.toThrow("ID");
  expect(repository.list).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.activate).not.toHaveBeenCalled();
});
