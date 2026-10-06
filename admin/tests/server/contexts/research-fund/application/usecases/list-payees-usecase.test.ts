import { ListPayeesUsecase } from "@/server/contexts/research-fund/application/usecases/list-payees-usecase";

const base = { politicianId: "5", postalCode: null, address: "", invoiceRegistrationNumber: null, usageCount: 0 };
test("議員の支払先を名称順で返す", async () => {
  const repository = { list: jest.fn().mockResolvedValue([{ ...base, id: "1", name: "東京タクシー" }, { ...base, id: "2", name: "JR東日本" }]), find: jest.fn(), create: jest.fn(), update: jest.fn() };
  const payees = await new ListPayeesUsecase(repository).execute("5");
  expect(repository.list).toHaveBeenCalledWith("5");
  expect(payees.map(p => p.id)).toEqual(["2", "1"]);
});
test("議員IDが不正なら取得しない", async () => {
  const repository = { list: jest.fn(), find: jest.fn(), create: jest.fn(), update: jest.fn() };
  await expect(new ListPayeesUsecase(repository).execute("0")).rejects.toThrow("議員IDが不正です");
  expect(repository.list).not.toHaveBeenCalled();
});
