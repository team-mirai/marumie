import type { PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface OrgData {
  displayName: string;
  orgName: string | null;
  slug: string;
  description: string;
  tenantSlug: string;
}

const data: OrgData[] = [
  {
    displayName: 'サンプル党',
    orgName: null,
    slug: 'sample-party',
    description: '政治資金報告書XMLエクスポート機能のテストデータ用政治団体',
    tenantSlug: 'sample-party',
  },
  {
    displayName: 'E2Eテスト団体',
    orgName: null,
    slug: 'e2e-test-org',
    description: 'E2Eテスト用の最小構成政治団体',
    tenantSlug: 'e2e-test-org',
  },
];

export const politicalOrganizationsSeeder: Seeder = {
  name: 'Political Organizations',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const existing = await prisma.politicalOrganization.findFirst({
        where: { slug: item.slug },
      });

      if (!existing) {
        const tenant = await prisma.tenant.findFirst({
          where: { slug: item.tenantSlug },
        });
        if (!tenant) {
          console.log(`⚠️  Tenant not found: ${item.tenantSlug}, skipping ${item.slug}`);
          continue;
        }

        const created = await prisma.politicalOrganization.create({
          data: {
            displayName: item.displayName,
            orgName: item.orgName,
            slug: item.slug,
            description: item.description,
            tenantId: tenant.id,
          },
        });
        console.log(`✅ Created: ${created.slug}`);
      } else {
        console.log(`⏭️  Already exists: ${existing.slug}`);
      }
    }
  },
};
