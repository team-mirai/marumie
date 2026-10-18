import { AttachJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/attach-journal-document-usecase";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

// 書類の無い支出（手動で作った仕訳）
const noDocument = { source: "manual" as const, documentId: null };
const file = { bytes: new Uint8Array([1, 2, 3]), mime: "application/pdf", originalFilename: "領収書.pdf" };

function build(overrides: Parameters<typeof setup>[0] = noDocument) {
  const { repository, cacheInvalidator } = setup(overrides);
  const storage = { upload: jest.fn().mockResolvedValue({ status: "valid", value: "opaque-key" }), download: jest.fn(), createSignedUrl: jest.fn(), remove: jest.fn() };
  return { repository, storage, cacheInvalidator, usecase: new AttachJournalDocumentUsecase(repository, storage) };
}

describe("領収書を紐づける", () => {
  test.each(["draft", "approved"] as const)("%s の書類の無い支出に紐づけ、原本を保存してから書類として登録する（キャッシュは無効化しない）", async status => {
    const { repository, storage, cacheInvalidator, usecase } = build({ ...noDocument, status });
    await usecase.execute("1", target.id, target.updatedAt, file);
    expect(storage.upload).toHaveBeenCalledWith(file.bytes, "application/pdf");
    expect(repository.attachDocument).toHaveBeenCalledWith("1", { ...entry, ...noDocument, status }, { storageKey: "opaque-key", mime: "application/pdf", originalFilename: "領収書.pdf" });
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
  test("徴難で事情が入力済みでも紐づけられる（徴難と事情はそのまま残る）", async () => {
    const { repository, usecase } = build({ ...noDocument, receiptAbsent: true, receiptAbsenceReason: "自動券売機で購入" });
    await usecase.execute("1", target.id, target.updatedAt, file);
    expect(repository.attachDocument).toHaveBeenCalled();
  });
  test("精算済の立替にも紐づけられる（金額は変わらない）", async () => {
    const { repository, usecase } = build({ ...noDocument, status: "approved", advancedBy: "秘書A", settledAt: "2026-09-01" });
    await usecase.execute("1", target.id, target.updatedAt, file);
    expect(repository.attachDocument).toHaveBeenCalled();
  });
});

describe("領収書を紐づけない", () => {
  test.each([
    ["公開中の仕訳（紐づけると即座に公開されてしまう）", { ...noDocument, status: "published" as const }, "公開中の仕訳には領収書を紐づけられません"],
    ["すでに書類のある仕訳", { documentId: "3" }, "すでに書類のある仕訳には領収書を紐づけられません"],
    ["支給", { ...grant, id: entry.id, updatedAt: entry.updatedAt }, "支給には領収書を紐づけられません"],
  ])("%s には紐づけず、原本もアップロードしない", async (_, overrides, message) => {
    const { repository, storage, usecase } = build(overrides);
    await expect(usecase.execute("1", target.id, target.updatedAt, file)).rejects.toThrow(message);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.attachDocument).not.toHaveBeenCalled();
  });
  test.each([
    ["対応していない形式", { ...file, mime: "text/plain" }, "JPEG・PNG・PDF"],
    ["空のファイル", { ...file, bytes: new Uint8Array() }, "JPEG・PNG・PDF"],
    ["空のファイル名", { ...file, originalFilename: " " }, "元ファイル名"],
  ])("%s は仕訳を取得する前に拒否する", async (_, invalid, message) => {
    const { repository, storage, usecase } = build();
    await expect(usecase.execute("1", target.id, target.updatedAt, invalid)).rejects.toThrow(message);
    expect(repository.find).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
  test("別の操作で更新された仕訳には紐づけない", async () => {
    const { repository, storage, usecase } = build();
    await expect(usecase.execute("1", target.id, "2026-08-02T00:00:00.000Z", file)).rejects.toThrow("別の操作で更新されました");
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.attachDocument).not.toHaveBeenCalled();
  });
  test("紐づけに失敗したら、アップロードした原本を消す", async () => {
    const { repository, storage, usecase } = build();
    repository.attachDocument.mockRejectedValue(new Error("競合"));
    await expect(usecase.execute("1", target.id, target.updatedAt, file)).rejects.toThrow("競合");
    expect(storage.remove).toHaveBeenCalledWith("opaque-key");
  });
  test("原本の削除にも失敗したら、両方の失敗をまとめて投げる", async () => {
    const { repository, storage, usecase } = build();
    repository.attachDocument.mockRejectedValue(new Error("競合"));
    storage.remove.mockRejectedValue(new Error("削除失敗"));
    await expect(usecase.execute("1", target.id, target.updatedAt, file)).rejects.toThrow("領収書の紐づけとアップロード済み原本の削除に失敗しました");
  });
  test("原本のアップロードに失敗したら紐づけない", async () => {
    const { repository, storage, usecase } = build();
    storage.upload.mockResolvedValue({ status: "invalid", errors: [{ field: "document", code: "INVALID_DOCUMENT", message: "アップロードに失敗しました" }] });
    await expect(usecase.execute("1", target.id, target.updatedAt, file)).rejects.toThrow("アップロードに失敗しました");
    expect(repository.attachDocument).not.toHaveBeenCalled();
  });
});
