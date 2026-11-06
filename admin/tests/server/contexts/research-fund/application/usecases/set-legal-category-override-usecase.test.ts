import { SetLegalCategoryOverrideUsecase } from "@/server/contexts/research-fund/application/usecases/set-legal-category-override-usecase";
import { entry, setup, target } from "./journal-review-test-helpers";

const accounts = [
  { key: "ai-tools", label: "AIツール", type: "expense", legalCategoryKey: "office", legalLabel: "④ 事務所費" },
  { key: "books", label: "書籍", type: "expense", legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
  { key: "needs-review", label: "要確認", type: "expense", legalCategoryKey: null, legalLabel: null },
];
const override = { legalCategoryKey: "research", reason: " 提出済みの報告書に合わせる " };

function setupOverride(overrides: Parameters<typeof setup>[0] = {}, allowed = true) {
  const context = setup({ accountKey: "ai-tools", ...overrides });
  context.repository.accounts.mockResolvedValue(accounts);
  context.repository.legalCategoryOverrideAllowed.mockResolvedValue(allowed);
  return context;
}

describe("SetLegalCategoryOverrideUsecase（#1880）", () => {
  it.each(["draft", "approved"] as const)("許可された帳簿の %s の支出の仕訳を、理由を整えて上書きする", async (status) => {
    const { repository } = setupOverride({ status });
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, override, "user"),
    ).resolves.toEqual({ updatedAt: "2026-08-02T00:00:00.000Z" });
    expect(repository.setLegalCategoryOverride).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ id: entry.id, status }),
      { legalCategoryKey: "research", reason: "提出済みの報告書に合わせる" },
      "user",
    );
  });

  it("上書きが許可されていない帳簿では拒否する", async () => {
    const { repository } = setupOverride({}, false);
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, override, "user"),
    ).rejects.toThrow("この帳簿では法定区分の上書きが許可されていません");
    expect(repository.setLegalCategoryOverride).not.toHaveBeenCalled();
  });

  it("許可されていない帳簿では、上書きを外す操作も拒否する", async () => {
    const { repository } = setupOverride({ legalCategoryOverride: { key: "research", label: "⑦ 調査研究費", reason: "理由" } }, false);
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, null, "user"),
    ).rejects.toThrow("許可されていません");
    expect(repository.setLegalCategoryOverride).not.toHaveBeenCalled();
  });

  it("公開中の仕訳は上書きできない", async () => {
    const { repository } = setupOverride({ status: "published" });
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, override, "user"),
    ).rejects.toThrow("公開中");
    expect(repository.setLegalCategoryOverride).not.toHaveBeenCalled();
  });

  it("理由が空なら拒否する", async () => {
    const { repository } = setupOverride();
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, { legalCategoryKey: "research", reason: "  " }, "user"),
    ).rejects.toThrow("上書きの理由を入力してください");
  });

  it("法定区分を持たない科目（要確認）の仕訳は上書きできない", async () => {
    const { repository } = setupOverride({ accountKey: "needs-review" });
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, override, "user"),
    ).rejects.toThrow("法定区分を持たない科目");
  });

  it("同時更新を検出したら変更しない", async () => {
    const { repository } = setupOverride();
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, "2000-01-01T00:00:00.000Z", override, "user"),
    ).rejects.toThrow("再読み込み");
    expect(repository.setLegalCategoryOverride).not.toHaveBeenCalled();
  });

  it("上書きを外すと科目の既定の区分に戻す（null を渡す）", async () => {
    const { repository } = setupOverride({ legalCategoryOverride: { key: "research", label: "⑦ 調査研究費", reason: "理由" } });
    await new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, null, "user");
    expect(repository.setLegalCategoryOverride).toHaveBeenCalledWith("1", expect.objectContaining({ id: entry.id }), null, "user");
  });

  it("上書きの無い仕訳の上書きは外せない", async () => {
    const { repository } = setupOverride();
    await expect(
      new SetLegalCategoryOverrideUsecase(repository).execute("1", target.id, target.updatedAt, null, "user"),
    ).rejects.toThrow("上書きされていません");
  });
});
