import type { PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

interface PoliticianSeedData {
  name: string;
  slug: string;
  termStart: string;
  displayOrder: number;
  /** 所属する政治団体（既存 political_organizations）の slug。null なら無所属 */
  organizationSlug: string | null;
  startedOn?: string;
  /** 調研費を公開するか（既定は非公開）。非公開の議員は webapp の導線・sitemap に出ず、プレビュー URL でだけ開けて noindex になる */
  isResearchFundPublic?: boolean;
  /** 調研費を非公開のまま「準備中」として webapp の一覧に出すときの添え書き（非公開の議員だけ）。未指定なら出さない */
  researchFundComingSoonNote?: string;
}

const data: PoliticianSeedData[] = [
  {
    name: 'サンプル 太郎',
    slug: 'sample-taro',
    termStart: '2025-07-21',
    displayOrder: 1,
    organizationSlug: 'sample-party',
    startedOn: '2025-07-21',
    isResearchFundPublic: true,
  },
  {
    name: 'サンプル 花子',
    slug: 'sample-hanako',
    termStart: '2025-07-21',
    displayOrder: 2,
    organizationSlug: null, // 無所属（所属なしでも議員は存在できることの確認用）
  },
  {
    // 政党ページ A-6 の「準備中の議員もグレーで表示する」を確認するための所属議員。
    name: 'サンプル 次郎',
    slug: 'sample-jiro',
    termStart: '2025-07-21',
    displayOrder: 3,
    organizationSlug: 'sample-party',
    startedOn: '2025-07-21',
    isResearchFundPublic: true,
  },
  {
    // トップの SP で議員カードを複数枚同時に開けることを E2E で確かめるための、2人目の調研費の公開議員。
    // ふりがな未登録の議員は名前の順に並ぶので、サンプル 太郎の後ろに来る名前にしている。
    name: 'サンプル 美咲',
    slug: 'sample-misaki',
    termStart: '2025-07-21',
    displayOrder: 4,
    organizationSlug: 'sample-party',
    startedOn: '2025-07-21',
    isResearchFundPublic: true,
  },
  {
    // トップの PC で準備中の議員を選んでも右のカードの高さが変わらないことを E2E で確かめるための、準備中の議員。
    // 公開中の議員の後ろに並ぶ
    name: 'サンプル 健太',
    slug: 'sample-kenta',
    termStart: '2025-07-21',
    displayOrder: 5,
    // 政党ページの所属議員には出さない（準備中の一覧は所属を問わない）
    organizationSlug: null,
    researchFundComingSoonNote: 'サンプル 健太議員室は12月中旬を目処に公開予定です。',
  },
  {
    name: 'E2E 議員',
    slug: 'e2e-politician',
    termStart: '2025-07-21',
    displayOrder: 1,
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
        politician = await prisma.politician.create({
          data: {
            name: item.name,
            slug: item.slug,
            termStart: new Date(item.termStart),
            displayOrder: item.displayOrder,
            isResearchFundPublic: item.isResearchFundPublic ?? false,
            researchFundComingSoonNote: item.researchFundComingSoonNote ?? null,
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
