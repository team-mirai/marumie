import { ReplaceJournalDocumentUsecase } from "@/server/contexts/research-fund/application/usecases/replace-journal-document-usecase";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

// 書類のある支出（スキャンで作った仕訳）
const owner = { politicianId: "2", userId: "user-1" };
const file = { uploadKey: "uploads/2/user-1/11111111-1111-4111-8111-111111111111", originalFilename: "正式な領収書.pdf" };
const PDF = new TextEncoder().encode("%PDF-1.4\n");

function build(overrides: Parameters<typeof setup>[0] = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  const storage = {
    upload: jest.fn(),
    download: jest.fn().mockResolvedValue({ status: "valid", value: PDF }),
    createSignedUrl: jest.fn(),
    remove: jest.fn(),
    createUploadTarget: jest.fn(),
    claimUpload: jest.fn().mockResolvedValue({ status: "valid", value: "new-key" }),
  };
  return { repository, storage, cacheInvalidator, usecase: new ReplaceJournalDocumentUsecase(repository, storage) };
}

describe("書類を差し替える", () => {
  test.each(["draft", "approved"] as const)("%s の書類のある支出で、置かれた原本を正式なキーへ移して中身を確かめ、書類の原本を入れ替える（キャッシュは無効化しない）", async status => {
    const { repository, storage, cacheInvalidator, usecase } = build({ status });
    await usecase.execute("1", target.id, target.updatedAt, file, owner);
    expect(storage.claimUpload).toHaveBeenCalledWith(file.uploadKey);
    expect(storage.download).toHaveBeenCalledWith("new-key");
    expect(repository.replaceDocument).toHaveBeenCalledWith("1", { ...entry, status }, { storageKey: "new-key", mime: "application/pdf", originalFilename: "正式な領収書.pdf" });
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
  test("仕訳の内容は変えない（保存・確認済にする操作を呼ばない）", async () => {
    const { repository, usecase } = build();
    await usecase.execute("1", target.id, target.updatedAt, file, owner);
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.approveMany).not.toHaveBeenCalled();
    expect(repository.attachDocument).not.toHaveBeenCalled();
  });
  test("差し替えたら、使われなくなった前の原本と公開用の版を消す", async () => {
    const { storage, usecase } = build();
    await usecase.execute("1", target.id, target.updatedAt, file, owner);
    expect(storage.remove.mock.calls).toEqual([["old-key"], ["old-masked-key"]]);
  });
  test("前の公開用の版が無ければ、前の原本だけを消す", async () => {
    const { repository, storage, usecase } = build();
    repository.replaceDocument.mockResolvedValue({ storageKey: "old-key", maskedKey: null });
    await usecase.execute("1", target.id, target.updatedAt, file, owner);
    expect(storage.remove.mock.calls).toEqual([["old-key"]]);
  });
  test("前のファイルを消せなくても差し替えは成功にする", async () => {
    const { storage, usecase } = build();
    storage.remove.mockRejectedValue(new Error("削除失敗"));
    await expect(usecase.execute("1", target.id, target.updatedAt, file, owner)).resolves.toBeUndefined();
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });
  test("精算済の立替でも差し替えられる（金額は変わらない）", async () => {
    const { repository, usecase } = build({ status: "approved", advancedBy: "秘書A", settledAt: "2026-09-01" });
    await usecase.execute("1", target.id, target.updatedAt, file, owner);
    expect(repository.replaceDocument).toHaveBeenCalled();
  });
});

describe("書類を差し替えない", () => {
  test.each([
    ["公開中の仕訳", { status: "published" as const }, "公開中の仕訳の書類は差し替えられません"],
    ["書類の無い仕訳", { source: "manual" as const, documentId: null }, "書類の無い仕訳です"],
    ["支給", { ...grant, id: entry.id, updatedAt: entry.updatedAt }, "支給には書類がありません"],
  ])("%s では差し替えず、原本も移さない", async (_, overrides, message) => {
    const { repository, storage, usecase } = build(overrides);
    await expect(usecase.execute("1", target.id, target.updatedAt, file, owner)).rejects.toThrow(message);
    expect(storage.claimUpload).not.toHaveBeenCalled();
    expect(repository.replaceDocument).not.toHaveBeenCalled();
  });
  test.each([
    ["他の議員室の原本（正式なキー）", { ...file, uploadKey: "11111111-1111-4111-8111-111111111111" }, "アップロードした書類を確認できませんでした"],
    ["別のユーザーに発行されたキー", { ...file, uploadKey: "uploads/2/user-9/11111111-1111-4111-8111-111111111111" }, "アップロードした書類を確認できませんでした"],
    ["空のファイル名", { ...file, originalFilename: " " }, "元ファイル名"],
  ])("%s は仕訳を取得する前に拒否する", async (_, invalid, message) => {
    const { repository, storage, usecase } = build();
    await expect(usecase.execute("1", target.id, target.updatedAt, invalid, owner)).rejects.toThrow(message);
    expect(repository.find).not.toHaveBeenCalled();
    expect(storage.claimUpload).not.toHaveBeenCalled();
  });
  test("別の操作で更新された仕訳では差し替えない", async () => {
    const { repository, storage, usecase } = build();
    await expect(usecase.execute("1", target.id, "2026-08-02T00:00:00.000Z", file, owner)).rejects.toThrow("別の操作で更新されました");
    expect(storage.claimUpload).not.toHaveBeenCalled();
    expect(repository.replaceDocument).not.toHaveBeenCalled();
  });
  test("中身が JPEG・PNG・PDF でなければ、移した原本を消して差し替えない（新規登録と同じ基準）", async () => {
    const { repository, storage, usecase } = build();
    storage.download.mockResolvedValue({ status: "valid", value: new TextEncoder().encode("<html>") });
    await expect(usecase.execute("1", target.id, target.updatedAt, file, owner)).rejects.toThrow("ファイルの中身が対応する形式ではありません");
    expect(storage.remove).toHaveBeenCalledWith("new-key");
    expect(repository.replaceDocument).not.toHaveBeenCalled();
  });
  test("差し替えに失敗したら（同じ書類の別の仕訳が公開中など）、アップロードした原本を消し、前のファイルは消さない", async () => {
    const { repository, storage, usecase } = build();
    repository.replaceDocument.mockRejectedValue(new Error("公開中の仕訳にも紐づいている"));
    await expect(usecase.execute("1", target.id, target.updatedAt, file, owner)).rejects.toThrow("公開中の仕訳にも紐づいている");
    expect(storage.remove.mock.calls).toEqual([["new-key"]]);
  });
  test("原本の削除にも失敗したら、両方の失敗をまとめて投げる", async () => {
    const { repository, storage, usecase } = build();
    repository.replaceDocument.mockRejectedValue(new Error("競合"));
    storage.remove.mockRejectedValue(new Error("削除失敗"));
    await expect(usecase.execute("1", target.id, target.updatedAt, file, owner)).rejects.toThrow("書類の差し替えとアップロード済み原本の削除に失敗しました");
  });
});
