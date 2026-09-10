import { ManageBookUsecase } from "@/server/contexts/research-fund/application/usecases/manage-book-usecase";
const metadata = { asOfDate: "2026-08-20", nextUpdateNote: " 11月ごろ ", policyComment: " 方針 " };
function setup() {
  const repository = { list: jest.fn(), create: jest.fn(), update: jest.fn() };
  return { repository, usecase: new ManageBookUsecase(repository) };
}
test.each([0, 1899, 10000, 2026.5, NaN])("不正な年度 %s は保存しない", async (year) => {
  const { repository, usecase } = setup();
  await expect(usecase.create("1", year)).rejects.toThrow("年度");
  expect(repository.create).not.toHaveBeenCalled();
});
test("議員と年度を指定して作成し、重複エラーを伝える", async () => {
  const { repository, usecase } = setup();
  await usecase.create("1", 2026);
  expect(repository.create).toHaveBeenCalledWith("1", 2026);
  repository.create.mockRejectedValue(new Error("既に存在"));
  await expect(usecase.create("1", 2026)).rejects.toThrow("既に存在");
});
test.each(["2026-02-30", "invalid", "2026-13-01"])("実在しない時点 %s は保存しない", async (asOfDate) => {
  const { repository, usecase } = setup();
  await expect(usecase.update("1", "2", { ...metadata, asOfDate })).rejects.toThrow("日付");
  expect(repository.update).not.toHaveBeenCalled();
});
test("メタデータを正規化し、空の日付も保存できる", async () => {
  const { repository, usecase } = setup();
  await usecase.update("1", "2", metadata);
  expect(repository.update).toHaveBeenCalledWith("1", "2", { ...metadata, nextUpdateNote: "11月ごろ", policyComment: "方針" });
  await usecase.update("1", "2", { asOfDate: "", nextUpdateNote: "", policyComment: "" });
});
test("不正なIDではリポジトリを呼ばない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.list("invalid")).rejects.toThrow("ID");
  await expect(usecase.create("0", 2026)).rejects.toThrow("ID");
  await expect(usecase.update("1", "-1", metadata)).rejects.toThrow("ID");
  expect(repository.list).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.update).not.toHaveBeenCalled();
});
test("集計サービスで帳簿ごとの累計を求め、空の帳簿はゼロ", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([
    { book: { id: "1" }, draftCount: 3, rows: [
      { date: "2026-08-01", accountKey: "grant-income", amount: 1000000, type: "grant" },
      { date: "2026-08-02", accountKey: "taxi", amount: 1200, type: "expense" },
    ], accounts: { taxi: { label: "タクシー", legalLabel: "滞在費" } } },
    { book: { id: "2" }, draftCount: 0, rows: [], accounts: {} },
  ]);
  await expect(usecase.list("1")).resolves.toEqual([
    { id: "1", draftCount: 3, granted: 1000000, spent: 1200 },
    { id: "2", draftCount: 0, granted: 0, spent: 0 },
  ]);
});
