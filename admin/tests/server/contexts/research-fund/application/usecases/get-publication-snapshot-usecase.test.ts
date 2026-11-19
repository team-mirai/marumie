import { GetPublicationSnapshotUsecase } from "@/server/contexts/research-fund/application/usecases/get-publication-snapshot-usecase";

function setup() {
  const repository = { snapshot: jest.fn(), pending: jest.fn(), publish: jest.fn() };
  return { repository, usecase: new GetPublicationSnapshotUsecase(repository) };
}

test("帳簿のスナップショットを返す", async () => {
  const { repository, usecase } = setup();
  const snapshot = { published: [], candidates: [], accounts: {}, publishedThrough: null };
  repository.snapshot.mockResolvedValue(snapshot);
  await expect(usecase.execute("1")).resolves.toBe(snapshot);
  expect(repository.snapshot).toHaveBeenCalledWith("1");
});

test("帳簿が無ければスナップショットを返さない", async () => {
  const { repository, usecase } = setup();
  repository.snapshot.mockResolvedValue(null);
  await expect(usecase.execute("1")).rejects.toThrow("帳簿が見つかりません");
});
