import { ListJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/list-journal-review-usecase";
import { entry, setup } from "./journal-review-test-helpers";
const payee = { id: "7", politicianId: "5", postalCode: null, address: "", invoiceRegistrationNumber: null, usageCount: 0 };
function setupUsecase() {
  const { repository } = setup();
  const payeeRepository = { listJournalEntries: jest.fn(), list: jest.fn().mockResolvedValue([{ ...payee, name: "東京タクシー" }, { ...payee, id: "8", name: "JR東日本" }]), find: jest.fn(), create: jest.fn(), update: jest.fn(), listAliases: jest.fn(), deleteAlias: jest.fn() };
  const duplicateDocumentRepository = { listScannedDocuments: jest.fn().mockResolvedValue([]) };
  return { repository, payeeRepository, duplicateDocumentRepository, usecase: new ListJournalReviewUsecase(repository, payeeRepository, duplicateDocumentRepository) };
}
test("一覧には費用科目だけを渡す", async () => {
  const { usecase } = setupUsecase();
  const data = await usecase.execute("1");
  expect(data.entries).toEqual([entry]); expect(data.accounts.map(a => a.key)).toEqual(["taxi", "needs-review"]); expect(data.advancers).toEqual(["秘書A"]);
});
test("支払先の候補は帳簿の議員の支払先だけを名称順で渡す", async () => {
  const { repository, payeeRepository, usecase } = setupUsecase();
  const data = await usecase.execute("1");
  expect(repository.politicianId).toHaveBeenCalledWith("1");
  expect(payeeRepository.list).toHaveBeenCalledWith("5", "1");
  expect(data.payees.map(p => p.name)).toEqual(["JR東日本", "東京タクシー"]);
});
test("帳簿が無ければ支払先の候補を渡さない", async () => {
  const { repository, payeeRepository, usecase } = setupUsecase();
  repository.politicianId.mockResolvedValue(null);
  await expect(usecase.execute("1")).resolves.toMatchObject({ payees: [] });
  expect(payeeRepository.list).not.toHaveBeenCalled();
});
test("同じ書類を二重にスキャンした可能性のある書類を、書類ごとに渡す", async () => {
  const { duplicateDocumentRepository, usecase } = setupUsecase();
  const receipt = { date: "2026-09-01", issuer: null, items: [{ item: "タクシー代", amount: 1200, category_key: "transportation" }] };
  duplicateDocumentRepository.listScannedDocuments.mockResolvedValue([
    { documentId: "3", originalFilename: "a.jpg", rawJson: receipt, payeeIds: [] },
    { documentId: "4", originalFilename: "b.jpg", rawJson: receipt, payeeIds: [] },
  ]);
  const data = await usecase.execute("1");
  expect(duplicateDocumentRepository.listScannedDocuments).toHaveBeenCalledWith("1");
  expect(Object.keys(data.duplicates)).toEqual(["3", "4"]);
  expect(data.duplicates["3"]).toEqual([{ documentId: "4", originalFilename: "b.jpg", date: "2026-09-01", totalAmount: 1200 }]);
});
