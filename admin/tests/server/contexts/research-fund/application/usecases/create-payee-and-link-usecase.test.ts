import { CreatePayeeAndLinkUsecase } from "@/server/contexts/research-fund/application/usecases/create-payee-and-link-usecase";
import { JournalReviewError, type ReviewEntry } from "@/server/contexts/research-fund/domain/models/journal-review";
import { entry, grant, setup, target } from "./journal-review-test-helpers";

// 帳簿（"1"）の議員は "5"（setup の politicianId）
const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
const form = { name: " 東京タクシー ", postalCode: "", address: "", invoiceRegistrationNumber: "" };
function setupUsecase(overrides: Partial<ReviewEntry> = {}) {
  const { repository } = setup(overrides);
  repository.createPayeeAndSetPayee.mockResolvedValue(payee);
  return { repository, usecase: new CreatePayeeAndLinkUsecase(repository) };
}

describe("支払先を作成して紐づける", () => {
  test("帳簿の議員の支払先として作成し、作成した支払先を同じ操作で紐づける", async () => {
    const { repository, usecase } = setupUsecase();
    await expect(usecase.execute("1", [target], form)).resolves.toEqual({ updated: 1, payee });
    expect(repository.createPayeeAndSetPayee).toHaveBeenCalledWith("1", [entry], "5", { name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null });
  });
  test("入力が不正なら作成しない", async () => {
    const { repository, usecase } = setupUsecase();
    await expect(usecase.execute("1", [target], { ...form, postalCode: "123" })).rejects.toThrow("郵便番号");
    expect(repository.createPayeeAndSetPayee).not.toHaveBeenCalled();
  });
  test("紐づけられない仕訳が混ざっていたら支払先も作らない", async () => {
    const { repository, usecase } = setupUsecase({ ...grant, settledAt: null, advancedBy: null });
    await expect(usecase.execute("1", [target], form)).rejects.toThrow("支給・返還");
    expect(repository.createPayeeAndSetPayee).not.toHaveBeenCalled();
  });
  test("同じ名称・住所の支払先があれば、その理由を伝える", async () => {
    const { repository, usecase } = setupUsecase();
    repository.createPayeeAndSetPayee.mockRejectedValue(new JournalReviewError("同じ名称・住所の支払先がすでに登録されています"));
    await expect(usecase.execute("1", [target], form)).rejects.toThrow("すでに登録されています");
  });
});
test("帳簿が無ければ支払先を作らない", async () => {
  const { repository, usecase } = setupUsecase();
  repository.politicianId.mockResolvedValue(null);
  await expect(usecase.execute("1", [target], form)).rejects.toThrow("帳簿が見つかりません");
  expect(repository.createPayeeAndSetPayee).not.toHaveBeenCalled();
});
