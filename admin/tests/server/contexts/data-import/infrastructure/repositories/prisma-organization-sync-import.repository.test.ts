import type { PrismaClient } from "@prisma/client";
import { PrismaOrganizationSyncImportRepository } from "@/server/contexts/data-import/infrastructure/repositories/prisma-organization-sync-import.repository";
import type {
  OrganizationSyncExport,
  SyncExportCounterpart,
  SyncExportDonor,
  SyncExportTransaction,
} from "@/server/contexts/shared/domain/models/organization-sync-export";

function buildTransaction(
  transactionNo: string,
  counterpart: SyncExportCounterpart | null,
  donor: SyncExportDonor | null,
): SyncExportTransaction {
  return {
    transactionNo,
    transactionDate: "2026-04-01",
    financialYear: 2026,
    transactionType: "income",
    debitAccount: "普通預金",
    debitSubAccount: null,
    debitDepartment: null,
    debitPartner: null,
    debitTaxCategory: null,
    debitAmount: "1000.00",
    creditAccount: "個人からの寄附",
    creditSubAccount: null,
    creditDepartment: null,
    creditPartner: null,
    creditTaxCategory: null,
    creditAmount: "1000.00",
    description: null,
    memo: null,
    friendlyCategory: null,
    categoryKey: "individual-donations",
    label: "",
    hash: transactionNo,
    isGrantExpenditure: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    counterpart,
    donor,
  };
}

function setup() {
  const tx = {
    politicalOrganization: { findUnique: jest.fn().mockResolvedValue({ tenantId: BigInt(9) }) },
    transaction: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      findMany: jest.fn().mockResolvedValue([
        { id: BigInt(101), transactionNo: "T1" },
        { id: BigInt(102), transactionNo: "T2" },
      ]),
    },
    balanceSnapshot: { deleteMany: jest.fn(), createMany: jest.fn() },
    counterpart: { findMany: jest.fn(), createMany: jest.fn() },
    donor: { findMany: jest.fn(), createMany: jest.fn() },
    transactionCounterpart: { createMany: jest.fn() },
    transactionDonor: { createMany: jest.fn() },
    organizationReportProfile: { upsert: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaOrganizationSyncImportRepository(prisma as unknown as PrismaClient);
  return { tx, repository };
}

test("同時に別の取り込みが同じ取引先・寄付者を作っていても、重複を読み飛ばして既存の ID に紐づけ、実際に作った件数だけ数える", async () => {
  const { tx, repository } = setup();
  const file = {
    transactions: [
      buildTransaction("T1", { name: "取引先A", postalCode: null, address: null }, null),
      buildTransaction(
        "T2",
        { name: "取引先B", postalCode: null, address: null },
        { donorType: "individual", name: "寄付者X", address: null, occupation: "会社員" },
      ),
    ],
    balanceSnapshots: [],
    organizationReportProfiles: [],
  } as unknown as OrganizationSyncExport;

  // 最初の照合ではどちらも無いが、取引先A は別の取り込みが先に作っていたので 1 件しか挿入されない。
  tx.counterpart.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
    { id: BigInt(1), name: "取引先A", address: null },
    { id: BigInt(2), name: "取引先B", address: null },
  ]);
  tx.counterpart.createMany.mockResolvedValue({ count: 1 });
  tx.donor.findMany
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: BigInt(5), name: "寄付者X", address: null, donorType: "individual" }]);
  tx.donor.createMany.mockResolvedValue({ count: 0 });

  const result = await repository.replaceOrganizationSyncData({ politicalOrganizationId: "7", file });

  expect(tx.counterpart.createMany).toHaveBeenCalledWith(
    expect.objectContaining({ skipDuplicates: true }),
  );
  expect(tx.donor.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
  expect(result.createdCounterpartCount).toBe(1);
  expect(result.createdDonorCount).toBe(0);
  expect(tx.transactionCounterpart.createMany).toHaveBeenCalledWith({
    data: [
      { transactionId: BigInt(101), counterpartId: BigInt(1) },
      { transactionId: BigInt(102), counterpartId: BigInt(2) },
    ],
  });
  expect(tx.transactionDonor.createMany).toHaveBeenCalledWith({
    data: [{ transactionId: BigInt(102), donorId: BigInt(5) }],
  });
});
