import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaPromptRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-prompt.repository";
function setup() {
  const table = { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const client = {
    researchFundPrompt: table,
    $transaction: jest.fn((run: (tx: unknown) => unknown) => run({ researchFundPrompt: table })),
  };
  return { table, client, repository: new PrismaPromptRepository(client as unknown as PrismaClient) };
}
test("版は降順に並べ、使用ジョブ数を数えて返す", async () => {
  const { table, repository } = setup();
  table.findMany.mockResolvedValue([
    { id: BigInt(9), version: 2, body: "新", isActive: true, updatedAt: new Date("2026-09-02T03:04:05.000Z"), _count: { scanJobs: 7 } },
  ]);
  await expect(repository.list("2")).resolves.toEqual([
    { id: "9", version: 2, body: "新", isActive: true, updatedAt: "2026-09-02T03:04:05.000Z", jobCount: 7 },
  ]);
  expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { politicianId: BigInt(2) }, orderBy: { version: "desc" } }));
});
test("保存は最新版の次を採番し、旧有効版を降ろしてから新版を有効にする", async () => {
  const { table, client, repository } = setup();
  table.findFirst.mockResolvedValue({ version: 3 });
  await expect(repository.create("2", "本文", "user")).resolves.toBe(4);
  expect(client.$transaction).toHaveBeenCalled();
  expect(table.updateMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(2), isActive: true }, data: { isActive: false } });
  expect(table.create).toHaveBeenCalledWith({ data: { politicianId: BigInt(2), version: 4, body: "本文", isActive: true, updatedById: "user" } });
});
test("初回の保存はv1になる", async () => {
  const { table, repository } = setup();
  table.findFirst.mockResolvedValue(null);
  await expect(repository.create("2", "本文", "user")).resolves.toBe(1);
  expect(table.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }));
});
test("同時保存による版の重複は再読み込みを促すエラーにする", async () => {
  const { table, repository } = setup();
  table.findFirst.mockResolvedValue({ version: 3 });
  table.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
  await expect(repository.create("2", "本文", "user")).rejects.toThrow("再読み込み");
});
test("巻き戻しは対象の版だけを有効にし、新しい版を作らない", async () => {
  const { table, repository } = setup();
  table.findUnique.mockResolvedValue({ id: BigInt(5) });
  await repository.activate("2", 1);
  expect(table.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { politicianId_version: { politicianId: BigInt(2), version: 1 } } }));
  expect(table.updateMany).toHaveBeenCalledWith({ where: { politicianId: BigInt(2), isActive: true }, data: { isActive: false } });
  expect(table.update).toHaveBeenCalledWith({ where: { id: BigInt(5) }, data: { isActive: true } });
  expect(table.create).not.toHaveBeenCalled();
});
test("他の議員の版や存在しない版には巻き戻さない", async () => {
  const { table, repository } = setup();
  table.findUnique.mockResolvedValue(null);
  await expect(repository.activate("2", 9)).rejects.toThrow("見つかりません");
  expect(table.updateMany).not.toHaveBeenCalled();
  expect(table.update).not.toHaveBeenCalled();
});
