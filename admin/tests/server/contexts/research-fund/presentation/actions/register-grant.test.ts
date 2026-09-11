import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/manage-grants-usecase";
import { GrantRegistrationError } from "@/server/contexts/research-fund/domain/models/grant-registration";
import { registerGrant } from "@/server/contexts/research-fund/presentation/actions/register-grant";
import { requireJournalTarget } from "@/server/contexts/research-fund/presentation/loaders/load-journal-review";
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({ requireAuth: jest.fn() }));
jest.mock("@/server/contexts/research-fund/presentation/loaders/load-journal-review", () => ({ requireJournalTarget: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireAuth).mockResolvedValue({ id: "user" } as Awaited<ReturnType<typeof requireAuth>>);
  jest.mocked(requireJournalTarget).mockResolvedValue({ kind: "research-fund", key: "book:1", name: "議員", year: 2026, politicianId: "2", bookId: "1", draftCount: 0 });
});
afterEach(() => jest.restoreAllMocks());

test("現在の対象を検証し、作成者をサーバー側で設定し、レイアウトを再検証", async () => {
  const register = jest.spyOn(ManageGrantsUsecase.prototype, "register").mockResolvedValue("3");
  await expect(registerGrant("2", "1", "2026-05")).resolves.toEqual({ success: true });
  expect(requireJournalTarget).toHaveBeenCalledWith("2", "1");
  expect(register).toHaveBeenCalledWith("1", "2026-05", "user");
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
});

test("別の対象への古いフォーム送信を拒否", async () => {
  jest.mocked(requireJournalTarget).mockResolvedValue(null);
  const register = jest.spyOn(ManageGrantsUsecase.prototype, "register");
  await expect(registerGrant("2", "1", "2026-05")).resolves.toMatchObject({ success: false });
  expect(register).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("認証失敗時は登録しない", async () => {
  jest.mocked(requireAuth).mockRejectedValueOnce(new Error("auth"));
  const register = jest.spyOn(ManageGrantsUsecase.prototype, "register");
  await expect(registerGrant("2", "1", "2026-05")).rejects.toThrow("auth");
  expect(register).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("利用者が解消できる業務エラーはメッセージを返し、内部エラーは漏らさない", async () => {
  jest.spyOn(ManageGrantsUsecase.prototype, "register").mockRejectedValueOnce(new GrantRegistrationError("この月の支給はすでに登録されています"));
  await expect(registerGrant("2", "1", "2026-05")).resolves.toEqual({ success: false, error: "この月の支給はすでに登録されています" });
  jest.spyOn(ManageGrantsUsecase.prototype, "register").mockRejectedValueOnce(new Error("private database detail"));
  await expect(registerGrant("2", "1", "2026-05")).resolves.toEqual({ success: false, error: "支給の登録に失敗しました" });
  expect(revalidatePath).not.toHaveBeenCalled();
});
