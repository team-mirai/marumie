import { SetReceiptAbsentUsecase } from "@/server/contexts/research-fund/application/usecases/set-receipt-absent-usecase";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

describe("徴難を付ける・外す", () => {
  test.each(["draft", "approved", "published"] as const)("%s の書類のある支出に付けられる（公開中も変更でき、キャッシュは無効化しない）", async status => {
    const { repository, cacheInvalidator } = setup({ status });
    await expect(new SetReceiptAbsentUsecase(repository).execute("1", target.id, target.updatedAt, true)).resolves.toEqual({ receiptAbsent: true });
    expect(repository.setReceiptAbsent).toHaveBeenCalledWith("1", { ...entry, status }, true);
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
  test("書類の無い支出にも付けられる", async () => {
    const { repository } = setup({ source: "manual", documentId: null });
    await new SetReceiptAbsentUsecase(repository).execute("1", target.id, target.updatedAt, true);
    expect(repository.setReceiptAbsent).toHaveBeenCalledWith("1", expect.objectContaining({ documentId: null }), true);
  });
  test("精算済の立替でも外せる", async () => {
    const { repository } = setup({ status: "published", advancedBy: "秘書A", settledAt: "2026-09-01", receiptAbsent: true, receiptAbsenceReason: "自動券売機で購入" });
    await expect(new SetReceiptAbsentUsecase(repository).execute("1", target.id, target.updatedAt, false)).resolves.toEqual({ receiptAbsent: false });
    expect(repository.setReceiptAbsent).toHaveBeenCalledWith("1", expect.objectContaining({ id: entry.id }), false);
  });
});

describe("徴難を付けられない", () => {
  test("支給は徴難にできない", async () => {
    const { repository } = setup({ ...grant, id: entry.id, updatedAt: entry.updatedAt });
    await expect(new SetReceiptAbsentUsecase(repository).execute("1", target.id, target.updatedAt, true)).rejects.toThrow("支給は徴難にできません");
    expect(repository.setReceiptAbsent).not.toHaveBeenCalled();
  });
  test("別の操作で更新された仕訳は変更しない", async () => {
    const { repository } = setup();
    await expect(new SetReceiptAbsentUsecase(repository).execute("1", target.id, "2026-08-02T00:00:00.000Z", true)).rejects.toThrow("別の操作で更新されました");
    expect(repository.setReceiptAbsent).not.toHaveBeenCalled();
  });
});
