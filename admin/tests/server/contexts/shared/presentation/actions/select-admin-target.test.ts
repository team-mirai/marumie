import { selectAdminTarget } from "@/server/contexts/shared/presentation/actions/select-admin-target";
import { loadAdminTargets } from "@/server/contexts/shared/presentation/loaders/load-admin-targets";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
jest.mock("@/server/contexts/auth/presentation/loaders/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/server/contexts/shared/presentation/loaders/load-admin-targets", () => ({ loadAdminTargets: jest.fn() }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const set = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (cookies as jest.Mock).mockResolvedValue({ set });
  (loadAdminTargets as jest.Mock).mockResolvedValue({ cookieName: "admin-target-user1", targets: [{ kind: "research-fund", key: "book:7", politicianId: "3" }] });
});
test("実在する選択肢だけユーザーごとのcookieに保存しシェルを再検証する", async () => {
  expect(await selectAdminTarget("book:7")).toEqual({ success: true, destination: "/politicians/3/books" });
  expect(set).toHaveBeenCalledWith("admin-target-user1", "book:7", expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax", maxAge: 31536000 }));
  expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  expect(requireRole).toHaveBeenCalledWith("political_fund", "research_fund");
});
test("削除された対象ではcookieを上書きしない", async () => {
  expect(await selectAdminTarget("book:99")).toMatchObject({ success: false });
  expect(set).not.toHaveBeenCalled();
});
test("認証失敗時は選択状態を更新しない", async () => {
  (loadAdminTargets as jest.Mock).mockRejectedValue(new Error("認証が必要です"));
  await expect(selectAdminTarget("book:7")).rejects.toThrow("認証が必要です");
  expect(set).not.toHaveBeenCalled();
});
test("どちらの業務ロールも持たない場合は選択状態を更新しない", async () => {
  (requireRole as jest.Mock).mockRejectedValueOnce(new Error("この機能を使う権限がありません"));
  await expect(selectAdminTarget("book:7")).rejects.toThrow("この機能を使う権限がありません");
  expect(loadAdminTargets).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});
