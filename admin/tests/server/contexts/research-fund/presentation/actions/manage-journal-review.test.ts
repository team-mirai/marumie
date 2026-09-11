import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
import { ManageJournalReviewUsecase } from "@/server/contexts/research-fund/application/usecases/manage-journal-review-usecase";
import { mutateJournalReview } from "@/server/contexts/research-fund/presentation/actions/manage-journal-review";
import { JournalReviewError, type JournalEdit } from "@/server/contexts/research-fund/domain/models/journal-review";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({ requireAuth: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
const input: JournalEdit = { entryDate: "2026-08-01", description: "移動", amount: 1200, accountKey: "taxi", note: "", memo: "" };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireAuth).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireAuth>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("現在の対象を検証し、作成者をサーバー側で設定し、レイアウトを再検証", async () => {
  const create = jest.spyOn(ManageJournalReviewUsecase.prototype, "create").mockResolvedValue("3");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).resolves.toEqual({ success: true, id: "3" });
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1"); expect(create).toHaveBeenCalledWith("1", input, "user"); expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("別の対象への古いフォーム送信を拒否", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const create = jest.spyOn(ManageJournalReviewUsecase.prototype, "create");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).resolves.toMatchObject({ success: false });
  expect(create).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("認証失敗時は更新しない", async () => {
  jest.mocked(requireAuth).mockRejectedValueOnce(new Error("auth"));
  const create = jest.spyOn(ManageJournalReviewUsecase.prototype, "create");
  await expect(mutateJournalReview("2", "1", { type: "create", input })).rejects.toThrow("auth");
  expect(create).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled();
});
test("内部エラーは漏らさず、失敗時に再検証しない", async () => {
  jest.spyOn(ManageJournalReviewUsecase.prototype, "save").mockRejectedValue(new Error("private database detail"));
  await expect(mutateJournalReview("2", "1", { type: "save", id: "3", updatedAt: "date", input, approve: true })).resolves.toEqual({ success: false, error: "仕訳の保存に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("保存と破棄は対象帳簿・更新日時を渡し、成功後に再検証する", async () => {
  const save = jest.spyOn(ManageJournalReviewUsecase.prototype, "save").mockResolvedValue();
  const discard = jest.spyOn(ManageJournalReviewUsecase.prototype, "discard").mockResolvedValue();
  await expect(mutateJournalReview("2", "1", { type: "save", id: "3", updatedAt: "date", input, approve: true })).resolves.toEqual({ success: true });
  expect(save).toHaveBeenCalledWith("1", "3", "date", input, true);
  await expect(mutateJournalReview("2", "1", { type: "discard", id: "3", updatedAt: "date" })).resolves.toEqual({ success: true });
  expect(discard).toHaveBeenCalledWith("1", "3", "date");
  expect(revalidatePath).toHaveBeenCalledTimes(2);
});

test("利用者が解消できる業務エラーはメッセージを返す", async () => {
  jest.spyOn(ManageJournalReviewUsecase.prototype, "discard").mockRejectedValue(new JournalReviewError("公開中の仕訳は編集・破棄できません"));
  await expect(mutateJournalReview("2", "1", { type: "discard", id: "3", updatedAt: "date" })).resolves.toEqual({ success: false, error: "公開中の仕訳は編集・破棄できません" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("不正な操作を拒否して再検証しない", async () => {
  await expect(mutateJournalReview("2", "1", { type: "unknown" } as never)).resolves.toEqual({ success: false, error: "操作が不正です" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
