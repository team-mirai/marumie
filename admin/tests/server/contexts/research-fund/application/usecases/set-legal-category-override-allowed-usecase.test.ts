import { SetLegalCategoryOverrideAllowedUsecase } from "@/server/contexts/research-fund/application/usecases/set-legal-category-override-allowed-usecase";

function setup(count: number | null) {
  const repository = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setLegalCategoryOverrideAllowed: jest.fn().mockResolvedValue(undefined),
    legalCategoryOverrideCount: jest.fn().mockResolvedValue(count),
  };
  return { repository, usecase: new SetLegalCategoryOverrideAllowedUsecase(repository) };
}

describe("SetLegalCategoryOverrideAllowedUsecase（#1880）", () => {
  it("帳簿の上書きを許可する", async () => {
    const { repository, usecase } = setup(0);

    await expect(usecase.execute("1", "2", true)).resolves.toEqual({ allowed: true });
    expect(repository.setLegalCategoryOverrideAllowed).toHaveBeenCalledWith("1", "2", true);
  });

  it("上書き中の仕訳が無ければ許可を取り消せる", async () => {
    const { repository, usecase } = setup(0);

    await expect(usecase.execute("1", "2", false)).resolves.toEqual({ allowed: false });
    expect(repository.setLegalCategoryOverrideAllowed).toHaveBeenCalledWith("1", "2", false);
  });

  it("上書き中の仕訳が残っていれば許可を取り消さず、その旨を伝える", async () => {
    const { repository, usecase } = setup(3);

    await expect(usecase.execute("1", "2", false)).rejects.toThrow(
      "法定区分を上書き中の仕訳が3件あるため、許可を取り消せません",
    );
    expect(repository.setLegalCategoryOverrideAllowed).not.toHaveBeenCalled();
  });

  it("上書き中の仕訳があっても、許可したままにする操作は受け付ける", async () => {
    const { repository, usecase } = setup(3);

    await usecase.execute("1", "2", true);
    expect(repository.setLegalCategoryOverrideAllowed).toHaveBeenCalledWith("1", "2", true);
  });

  it("帳簿が見つからなければ（別の議員の帳簿を含む）変更しない", async () => {
    const { repository, usecase } = setup(null);

    await expect(usecase.execute("1", "2", true)).rejects.toThrow("帳簿が見つかりません");
    expect(repository.setLegalCategoryOverrideAllowed).not.toHaveBeenCalled();
  });

  it("不正なIDではリポジトリを呼ばない", async () => {
    const { repository, usecase } = setup(0);

    await expect(usecase.execute("x", "2", true)).rejects.toThrow("ID");
    expect(repository.legalCategoryOverrideCount).not.toHaveBeenCalled();
  });
});
