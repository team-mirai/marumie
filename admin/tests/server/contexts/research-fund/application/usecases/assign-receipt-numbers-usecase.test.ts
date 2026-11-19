import { AssignReceiptNumbersUsecase } from "@/server/contexts/research-fund/application/usecases/assign-receipt-numbers-usecase";
import type { ReceiptNumberRepository } from "@/server/contexts/research-fund/domain/repositories/receipt-number-repository.interface";

function setup(documents: Awaited<ReturnType<ReceiptNumberRepository["listNumberingDocuments"]>>) {
  const repository: jest.Mocked<ReceiptNumberRepository> = {
    listNumberingDocuments: jest.fn().mockResolvedValue(documents),
    assign: jest.fn().mockResolvedValue(undefined),
  };
  return { repository, usecase: new AssignReceiptNumbersUsecase(repository) };
}

describe("AssignReceiptNumbersUsecase", () => {
  it("帳簿の書類から採番を決め、同じ帳簿に振って件数を返す", async () => {
    const { repository, usecase } = setup([
      { id: "1", receiptNumber: 1, firstPublishedEntryDate: "2026-08-01" },
      { id: "2", receiptNumber: null, firstPublishedEntryDate: "2026-08-03" },
      { id: "3", receiptNumber: null, firstPublishedEntryDate: "2026-08-02" },
      { id: "4", receiptNumber: null, firstPublishedEntryDate: null },
    ]);
    await expect(usecase.execute("7")).resolves.toEqual({ assigned: 2 });
    expect(repository.listNumberingDocuments).toHaveBeenCalledWith("7");
    expect(repository.assign).toHaveBeenCalledWith("7", [
      { documentId: "3", receiptNumber: 2 },
      { documentId: "2", receiptNumber: 3 },
    ]);
  });
  it("振る書類が無ければ更新しない", async () => {
    const { repository, usecase } = setup([
      { id: "1", receiptNumber: 1, firstPublishedEntryDate: "2026-08-01" },
    ]);
    await expect(usecase.execute("7")).resolves.toEqual({ assigned: 0 });
    expect(repository.assign).not.toHaveBeenCalled();
  });
  it("競合のエラーはそのまま投げる", async () => {
    const { repository, usecase } = setup([
      { id: "1", receiptNumber: null, firstPublishedEntryDate: "2026-08-01" },
    ]);
    repository.assign.mockRejectedValue(new Error("conflict"));
    await expect(usecase.execute("7")).rejects.toThrow("conflict");
  });
});
