import { PublishJournalEntriesUsecase } from "@/server/contexts/research-fund/application/usecases/publish-journal-entries-usecase";
import type { PublishableEntry } from "@/server/contexts/research-fund/domain/models/publication";

const approved: PublishableEntry[] = [
  { id: "1", status: "approved", entryDate: "2026-08-13" },
  { id: "2", status: "approved", entryDate: "2026-07-01" },
];

function setup(
  overrides: { entries?: PublishableEntry[] | null; publishedThrough?: string | null } = {},
) {
  const repository = {
    snapshot: jest.fn().mockResolvedValue({
      published: [],
      candidates: [],
      accounts: {},
      publishedThrough: null,
    }),
    pending: jest
      .fn()
      .mockResolvedValue(
        overrides.entries === null
          ? null
          : {
              entries: overrides.entries ?? approved,
              publishedThrough: overrides.publishedThrough ?? null,
            },
      ),
    publish: jest.fn().mockResolvedValue(undefined),
  };
  const cacheInvalidator = { invalidateWebappCache: jest.fn().mockResolvedValue(undefined) };
  return {
    repository,
    cacheInvalidator,
    usecase: new PublishJournalEntriesUsecase(repository, cacheInvalidator),
  };
}

test("確認済の仕訳を公開し、公開範囲を最新月末まで進めてwebappのキャッシュを無効化する", async () => {
  const { repository, cacheInvalidator, usecase } = setup();
  await expect(usecase.publish("1", ["1", "2"])).resolves.toEqual({
    count: 2,
    publishedThrough: "2026-08-31",
    cacheWarning: null,
  });
  expect(repository.publish).toHaveBeenCalledWith("1", ["1", "2"], "2026-08-31");
  expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalledTimes(1);
});

test("下書きが混ざっていたら公開せず、キャッシュにも触らない", async () => {
  const { repository, cacheInvalidator, usecase } = setup({
    entries: [approved[0], { id: "2", status: "draft", entryDate: "2026-07-01" }],
  });
  await expect(usecase.publish("1", ["1", "2"])).rejects.toThrow("確認済の仕訳だけを公開できます");
  expect(repository.publish).not.toHaveBeenCalled();
  expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
});

test("公開済みの再公開も拒否する", async () => {
  const { repository, usecase } = setup({
    entries: [{ id: "1", status: "published", entryDate: "2026-08-13" }],
  });
  await expect(usecase.publish("1", ["1"])).rejects.toThrow("確認済の仕訳だけを公開できます");
  expect(repository.publish).not.toHaveBeenCalled();
});

test("未選択・不正なID・見つからない仕訳・帳簿なしは公開しない", async () => {
  const empty = setup();
  await expect(empty.usecase.publish("1", [])).rejects.toThrow("公開する仕訳を選んでください");
  await expect(empty.usecase.publish("1", ["0"])).rejects.toThrow("仕訳IDが不正です");
  await expect(empty.usecase.publish("1", ["1; drop"])).rejects.toThrow("仕訳IDが不正です");
  expect(empty.repository.publish).not.toHaveBeenCalled();
  const missing = setup({ entries: [approved[0]] });
  await expect(missing.usecase.publish("1", ["1", "2"])).rejects.toThrow("選んだ仕訳が見つかりません");
  const noBook = setup({ entries: null });
  await expect(noBook.usecase.publish("1", ["1"])).rejects.toThrow("帳簿が見つかりません");
});

test("重複したIDは1件として扱う", async () => {
  const { repository, usecase } = setup({ entries: [approved[0]] });
  await expect(usecase.publish("1", ["1", "1"])).resolves.toMatchObject({ count: 1 });
  expect(repository.pending).toHaveBeenCalledWith("1", ["1"]);
  expect(repository.publish).toHaveBeenCalledWith("1", ["1"], "2026-08-31");
});

test("公開は確定済みなので、キャッシュ無効化の失敗は警告として返す", async () => {
  const { cacheInvalidator, usecase } = setup({ entries: [approved[0]] });
  cacheInvalidator.invalidateWebappCache.mockRejectedValue(new Error("接続に失敗しました"));
  await expect(usecase.publish("1", ["1"])).resolves.toMatchObject({
    count: 1,
    cacheWarning: "接続に失敗しました",
  });
});

test("帳簿が無ければスナップショットを返さない", async () => {
  const { repository, usecase } = setup();
  repository.snapshot.mockResolvedValue(null);
  await expect(usecase.snapshot("1")).rejects.toThrow("帳簿が見つかりません");
});
