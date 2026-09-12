import type { PrismaClient } from "@prisma/client";
import { PrismaDocumentRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-document.repository";

describe("PrismaDocumentRepository", () => {
  const delegate = { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() };
  const repository = new PrismaDocumentRepository({
    researchFundDocument: delegate,
  } as unknown as PrismaClient);
  const row = {
    id: BigInt("9007199254740993"),
    bookId: BigInt("12"),
    storageKey: "key",
    mime: "image/png",
    originalFilename: "領収書.png",
    createdAt: new Date(),
    updatedAt: new Date(),
    batchId: null,
    maskedKey: null,
  };
  beforeEach(() => jest.resetAllMocks());
  it("registers metadata without masked or batch keys and maps bigint without precision loss", async () => {
    delegate.create.mockResolvedValue(row);
    const input = {
      bookId: "12",
      storageKey: "key",
      mime: "image/png",
      originalFilename: "領収書.png",
    };
    expect(await repository.create(input)).toEqual({
      ...input,
      id: "9007199254740993",
      createdAt: row.createdAt,
    });
    expect(delegate.create).toHaveBeenCalledWith({ data: { ...input, bookId: BigInt("12") } });
  });
  it("enforces book scope in the database query", async () => {
    delegate.findFirst.mockImplementation(async ({ where }) =>
      where.bookId === row.bookId && where.id === row.id ? row : null,
    );
    expect(await repository.findById("12", "9007199254740993")).toMatchObject({
      id: "9007199254740993",
      bookId: "12",
    });
    expect(await repository.findById("13", "9007199254740993")).toBeNull();
    expect(delegate.findFirst).toHaveBeenLastCalledWith({
      where: { id: BigInt("9007199254740993"), bookId: BigInt("13") },
    });
  });
  it("lists the book's documents newest first within the limit", async () => {
    delegate.findMany.mockResolvedValue([row]);
    expect(await repository.listByBook("12", 50)).toEqual([
      expect.objectContaining({ id: "9007199254740993", bookId: "12" }),
    ]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { bookId: BigInt("12") },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    });
  });
  it("propagates database errors", async () => {
    delegate.findFirst.mockRejectedValue(new Error("database unavailable"));
    await expect(repository.findById("12", "3")).rejects.toThrow("database unavailable");
  });
});
