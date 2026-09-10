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

test("ID指定で議員を取得し、見つからなければnullを返す", async () => {
  const { tx, repository } = setup();
  tx.politician.findUnique.mockResolvedValueOnce(politician).mockResolvedValueOnce(null);
  await expect(repository.findById("1")).resolves.toEqual({
    ...input,
    id: "1",
    politicalOrganizationId: "",
    politicalOrganizationName: null,
  });
  expect(tx.politician.findUnique).toHaveBeenCalledWith({
    where: { id: BigInt(1) },
    include: {
      memberships: {
        where: { endedOn: null },
        orderBy: { startedOn: "desc" },
        include: { politicalOrganization: true },
      },
    },
  });
  await expect(repository.findById("999")).resolves.toBeNull();
});

test("無所属で新規作成すると所属履歴を作らない", async () => {
  const { tx, repository } = setup();
  await repository.save(null, { ...input, politicalOrganizationId: "" });
  expect(tx.politician.create).toHaveBeenCalledWith({
    data: { name: input.name, slug: input.slug, termStart: new Date(input.termStart) },
  });
  expect(tx.politicianOrgMembership.create).not.toHaveBeenCalled();
  expect(tx.politicianOrgMembership.update).not.toHaveBeenCalled();
});

test.each(["2026-02-08", "2026-10-01"])(
  "所属変更時に旧所属を終了し、新所属を当日から登録する（開始日: %s）",
  async (startedOn) => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-10T12:00:00Z"));
    try {
      const { tx, repository } = setup();
      tx.politicianOrgMembership.findMany.mockResolvedValue([
        { id: BigInt(3), politicalOrganizationId: BigInt(2), startedOn: new Date(startedOn) },
      ]);
      await repository.save("1", { ...input, politicalOrganizationId: "4" });
      expect(tx.politician.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { name: input.name, slug: input.slug, termStart: new Date(input.termStart) },
      });
      expect(tx.politicianOrgMembership.update).toHaveBeenCalledWith({
        where: { id: BigInt(3) },
        data: { endedOn: new Date(startedOn === "2026-10-01" ? startedOn : "2026-09-10") },
      });
      expect(tx.politicianOrgMembership.create).toHaveBeenCalledWith({
        data: {
          politicianId: BigInt(1),
          politicalOrganizationId: BigInt(4),
          startedOn: new Date("2026-09-10"),
        },
      });
    } finally {
      jest.useRealTimers();
    }
  },
);

test.each([
  ["P2003", "所属する政治団体が見つかりません"],
  ["P2034", "他の操作と競合しました。もう一度保存してください"],
  ["P2025", "議員の保存に失敗しました。もう一度お試しください"],
])("保存時のPrismaエラー %s をフォーム用エラーへ変換する", async (code, message) => {
  const { tx, repository } = setup();
  tx.politician.update.mockRejectedValue(
    new Prisma.PrismaClientKnownRequestError("database detail", { code, clientVersion: "test" }),
  );
  await expect(repository.save("1", input)).rejects.toThrow(message);
});

test("予期しない保存エラーの内部情報を公開しない", async () => {
  const { tx, repository } = setup();
  tx.politician.create.mockRejectedValue(new Error("internal database detail"));
  await expect(repository.save(null, input)).rejects.toThrow(
    "議員の保存に失敗しました。もう一度お試しください",
  );
});
