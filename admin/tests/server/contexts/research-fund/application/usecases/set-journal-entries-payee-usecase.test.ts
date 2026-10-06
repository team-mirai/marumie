import { SetJournalEntriesPayeeUsecase } from "@/server/contexts/research-fund/application/usecases/set-journal-entries-payee-usecase";
import type { ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

// 帳簿（"1"）の議員は "5"（setup の politicianId）
const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository, cacheInvalidator } = setup(overrides);
  const payeeRepository = { list: jest.fn(), find: jest.fn().mockResolvedValue(payee), create: jest.fn().mockResolvedValue(payee), update: jest.fn() };
  return { repository, payeeRepository, cacheInvalidator, usecase: new SetJournalEntriesPayeeUsecase(repository, payeeRepository) };
}

describe("既存の支払先を紐づける", () => {
  test.each(["draft", "approved", "published"] as const)("%s の支出に支払先を紐づけられる（公開中も変更でき、キャッシュは無効化しない）", async status => {
    const { repository, payeeRepository, cacheInvalidator, usecase } = setupUsecase({ status });
    await expect(usecase.execute("1", [target], "7")).resolves.toEqual({ updated: 1, payee });
    expect(payeeRepository.find).toHaveBeenCalledWith("5", "7");
    expect(repository.setPayee).toHaveBeenCalledWith("1", [{ ...entry, status }], "7");
    expect(cacheInvalidator.invalidateWebappCache).not.toHaveBeenCalled();
  });
  test("精算済の立替にも紐づけられる（金額は変わらない）", async () => {
    const { repository, usecase } = setupUsecase({ status: "approved", advancedBy: "秘書A", settledAt: "2026-09-01" });
    await expect(usecase.execute("1", [target], "7")).resolves.toMatchObject({ updated: 1 });
    expect(repository.setPayee).toHaveBeenCalled();
  });
  test("同じ書類の仕訳をまとめて送れば、まとめて同じ支払先に紐づける", async () => {
    const { repository, usecase } = setupUsecase();
    const sibling = { ...entry, id: "3" };
    repository.findMany.mockResolvedValue([entry, sibling]);
    await expect(usecase.execute("1", [target, { id: "3", updatedAt: entry.updatedAt }], "7")).resolves.toMatchObject({ updated: 2 });
    expect(repository.setPayee).toHaveBeenCalledWith("1", [entry, sibling], "7");
  });
  test("null を送ると紐づけを外す", async () => {
    const { repository, payeeRepository, usecase } = setupUsecase({ payeeId: "7", payeeLinkSource: "manual" });
    await expect(usecase.execute("1", [target], null)).resolves.toEqual({ updated: 1, payee: null });
    expect(payeeRepository.find).not.toHaveBeenCalled();
    expect(repository.setPayee).toHaveBeenCalledWith("1", [{ ...entry, payeeId: "7", payeeLinkSource: "manual" }], null);
  });
  test("他の議員（他テナント）の支払先は見つからない扱いにして紐づけない", async () => {
    const { repository, payeeRepository, usecase } = setupUsecase();
    payeeRepository.find.mockResolvedValue(null);
    await expect(usecase.execute("1", [target], "8")).rejects.toThrow("支払先が見つかりません");
    expect(payeeRepository.find).toHaveBeenCalledWith("5", "8");
    expect(repository.setPayee).not.toHaveBeenCalled();
  });
  test("リポジトリが別の議員の支払先を返しても紐づけない", async () => {
    const { repository, payeeRepository, usecase } = setupUsecase();
    payeeRepository.find.mockResolvedValue({ ...payee, politicianId: "6" });
    await expect(usecase.execute("1", [target], "7")).rejects.toThrow("支払先が見つかりません");
    expect(repository.setPayee).not.toHaveBeenCalled();
  });
  test.each(["0", "abc", "-1", ""])("支払先IDが不正なら取得しない %s", async id => {
    const { repository, payeeRepository, usecase } = setupUsecase();
    await expect(usecase.execute("1", [target], id)).rejects.toThrow("支払先IDが不正です");
    expect(payeeRepository.find).not.toHaveBeenCalled(); expect(repository.setPayee).not.toHaveBeenCalled();
  });
  test("帳簿が無ければ紐づけない", async () => {
    const { repository, usecase } = setupUsecase();
    repository.politicianId.mockResolvedValue(null);
    await expect(usecase.execute("1", [target], "7")).rejects.toThrow("帳簿が見つかりません");
    expect(repository.setPayee).not.toHaveBeenCalled();
  });
  test("支給には紐づけない", async () => {
    const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
    await expect(usecase.execute("1", [target], "7")).rejects.toThrow("支給・返還");
    expect(repository.setPayee).not.toHaveBeenCalled();
  });
  test("同時更新された仕訳が混ざっていたら1件も変更しない", async () => {
    const { repository, usecase } = setupUsecase({ updatedAt: "2026-09-01T00:00:00.000Z" });
    await expect(usecase.execute("1", [target], "7")).rejects.toThrow("別の操作で更新されました");
    expect(repository.setPayee).not.toHaveBeenCalled();
  });
});
