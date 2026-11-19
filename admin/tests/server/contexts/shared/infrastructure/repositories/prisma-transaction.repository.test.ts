import type { PrismaClient } from "@prisma/client";
import { PrismaTransactionRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-transaction.repository";

describe("PrismaTransactionRepository.findByTransactionNos", () => {
  function setup() {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { transaction: { findMany } } as unknown as PrismaClient;
    return { findMany, repository: new PrismaTransactionRepository(prisma) };
  }

  test("年度を渡すと、その年度の取引だけを対象にする（別年度の同じ取引No は含めない）", async () => {
    const { findMany, repository } = setup();

    await repository.findByTransactionNos(["1"], ["7"], 2025);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        transactionNo: { in: ["1"] },
        politicalOrganizationId: { in: [BigInt(7)] },
        financialYear: 2025,
      },
    });
  });

  test("年度を渡さなければ年度では絞らない", async () => {
    const { findMany, repository } = setup();

    await repository.findByTransactionNos(["1"], ["7"]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        transactionNo: { in: ["1"] },
        politicalOrganizationId: { in: [BigInt(7)] },
      },
    });
  });
});
