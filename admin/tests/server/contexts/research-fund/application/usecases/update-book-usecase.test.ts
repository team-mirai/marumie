import { UpdateBookUsecase } from "@/server/contexts/research-fund/application/usecases/update-book-usecase";
import type { BookMetadata } from "@/server/contexts/research-fund/domain/models/book";

const metadata = { asOfDate: "2026-08-20", nextUpdateNote: " 11月ごろ ", policyComment: " 方針 " };
function setup() {
  const repository = { list: jest.fn(), create: jest.fn(), update: jest.fn() };
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return { repository, cacheInvalidator, usecase: new UpdateBookUsecase(repository, cacheInvalidator) };
}

test.each(["2026-02-30", "invalid", "2026-13-01"])("実在しない時点 %s は保存しない", async (asOfDate) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("1", "2", { ...metadata, asOfDate })).rejects.toThrow("日付");
  expect(repository.update).not.toHaveBeenCalled();
});

test("メタデータを正規化し、空の日付も保存できる", async () => {
  const { repository, usecase } = setup();
  await usecase.execute("1", "2", metadata);
  expect(repository.update).toHaveBeenCalledWith("1", "2", { ...metadata, nextUpdateNote: "11月ごろ", policyComment: "方針" });
  await usecase.execute("1", "2", { asOfDate: "", nextUpdateNote: "", policyComment: "" });
});

test("上限ちょうどの2000文字の活用方針は前後の空白を落として保存する", async () => {
  const { repository, usecase } = setup();
  await usecase.execute("1", "2", { ...metadata, policyComment: `  ${"あ".repeat(2000)}  ` });
  expect(repository.update).toHaveBeenCalledWith("1", "2", {
    ...metadata,
    nextUpdateNote: "11月ごろ",
    policyComment: "あ".repeat(2000),
  });
});

test("2000文字を超える活用方針は支出群の画面と同じメッセージで弾き、保存もキャッシュの無効化もしない", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(
    usecase.execute("1", "2", { ...metadata, policyComment: "あ".repeat(2001) }),
  ).rejects.toThrow("活用方針は2000文字以内で入力してください");
  expect(repository.update).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test("不正なIDではリポジトリを呼ばない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("1", "-1", metadata)).rejects.toThrow("ID");
  await expect(usecase.execute("x", "2", metadata)).rejects.toThrow("ID");
  expect(repository.update).not.toHaveBeenCalled();
});

test.each([
  null,
  { ...metadata, asOfDate: 20260820 },
  { ...metadata, nextUpdateNote: null },
  { ...metadata, policyComment: false },
])("実行時に型が不正なメタデータは保存しない: %j", async (input) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("1", "2", input as unknown as BookMetadata)).rejects.toThrow(
    "帳簿情報の入力が不正",
  );
  expect(repository.update).not.toHaveBeenCalled();
});

test("帳簿情報を保存したら webapp のキャッシュを無効化する", async () => {
  const { cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("1", "2", metadata)).resolves.toEqual({ cacheWarning: null });
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test("キャッシュの無効化に失敗しても帳簿情報の保存は成功扱いにし、警告を返す", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("refresh failed"));
  await expect(usecase.execute("1", "2", metadata)).resolves.toEqual({
    cacheWarning: "refresh failed",
  });
  expect(repository.update).toHaveBeenCalled();
});

test("Error 以外で失敗したときは共通の既定メッセージを警告として返す", async () => {
  const { cacheInvalidator, usecase } = setup();
  cacheInvalidator.invalidateWebappCache.mockRejectedValue("unknown");
  await expect(usecase.execute("1", "2", metadata)).resolves.toEqual({
    cacheWarning: "ウェブアプリのキャッシュを更新できませんでした",
  });
});

test("帳簿情報の保存に失敗したときはキャッシュを無効化しない", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.execute("1", "2", { ...metadata, asOfDate: "invalid" })).rejects.toThrow("日付");
  repository.update.mockRejectedValue(new Error("帳簿の保存に失敗しました"));
  await expect(usecase.execute("1", "2", metadata)).rejects.toThrow("帳簿の保存に失敗しました");
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});
