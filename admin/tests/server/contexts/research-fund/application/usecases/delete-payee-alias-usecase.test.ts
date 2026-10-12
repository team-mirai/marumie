import { DeletePayeeAliasUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-alias-usecase";
import { PayeeError } from "@/server/contexts/research-fund/domain/models/payee";

function setup(deleted: boolean) {
  return { listJournalEntries: jest.fn(), list: jest.fn(), find: jest.fn(), create: jest.fn(), update: jest.fn(), listAliases: jest.fn(), deleteAlias: jest.fn().mockResolvedValue(deleted), deletionImpact: jest.fn(), delete: jest.fn() };
}
test("議員の支払先の表記を削除する", async () => {
  const repository = setup(true);
  await expect(new DeletePayeeAliasUsecase(repository).execute("5", "7", "3")).resolves.toBeUndefined();
  expect(repository.deleteAlias).toHaveBeenCalledWith("5", "7", "3");
});
test("別の議員・別の支払先の表記・存在しない表記なら見つからないとして拒否する", async () => {
  await expect(new DeletePayeeAliasUsecase(setup(false)).execute("5", "7", "3")).rejects.toThrow(new PayeeError("表記が見つかりません"));
});
test.each([["0", "7", "3"], ["5", "x", "3"], ["5", "7", "03"]])("不正な ID（%s, %s, %s）なら削除しない", async (politicianId, payeeId, aliasId) => {
  const repository = setup(true);
  await expect(new DeletePayeeAliasUsecase(repository).execute(politicianId, payeeId, aliasId)).rejects.toThrow(PayeeError);
  expect(repository.deleteAlias).not.toHaveBeenCalled();
});
