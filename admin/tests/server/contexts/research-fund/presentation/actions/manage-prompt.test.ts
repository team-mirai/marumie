import { revalidatePath } from "next/cache";
import { requireResearchFundWriter } from "@/server/contexts/auth/presentation/loaders/require-research-fund-writer";
import { RollbackPromptUsecase } from "@/server/contexts/research-fund/application/usecases/rollback-prompt-usecase";
import { SavePromptUsecase } from "@/server/contexts/research-fund/application/usecases/save-prompt-usecase";
import { mutatePrompt } from "@/server/contexts/research-fund/presentation/actions/manage-prompt";
import { PromptError } from "@/server/contexts/research-fund/domain/models/prompt";
import { PrismaAddressSearchPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-address-search-prompt.repository";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-research-fund-writer", () => ({ requireResearchFundWriter: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireResearchFundWriter).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireResearchFundWriter>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());
test("保存は更新者をサーバー側で設定し、採番された版を返してレイアウトを再検証", async () => {
  const save = jest.spyOn(SavePromptUsecase.prototype, "execute").mockResolvedValue(4);
  await expect(mutatePrompt("2", "1", { type: "save", body: "本文" })).resolves.toEqual({ success: true, version: 4 });
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(save).toHaveBeenCalledWith("2", "本文", "user");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("巻き戻しも対象を検証して再検証する", async () => {
  const rollback = jest.spyOn(RollbackPromptUsecase.prototype, "execute").mockResolvedValue(undefined);
  await expect(mutatePrompt("2", "1", { type: "rollback", version: 2 })).resolves.toEqual({ success: true, version: undefined });
  expect(rollback).toHaveBeenCalledWith("2", 2);
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("別の対象への古いフォーム送信を拒否", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const save = jest.spyOn(SavePromptUsecase.prototype, "execute");
  await expect(mutatePrompt("2", "1", { type: "save", body: "本文" })).resolves.toMatchObject({ success: false });
  expect(save).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("認証失敗時は保存しない", async () => {
  jest.mocked(requireResearchFundWriter).mockRejectedValueOnce(new Error("auth"));
  const save = jest.spyOn(SavePromptUsecase.prototype, "execute");
  await expect(mutatePrompt("2", "1", { type: "save", body: "本文" })).rejects.toThrow("auth");
  expect(save).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("入力の不備は利用者に伝え、内部エラーは漏らさない", async () => {
  jest.spyOn(SavePromptUsecase.prototype, "execute").mockRejectedValueOnce(new PromptError("プロンプト本文を入力してください"));
  await expect(mutatePrompt("2", "1", { type: "save", body: " " })).resolves.toEqual({ success: false, error: "プロンプト本文を入力してください" });
  jest.spyOn(SavePromptUsecase.prototype, "execute").mockRejectedValueOnce(new Error("private database detail"));
  await expect(mutatePrompt("2", "1", { type: "save", body: "本文" })).resolves.toEqual({ success: false, error: "読み取りプロンプトの保存に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
test("種類を省略すると読み取りプロンプトの版を保存する", async () => {
  const save = jest.spyOn(SavePromptUsecase.prototype, "execute").mockResolvedValue(1);
  await mutatePrompt("2", "1", { type: "save", body: "本文" });
  expect(save.mock.contexts[0]).toMatchObject({ repository: expect.any(PrismaPromptRepository) });
});
test("住所検索プロンプトは住所検索の版として保存・巻き戻しする", async () => {
  const save = jest.spyOn(SavePromptUsecase.prototype, "execute").mockResolvedValue(3);
  const rollback = jest.spyOn(RollbackPromptUsecase.prototype, "execute").mockResolvedValue(undefined);
  await expect(mutatePrompt("2", "1", { type: "save", body: "住所" }, "address-search")).resolves.toEqual({ success: true, version: 3 });
  await expect(mutatePrompt("2", "1", { type: "rollback", version: 1 }, "address-search")).resolves.toMatchObject({ success: true });
  expect(save).toHaveBeenCalledWith("2", "住所", "user");
  expect(save.mock.contexts[0]).toMatchObject({ repository: expect.any(PrismaAddressSearchPromptRepository) });
  expect(rollback.mock.contexts[0]).toMatchObject({ repository: expect.any(PrismaAddressSearchPromptRepository) });
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});
test("住所検索プロンプトの保存失敗は住所検索のメッセージで伝える", async () => {
  jest.spyOn(SavePromptUsecase.prototype, "execute").mockRejectedValueOnce(new Error("private database detail"));
  await expect(mutatePrompt("2", "1", { type: "save", body: "本文" }, "address-search")).resolves.toEqual({ success: false, error: "住所検索プロンプトの保存に失敗しました" });
});
