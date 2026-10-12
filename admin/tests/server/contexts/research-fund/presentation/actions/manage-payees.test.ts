import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { DeletePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-usecase";
import { DeletePayeeAliasUsecase } from "@/server/contexts/research-fund/application/usecases/delete-payee-alias-usecase";
import { SavePayeeUsecase } from "@/server/contexts/research-fund/application/usecases/save-payee-usecase";
import { PayeeError } from "@/server/contexts/research-fund/domain/models/payee";
import { deletePayee, deletePayeeAlias, savePayee } from "@/server/contexts/research-fund/presentation/actions/manage-payees";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({ requireAuth: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const form = { name: "東京タクシー", postalCode: "", address: "", invoiceRegistrationNumber: "" };
const payee = { id: "7", politicianId: "2", name: "東京タクシー", postalCode: null, address: "", invoiceRegistrationNumber: null };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireAuth).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireAuth>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("選択中の帳簿の議員の支払先として保存し、レイアウトを再検証する", async () => {
  const save = jest.spyOn(SavePayeeUsecase.prototype, "execute").mockResolvedValue(payee);
  await expect(savePayee("2", "1", null, form)).resolves.toEqual({ success: true, payee });
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(save).toHaveBeenCalledWith("2", null, form);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("選択中の対象と違う議員への送信は保存しない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const save = jest.spyOn(SavePayeeUsecase.prototype, "execute");
  await expect(savePayee("3", "1", "7", form)).resolves.toMatchObject({ success: false });
  expect(save).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("業務エラーは理由を返し、内部エラーは漏らさない", async () => {
  jest.spyOn(SavePayeeUsecase.prototype, "execute").mockRejectedValueOnce(new PayeeError("同じ名称・住所の支払先がすでに登録されています"));
  await expect(savePayee("2", "1", null, form)).resolves.toEqual({ success: false, error: "同じ名称・住所の支払先がすでに登録されています" });
  jest.spyOn(SavePayeeUsecase.prototype, "execute").mockRejectedValueOnce(new Error("private database detail"));
  await expect(savePayee("2", "1", null, form)).resolves.toEqual({ success: false, error: "支払先の保存に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("選択中の帳簿の議員の支払先の表記を削除し、レイアウトを再検証する", async () => {
  const remove = jest.spyOn(DeletePayeeAliasUsecase.prototype, "execute").mockResolvedValue();
  await expect(deletePayeeAlias("2", "1", "7", "3")).resolves.toEqual({ success: true });
  expect(remove).toHaveBeenCalledWith("2", "7", "3");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("選択中の対象と違う議員への表記の削除は行わない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const remove = jest.spyOn(DeletePayeeAliasUsecase.prototype, "execute");
  await expect(deletePayeeAlias("3", "1", "7", "3")).resolves.toMatchObject({ success: false });
  expect(remove).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("表記の削除の業務エラーは理由を返し、内部エラーは漏らさない", async () => {
  jest.spyOn(DeletePayeeAliasUsecase.prototype, "execute").mockRejectedValueOnce(new PayeeError("表記が見つかりません"));
  await expect(deletePayeeAlias("2", "1", "7", "3")).resolves.toEqual({ success: false, error: "表記が見つかりません" });
  jest.spyOn(DeletePayeeAliasUsecase.prototype, "execute").mockRejectedValueOnce(new Error("private database detail"));
  await expect(deletePayeeAlias("2", "1", "7", "3")).resolves.toEqual({ success: false, error: "表記の削除に失敗しました" });
});
test("選択中の帳簿の議員の支払先を削除し、未設定に戻した件数を返してレイアウトを再検証する", async () => {
  const remove = jest.spyOn(DeletePayeeUsecase.prototype, "execute").mockResolvedValue({ unlinkedCount: 2 });
  await expect(deletePayee("2", "1", "7")).resolves.toEqual({ success: true, unlinkedCount: 2 });
  expect(remove).toHaveBeenCalledWith("2", "7");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("選択中の対象と違う議員への支払先の削除は行わない", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const remove = jest.spyOn(DeletePayeeUsecase.prototype, "execute");
  await expect(deletePayee("3", "1", "7")).resolves.toMatchObject({ success: false });
  expect(remove).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("支払先の削除の業務エラーは理由を返し、内部エラーは漏らさない", async () => {
  jest.spyOn(DeletePayeeUsecase.prototype, "execute").mockRejectedValueOnce(new PayeeError("公開中の仕訳（1件）に紐づいているため削除できません"));
  await expect(deletePayee("2", "1", "7")).resolves.toEqual({ success: false, error: "公開中の仕訳（1件）に紐づいているため削除できません" });
  jest.spyOn(DeletePayeeUsecase.prototype, "execute").mockRejectedValueOnce(new Error("private database detail"));
  await expect(deletePayee("2", "1", "7")).resolves.toEqual({ success: false, error: "支払先の削除に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
