import type { PrismaClient } from "@prisma/client";
import { PrismaTransactionWithDonorRepository } from "@/server/contexts/report/infrastructure/repositories/prisma-transaction-with-donor.repository";

describe("PrismaTransactionWithDonorRepository.findByTransactionNosForDonorCsv", () => {
  test("取引No は年度ごとに振り直されるので、団体と年度で絞って探す", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { transaction: { findMany } } as unknown as PrismaClient;
    const repository = new PrismaTransactionWithDonorRepository(prisma);

    await repository.findByTransactionNosForDonorCsv(["1", "2"], "7", 2026);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          transactionNo: { in: ["1", "2"] },
          politicalOrganizationId: BigInt(7),
          financialYear: 2026,
        },
      }),
    );
  });
});
