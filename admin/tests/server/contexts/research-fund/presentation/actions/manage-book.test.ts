import { revalidatePath } from "next/cache";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";
import { ManageBookUsecase } from "@/server/contexts/research-fund/application/usecases/manage-book-usecase";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";
import { createBook, updateBook } from "@/server/contexts/research-fund/presentation/actions/manage-book";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/server/contexts/auth/presentation/loaders/require-auth", () => ({ requireAuth: jest.fn() }));
jest.mock("@/server/contexts/shared/infrastructure/prisma", () => ({ prisma: {} }));

const metadata = { asOfDate: "", nextUpdateNote: "", policyComment: "" };
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe.each([
  { operation: "create" as const, run: () => createBook("1", 2026), fallback: "作成に失敗しました" },
  { operation: "update" as const, run: () => updateBook("1", "2", metadata), fallback: "保存に失敗しました" },
])("$operation", ({ operation, run, fallback }) => {
  test("認証後の成功時に帳簿一覧を再検証する", async () => {
    const execute = jest.spyOn(ManageBookUsecase.prototype, operation).mockResolvedValue();
    await expect(run()).resolves.toEqual({ success: true });
    expect(requireAuth).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith("/(auth)", "layout");
  });

  test.each([
    new Error("database password=secret"),
    "internal detail",
    new BookError("RF_EXTRACTION_FAILED", "internal detail"),
  ])("未知のエラーの詳細は返さず再検証しない: %s", async (error) => {
    jest.spyOn(ManageBookUsecase.prototype, operation).mockRejectedValue(error);
    await expect(run()).resolves.toEqual({ success: false, error: fallback });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ["INVALID_ID", "IDが不正です"],
    ["DUPLICATE_BOOK", "この議員の年度帳簿は既に存在します"],
    ["RF_INVALID_BOOK_YEAR", "年度は1900〜9999の整数で指定してください"],
    ["RF_INVALID_BOOK_METADATA", "帳簿情報の入力が不正です"],
    ["RF_INVALID_DATE", "時点の日付を正しく入力してください"],
  ] as const)("既知のコード %s を固定メッセージへ変換する", async (code, message) => {
    jest.spyOn(ManageBookUsecase.prototype, operation).mockRejectedValue(new BookError(code, "internal detail"));
    await expect(run()).resolves.toEqual({ success: false, error: message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("認証失敗時は処理と再検証を行わず認証エラーを伝える", async () => {
    const error = new Error("authentication required");
    jest.mocked(requireAuth).mockRejectedValueOnce(error);
    const execute = jest.spyOn(ManageBookUsecase.prototype, operation);
    await expect(run()).rejects.toBe(error);
    expect(execute).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
