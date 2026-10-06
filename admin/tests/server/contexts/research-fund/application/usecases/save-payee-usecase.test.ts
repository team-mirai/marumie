import { SavePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/save-payee-usecase";

const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: null };
const form = { name: " 東京タクシー ", postalCode: "1000001", address: "東京都千代田区", invoiceRegistrationNumber: "" };
const normalized = { name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: null };
function setup() {
  const repository = { list: jest.fn(), find: jest.fn().mockResolvedValue(payee), create: jest.fn().mockResolvedValue(payee), update: jest.fn().mockResolvedValue(payee) };
  return { repository, usecase: new SavePayeeUsecase(repository) };
}
test("議員の支払先として正規化して作成する", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("5", null, form)).resolves.toEqual(payee);
  expect(repository.create).toHaveBeenCalledWith("5", normalized);
});
test("議員の支払先を編集する", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("5", "7", form)).resolves.toEqual(payee);
  expect(repository.find).toHaveBeenCalledWith("5", "7");
  expect(repository.update).toHaveBeenCalledWith("5", "7", normalized);
});
test("他の議員（他テナント）の支払先は編集できない", async () => {
  const { repository, usecase } = setup();
  repository.find.mockResolvedValue(null);
  await expect(usecase.execute("5", "8", form)).rejects.toThrow("支払先が見つかりません");
  expect(repository.update).not.toHaveBeenCalled();
});
test("入力が不正なら保存しない", async () => {
  const { repository, usecase } = setup();
  await expect(usecase.execute("5", null, { ...form, name: "" })).rejects.toThrow("名称を入力");
  await expect(usecase.execute("5", "7", { ...form, invoiceRegistrationNumber: "123" })).rejects.toThrow("インボイス登録番号");
  expect(repository.create).not.toHaveBeenCalled(); expect(repository.update).not.toHaveBeenCalled();
});
test.each([["0", null], ["5", "abc"]])("ID が不正なら保存しない %s %s", async (politicianId, id) => {
  const { repository, usecase } = setup();
  await expect(usecase.execute(politicianId, id, form)).rejects.toThrow("IDが不正です");
  expect(repository.create).not.toHaveBeenCalled(); expect(repository.update).not.toHaveBeenCalled();
});
