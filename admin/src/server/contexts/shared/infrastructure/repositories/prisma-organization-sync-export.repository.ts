import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  IOrganizationSyncExportRepository,
  OrganizationSyncExportSource,
} from "@/server/contexts/shared/domain/repositories/organization-sync-export-repository.interface";

export class PrismaOrganizationSyncExportRepository implements IOrganizationSyncExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findSourceByOrganizationId(
    politicalOrganizationId: string,
  ): Promise<OrganizationSyncExportSource | null> {
    const id = BigInt(politicalOrganizationId);

    // 取引だけ更新前・残高だけ更新後、のような不整合な写しを作らないよう、
    // 同期対象の読み取りは 1 つのスナップショット（REPEATABLE READ）に揃える。
    // 団体まるごとの読み出しは既定の 5 秒に収まらないことがあるので timeout を広げる。
    const sourceRows = await this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.politicalOrganization.findUnique({
          where: { id },
          select: { slug: true },
        });

        if (!organization) return null;

        // 環境間で差分を取りやすいよう、どの環境でも同じ並びになる自然キー順で書き出す。
        const [transactions, balanceSnapshots, reportProfiles] = await Promise.all([
          tx.transaction.findMany({
            where: { politicalOrganizationId: id },
            orderBy: { transactionNo: "asc" },
            include: {
              transactionCounterparts: { include: { counterpart: true } },
              transactionDonors: { include: { donor: true } },
            },
          }),
          tx.balanceSnapshot.findMany({
            where: { politicalOrganizationId: id },
            orderBy: { snapshotDate: "asc" },
          }),
          tx.organizationReportProfile.findMany({
            where: { politicalOrganizationId: id },
            orderBy: { financialYear: "asc" },
          }),
        ]);

        return { organization, transactions, balanceSnapshots, reportProfiles };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 60000,
      },
    );

    if (!sourceRows) return null;

    const { organization, transactions, balanceSnapshots, reportProfiles } = sourceRows;

    return {
      organizationSlug: organization.slug,
      transactions: transactions.map((transaction) => {
        const counterpart = transaction.transactionCounterparts[0]?.counterpart ?? null;
        const donor = transaction.transactionDonors[0]?.donor ?? null;

        return {
          transactionNo: transaction.transactionNo,
          transactionDate: transaction.transactionDate,
          financialYear: transaction.financialYear,
          transactionType: transaction.transactionType,
          debitAccount: transaction.debitAccount,
          debitSubAccount: transaction.debitSubAccount,
          debitDepartment: transaction.debitDepartment,
          debitPartner: transaction.debitPartner,
          debitTaxCategory: transaction.debitTaxCategory,
          debitAmount: transaction.debitAmount,
          creditAccount: transaction.creditAccount,
          creditSubAccount: transaction.creditSubAccount,
          creditDepartment: transaction.creditDepartment,
          creditPartner: transaction.creditPartner,
          creditTaxCategory: transaction.creditTaxCategory,
          creditAmount: transaction.creditAmount,
          description: transaction.description,
          memo: transaction.memo,
          friendlyCategory: transaction.friendlyCategory,
          categoryKey: transaction.categoryKey,
          label: transaction.label,
          hash: transaction.hash,
          isGrantExpenditure: transaction.isGrantExpenditure,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          counterpart: counterpart
            ? {
                name: counterpart.name,
                postalCode: counterpart.postalCode,
                address: counterpart.address,
              }
            : null,
          donor: donor
            ? {
                donorType: donor.donorType,
                name: donor.name,
                address: donor.address,
                occupation: donor.occupation,
              }
            : null,
        };
      }),
      balanceSnapshots: balanceSnapshots.map((snapshot) => ({
        snapshotDate: snapshot.snapshotDate,
        balance: snapshot.balance,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      })),
      organizationReportProfiles: reportProfiles.map((profile) => ({
        financialYear: profile.financialYear,
        officialName: profile.officialName,
        officialNameKana: profile.officialNameKana,
        officeAddress: profile.officeAddress,
        officeAddressBuilding: profile.officeAddressBuilding,
        details: profile.details,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      })),
    };
  }
}
