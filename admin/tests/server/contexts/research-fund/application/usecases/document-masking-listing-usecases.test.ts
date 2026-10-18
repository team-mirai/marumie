import { CountUnfinishedDocumentMaskingUsecase } from "@/server/contexts/research-fund/application/usecases/count-unfinished-document-masking-usecase";
import { ListDocumentMaskingsUsecase } from "@/server/contexts/research-fund/application/usecases/list-document-maskings-usecase";
import type { DocumentMaskingRepository } from "@/server/contexts/research-fund/domain/repositories/document-masking-repository.interface";

describe("公開用の版の状態の取得", () => {
  const repository = {
    listByBook: jest.fn(),
    countUnfinished: jest.fn(),
  } as unknown as jest.Mocked<DocumentMaskingRepository>;

  it("書類 ID をキーにして返す", async () => {
    const masking = {
      documentId: "42",
      status: "succeeded" as const,
      error: null,
      regionCount: 2,
      hasMaskedVersion: true,
    };
    repository.listByBook.mockResolvedValue([masking]);

    expect(await new ListDocumentMaskingsUsecase(repository).execute("12")).toEqual({ "42": masking });
    expect(repository.listByBook).toHaveBeenCalledWith("12");
  });

  it("未作成と作成中の件数を合わせて返す", async () => {
    repository.countUnfinished.mockResolvedValue({ pending: 2, running: 1 });

    expect(await new CountUnfinishedDocumentMaskingUsecase(repository).execute("12")).toBe(3);
  });
});
