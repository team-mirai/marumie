import type { PrismaClient } from "@prisma/client";
import { PrismaDocumentMaskingRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document-masking.repository";

describe("PrismaDocumentMaskingRepository", () => {
  const delegate = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
    updateMany: jest.fn(),
  };
  type Run = (tx: unknown) => unknown;
  const prisma: { researchFundDocument: typeof delegate; $transaction: jest.Mock } = {
    researchFundDocument: delegate,
    $transaction: jest.fn(),
  };
  const repository = new PrismaDocumentMaskingRepository(prisma as unknown as PrismaClient);
  const startedAt = new Date("2026-10-18T00:00:00.123Z");
  const claimed = { documentId: "42", storageKey: "key", mime: "application/pdf", startedAt };
  const stillClaimed = { id: BigInt(42), maskingStatus: "running", maskingStartedAt: startedAt };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (run: Run) => run(prisma));
  });

  it("帳簿の書類の状態を返す（版のファイルの有無は masked_key で判断する）", async () => {
    delegate.findMany.mockResolvedValue([
      { id: BigInt(1), maskingStatus: "succeeded", maskingError: null, maskedRegionCount: 2, maskedKey: "m" },
      { id: BigInt(2), maskingStatus: "failed", maskingError: "理由", maskedRegionCount: null, maskedKey: null },
    ]);

    expect(await repository.listByBook("12")).toEqual([
      { documentId: "1", status: "succeeded", error: null, regionCount: 2, hasMaskedVersion: true },
      { documentId: "2", status: "failed", error: "理由", regionCount: null, hasMaskedVersion: false },
    ]);
    expect(delegate.findMany.mock.calls[0][0].where).toEqual({ bookId: BigInt(12) });
  });

  it("未作成・作成中の件数を数える", async () => {
    delegate.groupBy.mockResolvedValue([{ maskingStatus: "pending", _count: { _all: 3 } }]);

    expect(await repository.countUnfinished("12")).toEqual({ pending: 3, running: 0 });
    expect(delegate.groupBy.mock.calls[0][0].where).toEqual({
      bookId: BigInt(12),
      maskingStatus: { in: ["pending", "running"] },
    });
  });

  it("失効した作成中の書類を未作成に戻す", async () => {
    delegate.updateMany.mockResolvedValue({ count: 1 });
    const staleBefore = new Date();

    expect(await repository.releaseStale("12", staleBefore)).toBe(1);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: {
        bookId: BigInt(12),
        maskingStatus: "running",
        OR: [{ maskingStartedAt: null }, { maskingStartedAt: { lt: staleBefore } }],
      },
      data: { maskingStatus: "pending", maskingStartedAt: null },
    });
  });

  it("未作成の書類だけを作成中にして返し、別の実行が先に着手した書類は含めない", async () => {
    delegate.findMany.mockResolvedValue([
      { id: BigInt(1), storageKey: "k1", mime: "image/png" },
      { id: BigInt(2), storageKey: "k2", mime: "application/pdf" },
    ]);
    delegate.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    const result = await repository.claim("12", 2);

    expect(result).toEqual([
      { documentId: "2", storageKey: "k2", mime: "application/pdf", startedAt: expect.any(Date) },
    ]);
    expect(delegate.updateMany).toHaveBeenLastCalledWith({
      where: { id: BigInt(2), maskingStatus: "pending" },
      data: { maskingStatus: "running", maskingStartedAt: result[0].startedAt, maskingError: null },
    });
  });

  it("着手したときのまま作成中なら、作った版を記録して前の版のキーを返す", async () => {
    delegate.findFirst.mockResolvedValue({ maskedKey: "old" });
    delegate.updateMany.mockResolvedValue({ count: 1 });

    expect(await repository.complete({ claimed, maskedKey: "new", regionCount: 4 })).toEqual({
      recorded: true,
      replacedKey: "old",
    });
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: stillClaimed,
      data: {
        maskingStatus: "succeeded",
        maskedKey: "new",
        maskedRegionCount: 4,
        maskingError: null,
      },
    });
  });

  it("失効して別の実行が着手し直していたら記録しない", async () => {
    delegate.findFirst.mockResolvedValue(null);

    expect(await repository.complete({ claimed, maskedKey: "new", regionCount: 4 })).toEqual({
      recorded: false,
    });
    expect(delegate.updateMany).not.toHaveBeenCalled();
  });

  it("失敗は着手したときのまま作成中の書類にだけ記録し、黒塗りの箇所の数を消す", async () => {
    await repository.fail(claimed, "理由");

    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: stillClaimed,
      data: { maskingStatus: "failed", maskingError: "理由", maskedRegionCount: null },
    });
  });

  it("作成中でない書類を作り直しの対象に戻す（前の版のキーは残す）", async () => {
    delegate.updateMany.mockResolvedValue({ count: 1 });

    expect(await repository.request("12", "42")).toBe("requested");
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(42), bookId: BigInt(12), maskingStatus: { not: "running" } },
      data: {
        maskingStatus: "pending",
        maskingStartedAt: null,
        maskingError: null,
        maskedRegionCount: null,
      },
    });
  });

  it.each([
    [{ id: BigInt(42) }, "running"],
    [null, "not-found"],
  ])("作り直しの対象に戻せなかったときは理由を返す: %p", async (row, expected) => {
    delegate.updateMany.mockResolvedValue({ count: 0 });
    delegate.findFirst.mockResolvedValue(row);

    expect(await repository.request("12", "42")).toBe(expected);
  });

  it("公開用の版のキーを帳簿の範囲で引く", async () => {
    delegate.findFirst.mockResolvedValueOnce({ maskedKey: "m" }).mockResolvedValueOnce({ maskedKey: null }).mockResolvedValueOnce(null);

    expect(await repository.findMaskedKey("12", "42")).toBe("m");
    expect(await repository.findMaskedKey("12", "42")).toBeNull();
    expect(await repository.findMaskedKey("12", "42")).toBeUndefined();
    expect(delegate.findFirst.mock.calls[0][0].where).toEqual({ id: BigInt(42), bookId: BigInt(12) });
  });
});
