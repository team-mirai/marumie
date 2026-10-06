import type { PrismaClient } from "@prisma/client";
import { PrismaOrganizationSyncExportRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-organization-sync-export.repository";

function setup() {
  const tx = {
    politicalOrganization: { findUnique: jest.fn().mockResolvedValue({ slug: "sample" }) },
    transaction: { findMany: jest.fn().mockResolvedValue([]) },
    balanceSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    organizationReportProfile: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaOrganizationSyncExportRepository(prisma as unknown as PrismaClient);
  return { tx, repository };
}

test("取引は年度、取引No の順に並べて読み出し、年度違いで同じ取引No があっても出力順が毎回同じになる", async () => {
  const { tx, repository } = setup();

  await repository.findSourceByOrganizationId("7");

  expect(tx.transaction.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { politicalOrganizationId: BigInt(7) },
      orderBy: [{ financialYear: "asc" }, { transactionNo: "asc" }],
    }),
  );
});
