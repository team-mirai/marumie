import { MergePayeesUsecase } from "@/server/contexts/research-fund/application/usecases/merge-payees-usecase";
import { PayeeError } from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeMergeResult } from "@/server/contexts/research-fund/domain/models/payee-merge";

function setup(result: PayeeMergeResult) {
  return { listJournalEntries: jest.fn(), list: jest.fn(), find: jest.fn(), create: jest.fn(), update: jest.fn(), listAliases: jest.fn(), deleteAlias: jest.fn(), deletionImpact: jest.fn(), delete: jest.fn(), listMergeCandidates: jest.fn(), merge: jest.fn().mockResolvedValue(result) };
}
test("議員の支払先を統合し、統合先に紐づけ直した仕訳の件数を返す", async () => {
  const repository = setup({ status: "merged", movedEntryCount: 3 });
  await expect(new MergePayeesUsecase(repository).execute("5", "7", "8")).resolves.toEqual({ movedEntryCount: 3 });
  expect(repository.merge).toHaveBeenCalledWith("5", "7", "8");
});
test("統合できない理由があればそれを理由にして拒否する", async () => {
  await expect(new MergePayeesUsecase(setup({ status: "rejected", reason: "インボイス登録番号が食い違うため統合できません" })).execute("5", "7", "8")).rejects.toThrow(new PayeeError("インボイス登録番号が食い違うため統合できません"));
});
test("別の議員の支払先・存在しない支払先なら見つからないとして拒否する", async () => {
  await expect(new MergePayeesUsecase(setup({ status: "not-found" })).execute("6", "7", "8")).rejects.toThrow(new PayeeError("支払先が見つかりません"));
});
test("同じ支払先どうしは統合しない", async () => {
  const repository = setup({ status: "merged", movedEntryCount: 0 });
  await expect(new MergePayeesUsecase(repository).execute("5", "7", "7")).rejects.toThrow("同じ支払先どうしは統合できません");
  expect(repository.merge).not.toHaveBeenCalled();
});
test.each([["0", "7", "8"], ["5", "x", "8"], ["5", "7", "08"]])("不正な ID（%s, %s, %s）なら統合しない", async (politicianId, targetId, sourceId) => {
  const repository = setup({ status: "merged", movedEntryCount: 0 });
  await expect(new MergePayeesUsecase(repository).execute(politicianId, targetId, sourceId)).rejects.toThrow(PayeeError);
  expect(repository.merge).not.toHaveBeenCalled();
});
