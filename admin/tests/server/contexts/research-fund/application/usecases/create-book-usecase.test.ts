import { CreateBookUsecase } from "@/server/contexts/research-fund/application/usecases/create-book-usecase";

function setup() {
  const repository = { list: jest.fn(), create: jest.fn(), update: jest.fn() };
  return { repository, usecase: new CreateBookUsecase(repository) };
}

test.each([0, 1899, 10000, 2026.5, NaN])("不正な年度 %s は保存しない", async (year) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("1", year)).rejects.toThrow("年度");
  expect(repository.create).not.toHaveBeenCalled();
});

test("議員と年度を指定して作成し、重複エラーを伝える", async () => {
  const { repository, usecase } = setup();
  await usecase.execute("1", 2026);
  expect(repository.create).toHaveBeenCalledWith("1", 2026);
  repository.create.mockRejectedValue(new Error("既に存在"));
  await expect(usecase.execute("1", 2026)).rejects.toThrow("既に存在");
});

test("不正なIDではリポジトリを呼ばない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("0", 2026)).rejects.toThrow("ID");
  expect(repository.create).not.toHaveBeenCalled();
});
