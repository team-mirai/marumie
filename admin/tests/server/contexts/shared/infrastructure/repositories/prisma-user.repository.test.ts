import type { PrismaClient } from "@prisma/client";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";

function setup() {
  const table = { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() };
  const client = {
    userPoliticianAssignment: table,
    $transaction: jest.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  return { table, client, repository: new PrismaUserRepository(client as unknown as PrismaClient) };
}

describe("担当議員（#1773）", () => {
  test("ユーザーが担当する議員の ID を文字列で返す", async () => {
    const { table, repository } = setup();
    table.findMany.mockResolvedValue([{ politicianId: BigInt(1) }, { politicianId: BigInt(3) }]);

    await expect(repository.findAssignedPoliticianIds("user-1")).resolves.toEqual(["1", "3"]);
    expect(table.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  test("全ユーザーの担当をユーザーごとにまとめる", async () => {
    const { table, repository } = setup();
    table.findMany.mockResolvedValue([
      { userId: "a", politicianId: BigInt(1) },
      { userId: "a", politicianId: BigInt(2) },
      { userId: "b", politicianId: BigInt(2) },
    ]);

    await expect(repository.findAllAssignedPoliticianIds()).resolves.toEqual(
      new Map([
        ["a", ["1", "2"]],
        ["b", ["2"]],
      ]),
    );
  });

  test("担当の置き換えは、既存の担当を消して渡した議員を入れ直す操作を 1 つのトランザクションで行う", async () => {
    const { table, client, repository } = setup();
    table.findMany.mockResolvedValue([{ politicianId: BigInt(2) }, { politicianId: BigInt(5) }]);

    await expect(repository.replaceAssignedPoliticians("user-1", ["2", "5"])).resolves.toEqual([
      "2",
      "5",
    ]);
    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(table.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(table.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", politicianId: BigInt(2) },
        { userId: "user-1", politicianId: BigInt(5) },
      ],
    });
  });
});
