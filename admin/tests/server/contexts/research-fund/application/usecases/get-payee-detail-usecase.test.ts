import { GetPayeeDetailUsecase } from "@/server/contexts/research-fund/application/usecases/get-payee-detail-usecase";

const payee = { id: "7", politicianId: "5", name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
const entry = { id: "11", entryDate: "2026-05-01", description: "タクシー代", amount: 1200, status: "approved" as const };
const alias = { id: "3", name: "東京ﾀｸｼｰ", source: "rule" as const, document: { id: "21", originalFilename: "receipt.jpg" }, createdAt: "2026-05-01T00:00:00.000Z", sharedWith: [] };
function setup() {
  return { listJournalEntries: jest.fn().mockResolvedValue([entry]), list: jest.fn(), find: jest.fn().mockResolvedValue(payee), create: jest.fn(), update: jest.fn(), listAliases: jest.fn().mockResolvedValue([alias]), deleteAlias: jest.fn() };
}
test("議員の支払先と、帳簿でその支払先に紐づいた仕訳と、支払先に記録された表記を返す", async () => {
  const repository = setup();
  await expect(new GetPayeeDetailUsecase(repository).execute("5", "1", "7")).resolves.toEqual({ payee, entries: [entry], aliases: [alias] });
  expect(repository.find).toHaveBeenCalledWith("5", "7");
  expect(repository.listJournalEntries).toHaveBeenCalledWith("5", "7", "1");
  expect(repository.listAliases).toHaveBeenCalledWith("5", "7");
});
test("別の議員の支払先・存在しない支払先なら null を返し、仕訳を取得しない", async () => {
  const repository = setup();
  repository.find.mockResolvedValue(null);
  await expect(new GetPayeeDetailUsecase(repository).execute("6", "1", "7")).resolves.toBeNull();
  expect(repository.listJournalEntries).not.toHaveBeenCalled();
});
test.each([["0", "1", "7"], ["5", "x", "7"], ["5", "1", "07"], ["5", "1", "abc"]])("不正な ID（%s, %s, %s）なら取得せずに null を返す", async (politicianId, bookId, id) => {
  const repository = setup();
  await expect(new GetPayeeDetailUsecase(repository).execute(politicianId, bookId, id)).resolves.toBeNull();
  expect(repository.find).not.toHaveBeenCalled();
});
