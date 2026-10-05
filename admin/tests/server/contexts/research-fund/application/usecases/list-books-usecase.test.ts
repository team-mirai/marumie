import { ListBooksUsecase } from "@/server/contexts/research-fund/application/usecases/list-books-usecase";

function setup() {
  const repository = { list: jest.fn(), create: jest.fn(), update: jest.fn() };
  return { repository, usecase: new ListBooksUsecase(repository) };
}

test("不正なIDではリポジトリを呼ばない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("invalid")).rejects.toThrow("ID");
  expect(repository.list).not.toHaveBeenCalled();
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
  await expect(usecase.execute("1")).resolves.toEqual([
    { id: "1", draftCount: 3, granted: 1000000, spent: 1200 },
    { id: "2", draftCount: 0, granted: 0, spent: 0 },
  ]);
});

test("集計できない金額があれば誤った累計を返さずエラーを伝える", async () => {
  const { repository, usecase } = setup();
  repository.list.mockResolvedValue([
    {
      book: { id: "1" },
      draftCount: 0,
      rows: [{ date: "2026-08-01", accountKey: "grant-income", amount: -1, type: "grant" }],
      accounts: {},
    },
  ]);
  await expect(usecase.execute("1")).rejects.toThrow("金額は安全な範囲の0以上の整数円");
});
