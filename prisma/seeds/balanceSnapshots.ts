import type { PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface BalanceSnapshotData {
  organizationSlug: string;
  snapshotDate: Date;
  balance: number;
}

const data: BalanceSnapshotData[] = [
  {
    organizationSlug: 'sample-party',
    snapshotDate: new Date('2024-12-31'),
    balance: 2000000, // 200万円
  },
  {
    organizationSlug: 'sample-party',
    snapshotDate: new Date('2025-12-30'),
    balance: 3000000, // 300万円
  },
];

export const balanceSnapshotsSeeder: Seeder = {
  name: 'Balance Snapshots',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const organization = await prisma.politicalOrganization.findUnique({
        where: { slug: item.organizationSlug },
      });

      if (!organization) {
        console.log(`⚠️  Organization not found: ${item.organizationSlug}`);
        continue;
      }

      const existing = await prisma.balanceSnapshot.findFirst({
        where: {
          politicalOrganizationId: organization.id,
          snapshotDate: item.snapshotDate,
        },
      });

      if (!existing) {
        await prisma.balanceSnapshot.create({
          data: {
            politicalOrganizationId: organization.id,
            snapshotDate: item.snapshotDate,
            balance: item.balance,
          },
        });
        console.log(
          `✅ Created: ${item.organizationSlug} - ${item.snapshotDate.toISOString().split('T')[0]} - ¥${item.balance.toLocaleString()}`
        );
      } else {
        console.log(
          `⏭️  Already exists: ${item.organizationSlug} - ${item.snapshotDate.toISOString().split('T')[0]}`
        );
      }
    }
  },
};
