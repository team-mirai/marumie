import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaAddressSearchPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-address-search-prompt.repository";
function setup() {
  const table = { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const client = {
    researchFundAddressSearchPrompt: table,
    $transaction: jest.fn((run: (tx: unknown) => unknown) => run({ researchFundAddressSearchPrompt: table })),
  };
  return { table, client, repository: new PrismaAddressSearchPromptRepository(client as unknown as PrismaClient) };
}
const row = { id: BigInt(9), politicianId: BigInt(2), version: 2, body: "新", isActive: true, updatedById: null, createdAt: new Date(), updatedAt: new Date("2026-10-02T03:04:05.000Z") };
test("議員の版を降順に返す。ジョブからは参照されないのでジョブ数は持たない", async () => {
  const { table, repository } = setup();
  table.findMany.mockResolvedValue([row]);
  await expect(repository.list("2")).resolves.toEqual([
    { id: "9", version: 2, body: "新", isActive: true, updatedAt: "2026-10-02T03:04:05.000Z", jobCount: null },
  ]);
  expect(table.findMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(2) }, orderBy: { version: "desc" } });
});
test("保存は議員の最新版の次を採番し、旧有効版を降ろしてから新版を有効にする", async () => {
  const { table, client, repository } = setup();
  table.findFirst.mockResolvedValue({ version: 3 });
  await expect(repository.create("2", "本文", "user")).resolves.toBe(4);
  expect(client.$transaction).toHaveBeenCalled();
  expect(table.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { politicianId: BigInt(2) } }));
  expect(table.updateMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(2), isActive: true }, data: { isActive: false } });
  expect(table.create).toHaveBeenCalledWith({ data: { politicianId: BigInt(2), version: 4, body: "本文", isActive: true, updatedById: "user" } });
});
test("初回の保存はv1になる", async () => {
  const { table, repository } = setup();
  table.findFirst.mockResolvedValue(null);
  await expect(repository.create("2", "本文", "user")).resolves.toBe(1);
});
test("同時保存による版の重複は再読み込みを促すエラーにする", async () => {
  const { table, repository } = setup();
  table.findFirst.mockResolvedValue({ version: 3 });
  table.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  await expect(repository.create("2", "本文", "user")).rejects.toThrow("再読み込み");
});
test("巻き戻しは同じ議員の版だけを有効にする", async () => {
  const { table, repository } = setup();
  table.findUnique.mockResolvedValue({ id: BigInt(7) });
  await repository.activate("2", 1);
  expect(table.findUnique).toHaveBeenCalledWith({ where: { politicianId_version: { politicianId: BigInt(2), version: 1 } }, select: { id: true } });
  expect(table.updateMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(2), isActive: true }, data: { isActive: false } });
  expect(table.update).toHaveBeenCalledWith({ where: { id: BigInt(7) }, data: { isActive: true } });
});
test("別の議員の版や存在しない版には巻き戻せない", async () => {
  const { table, repository } = setup();
  table.findUnique.mockResolvedValue(null);
  await expect(repository.activate("2", 9)).rejects.toThrow("見つかりません");
  expect(table.updateMany).not.toHaveBeenCalled();
});
test("有効版は議員で絞って引き、無ければ null", async () => {
  const { table, repository } = setup();
  table.findFirst.mockResolvedValueOnce(row).mockResolvedValueOnce(null);
  await expect(repository.findActive("2")).resolves.toMatchObject({ version: 2, body: "新" });
  expect(table.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { politicianId: BigInt(2), isActive: true } }));
  await expect(repository.findActive("3")).resolves.toBeNull();
});
