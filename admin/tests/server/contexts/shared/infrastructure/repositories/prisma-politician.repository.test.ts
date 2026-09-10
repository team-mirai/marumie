import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaPoliticianRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-politician.repository";

const input = {
  name: "議員",
  slug: "member",
  termStart: "2026-02-08",
  politicalOrganizationId: "2",
};
const politician = {
  id: BigInt(1),
  name: "議員",
  slug: "member",
  termStart: new Date("2026-02-08"),
  memberships: [],
};
function setup() {
  const tx = {
    politician: {
      create: jest.fn().mockResolvedValue(politician),
      update: jest.fn().mockResolvedValue(politician),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    politicianOrgMembership: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    researchFundBook: { deleteMany: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  return {
    tx,
    prisma,
    repository: new PrismaPoliticianRepository(prisma as unknown as PrismaClient),
  };
}
test("作成と所属登録を同じトランザクションで行う", async () => {
  const { tx, prisma, repository } = setup();
  await repository.save(null, input);
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "Serializable",
  });
  expect(tx.politicianOrgMembership.create).toHaveBeenCalledWith({
    data: {
      politicianId: BigInt(1),
      politicalOrganizationId: BigInt(2),
      startedOn: new Date("2026-02-08"),
    },
  });
});
test("所属を外すと過去の履歴を削除せず終了日を設定する", async () => {
  const { tx, repository } = setup();
  tx.politicianOrgMembership.findMany.mockResolvedValue([
    { id: BigInt(3), politicalOrganizationId: BigInt(2), startedOn: new Date("2026-02-08") },
  ]);
  await repository.save("1", { ...input, politicalOrganizationId: "" });
  expect(tx.politicianOrgMembership.update).toHaveBeenCalledWith({
    where: { id: BigInt(3) },
    data: { endedOn: expect.any(Date) },
  });
  expect(tx.politicianOrgMembership.create).not.toHaveBeenCalled();
});
test("同じ所属での氏名更新は履歴を増やさない", async () => {
  const { tx, repository } = setup();
  tx.politicianOrgMembership.findMany.mockResolvedValue([{ politicalOrganizationId: BigInt(2) }]);
  await repository.save("1", input);
  expect(tx.politicianOrgMembership.update).not.toHaveBeenCalled();
  expect(tx.politicianOrgMembership.create).not.toHaveBeenCalled();
});
test("slug重複をフォーム用エラーへ変換する", async () => {
  const { tx, repository } = setup();
  tx.politician.create.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }),
  );
  await expect(repository.save(null, input)).rejects.toThrow("このスラッグは既に使用されています");
});
test("帳簿を議員より先に削除し、ジョブのプロンプト参照を解消する", async () => {
  const { tx, repository } = setup();
  await repository.delete("1");
  expect(tx.researchFundBook.deleteMany).toHaveBeenCalledWith({
    where: { politicianId: BigInt(1) },
  });
  expect(tx.politician.delete).toHaveBeenCalledWith({ where: { id: BigInt(1) } });
  expect(tx.researchFundBook.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
    tx.politician.delete.mock.invocationCallOrder[0],
  );
});
test("無所属と所属ありの一覧をシリアライズする", async () => {
  const { tx, repository } = setup();
  tx.politician.findMany.mockResolvedValue([
    politician,
    {
      ...politician,
      memberships: [
        { politicalOrganizationId: BigInt(2), politicalOrganization: { displayName: "政党" } },
      ],
    },
  ]);
  const result = await repository.findAll();
  expect(result[0]).toEqual({
    ...input,
    id: "1",
    politicalOrganizationId: "",
    politicalOrganizationName: null,
  });
  expect(result[1].politicalOrganizationName).toBe("政党");
});
