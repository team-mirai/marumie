import type { PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface PoliticianSeedData {
  name: string;
  slug: string;
  termStart: string;
  displayOrder: number;
  tenantSlug: string;
  /** 所属する政治団体（既存 political_organizations）の slug。null なら無所属 */
  organizationSlug: string | null;
  startedOn?: string;
}

const data: PoliticianSeedData[] = [
  {
    name: 'サンプル 太郎',
    slug: 'sample-taro',
    termStart: '2025-07-21',
    displayOrder: 1,
    tenantSlug: 'sample-party',
    organizationSlug: 'sample-party',
    startedOn: '2025-07-21',
  },
  {
    name: 'サンプル 花子',
    slug: 'sample-hanako',
    termStart: '2025-07-21',
    displayOrder: 2,
    tenantSlug: 'sample-party',
    organizationSlug: null, // 無所属（所属なしでも議員は存在できることの確認用）
  },
  {
    // 政党ページ A-6 の「準備中の議員もグレーで表示する」を確認するための所属議員。
    name: 'サンプル 次郎',
    slug: 'sample-jiro',
    termStart: '2025-07-21',
    displayOrder: 3,
    tenantSlug: 'sample-party',
    organizationSlug: 'sample-party',
    startedOn: '2025-07-21',
  },
  {
    name: 'E2E 議員',
    slug: 'e2e-politician',
    termStart: '2025-07-21',
    displayOrder: 1,
    tenantSlug: 'e2e-test-org',
    organizationSlug: 'e2e-test-org',
    startedOn: '2025-07-21',
  },
];

export const politiciansSeeder: Seeder = {
  name: 'Politicians',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      let politician = await prisma.politician.findUnique({ where: { slug: item.slug } });

      if (!politician) {
        const tenant = await prisma.tenant.findFirst({ where: { slug: item.tenantSlug } });
        if (!tenant) {
          console.log(`⚠️  Tenant not found: ${item.tenantSlug}, skipping ${item.slug}`);
          continue;
        }

        politician = await prisma.politician.create({
          data: {
            name: item.name,
            slug: item.slug,
            termStart: new Date(item.termStart),
            displayOrder: item.displayOrder,
            tenantId: tenant.id,
          },
        });
        console.log(`✅ Created: ${item.slug}`);
      } else {
        console.log(`⏭️  Already exists: ${item.slug}`);
      }

      if (!item.organizationSlug) {
        continue;
      }

      const organization = await prisma.politicalOrganization.findUnique({
        where: { slug: item.organizationSlug },
      });
      if (!organization) {
        console.log(`⚠️  Organization not found: ${item.organizationSlug}, skipping membership for ${item.slug}`);
        continue;
      }

      const existingMembership = await prisma.politicianOrgMembership.findFirst({
        where: { politicianId: politician.id, politicalOrganizationId: organization.id, endedOn: null },
      });
      if (!existingMembership) {
        await prisma.politicianOrgMembership.create({
          data: {
            politicianId: politician.id,
            politicalOrganizationId: organization.id,
            startedOn: new Date(item.startedOn ?? item.termStart),
          },
        });
        console.log(`✅ Membership created: ${item.slug} -> ${item.organizationSlug}`);
      } else {
        console.log(`⏭️  Membership already exists: ${item.slug} -> ${item.organizationSlug}`);
      }
    }
  },
};
