import { SetReceiptAbsenceReasonUsecase } from "@/server/contexts/research-fund/application/usecases/set-receipt-absence-reason-usecase";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

// 書類の無い支出（手動で作った仕訳）
const noDocument = { source: "manual" as const, documentId: null };

describe("徴し難かった事情を書く", () => {
  test.each(["draft", "approved", "published"] as const)("%s の書類の無い支出に書ける（公開中も変更でき、キャッシュは無効化しない）", async status => {
    const { repository, cacheInvalidator } = setup({ ...noDocument, status });
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "　自動券売機で購入したため ")).resolves.toEqual({ receiptAbsenceReason: "自動券売機で購入したため" });
    expect(repository.setReceiptAbsenceReason).toHaveBeenCalledWith("1", { ...entry, ...noDocument, status }, "自動券売機で購入したため");
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
  test("精算済の立替にも書ける", async () => {
    const { repository } = setup({ ...noDocument, status: "approved", advancedBy: "秘書A", settledAt: "2026-09-01" });
    await new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "自動券売機で購入");
    expect(repository.setReceiptAbsenceReason).toHaveBeenCalled();
  });
  test("空欄で保存すると事情を削除する", async () => {
    const { repository } = setup({ ...noDocument, receiptAbsenceReason: "自動券売機で購入" });
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "　")).resolves.toEqual({ receiptAbsenceReason: null });
    expect(repository.setReceiptAbsenceReason).toHaveBeenCalledWith("1", expect.objectContaining({ id: entry.id }), null);
  });
});

describe("徴し難かった事情を書けない", () => {
  test("書類のある仕訳には書けない（書類と事情が同時に残る状態を作らない）", async () => {
    const { repository } = setup({ documentId: "3" });
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "自動券売機で購入")).rejects.toThrow("書類のある仕訳には徴し難かった事情を書けません");
    expect(repository.setReceiptAbsenceReason).not.toHaveBeenCalled();
  });
  test("支給には書けない", async () => {
    const { repository } = setup({ ...grant, id: entry.id, updatedAt: entry.updatedAt });
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "自動券売機で購入")).rejects.toThrow("支給には徴し難かった事情を書けません");
    expect(repository.setReceiptAbsenceReason).not.toHaveBeenCalled();
  });
  test("長すぎる事情は仕訳を取得する前に拒否する", async () => {
    const { repository } = setup(noDocument);
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "あ".repeat(501))).rejects.toThrow("500文字以内");
    expect(repository.find).not.toHaveBeenCalled();
  });
  test("別の操作で更新された仕訳は変更しない", async () => {
    const { repository } = setup(noDocument);
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, "2026-08-02T00:00:00.000Z", "自動券売機で購入")).rejects.toThrow("別の操作で更新されました");
    expect(repository.setReceiptAbsenceReason).not.toHaveBeenCalled();
  });
  test("見つからない仕訳は変更しない", async () => {
    const { repository } = setup(noDocument);
    repository.find.mockResolvedValue(null);
    await expect(new SetReceiptAbsenceReasonUsecase(repository).execute("1", target.id, target.updatedAt, "自動券売機で購入")).rejects.toThrow("仕訳が見つかりません");
  });
});
