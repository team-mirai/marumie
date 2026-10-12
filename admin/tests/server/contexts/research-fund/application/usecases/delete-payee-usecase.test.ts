import { DeletePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-usecase";
import { PayeeError, type PayeeDeletionResult } from "@/server/contexts/research-fund/domain/models/payee";

function setup(result: PayeeDeletionResult) {
  return { listJournalEntries: jest.fn(), list: jest.fn(), find: jest.fn(), create: jest.fn(), update: jest.fn(), listAliases: jest.fn(), deleteAlias: jest.fn(), deletionImpact: jest.fn(), delete: jest.fn().mockResolvedValue(result), listMergeCandidates: jest.fn(), merge: jest.fn() };
}
test("議員の支払先を削除し、未設定に戻した仕訳の件数を返す", async () => {
  const repository = setup({ status: "deleted", unlinkedCount: 2 });
  await expect(new DeletePayeeUsecase(repository).execute("5", "7")).resolves.toEqual({ unlinkedCount: 2 });
  expect(repository.delete).toHaveBeenCalledWith("5", "7");
});
test("公開中の仕訳が紐づいていれば、その件数を理由にして拒否する", async () => {
  await expect(new DeletePayeeUsecase(setup({ status: "published", publishedCount: 3 })).execute("5", "7")).rejects.toThrow("公開中の仕訳（3件）に紐づいているため削除できません");
});
test("別の議員の支払先・存在しない支払先なら見つからないとして拒否する", async () => {
  await expect(new DeletePayeeUsecase(setup({ status: "not-found" })).execute("6", "7")).rejects.toThrow(new PayeeError("支払先が見つかりません"));
});
test.each([["0", "7"], ["5", "x"], ["5", "07"]])("不正な ID（%s, %s）なら削除しない", async (politicianId, id) => {
  const repository = setup({ status: "deleted", unlinkedCount: 0 });
  await expect(new DeletePayeeUsecase(repository).execute(politicianId, id)).rejects.toThrow(PayeeError);
  expect(repository.delete).not.toHaveBeenCalled();
});
