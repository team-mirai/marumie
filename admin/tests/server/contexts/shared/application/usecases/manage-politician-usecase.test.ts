import { ManagePoliticianUsecase } from "@/server/contexts/shared/application/usecases/manage-politician-usecase";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: " 議員名 ",
  slug: " test-member ",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
};
let repository: jest.Mocked<IPoliticianRepository>;
let usecase: ManagePoliticianUsecase;
beforeEach(() => {
  repository = { findAll: jest.fn(), findById: jest.fn(), save: jest.fn(), delete: jest.fn() };
  usecase = new ManagePoliticianUsecase(repository);
});
test("必須値を正規化して無所属で作成する", async () => {
  await usecase.save(null, input);
  expect(repository.save).toHaveBeenCalledWith(null, {
    ...input,
    name: "議員名",
    slug: "test-member",
  });
});
test.each([
  { name: " " },
  { slug: "" },
  { termStart: "" },
  { termStart: "2026-02-30" },
  { termStart: "invalid" },
  { politicalOrganizationId: "-1" },
  { slug: "../invalid" },
  { name: "a".repeat(256) },
])("不正入力では保存しない: %j", async (invalid) => {
  await expect(usecase.save(null, { ...input, ...invalid })).rejects.toThrow();
  expect(repository.save).not.toHaveBeenCalled();
});
test("既存議員の氏名・所属を更新する", async () => {
  repository.findById.mockResolvedValue({ ...input, id: "1", politicalOrganizationName: null });
  await usecase.save("1", { ...input, politicalOrganizationId: "2" });
  expect(repository.save).toHaveBeenCalledWith(
    "1",
    expect.objectContaining({ politicalOrganizationId: "2" }),
  );
});
test("存在しない議員は更新・削除できない", async () => {
  repository.findById.mockResolvedValue(null);
  await expect(usecase.save("1", input)).rejects.toThrow("議員が見つかりません");
  await expect(usecase.delete("1")).rejects.toThrow("議員が見つかりません");
  expect(repository.delete).not.toHaveBeenCalled();
});
test("不正IDはリポジトリへ渡さない", async () => {
  expect(await usecase.find("abc")).toBeNull();
  expect(repository.findById).not.toHaveBeenCalled();
});
test("一覧を返し、既存議員を削除する", async () => {
  const politician = { ...input, id: "1", politicalOrganizationName: null };
  repository.findAll.mockResolvedValue([politician]);
  repository.findById.mockResolvedValue(politician);
  expect(await usecase.list()).toEqual([politician]);
  await usecase.delete("1");
  expect(repository.delete).toHaveBeenCalledWith("1");
});
test("slug重複エラーを呼び出し側に返す", async () => {
  repository.save.mockRejectedValue(new Error("このスラッグは既に使用されています"));
  await expect(usecase.save(null, input)).rejects.toThrow("このスラッグは既に使用されています");
});
