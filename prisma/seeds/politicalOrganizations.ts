import type { Prisma, PrismaClient } from '@prisma/client';
import type { Seeder } from './lib/types';

const data: Prisma.PoliticalOrganizationCreateInput[] = [
  {
    displayName: '政党・チームみらい',
    orgName: null,
    slug: 'team-mirai',
    description:
      'チームみらい（Team Mirai）は、日本の政党。2024年東京都知事選挙でAIエンジニアの安野貴博のもとに集まった「チーム安野」を前身として、2025年5月8日に設立された。安野が党首を務めている。第27回参議院議員通常選挙において政党要件を満たし、国政政党となった。公職選挙法における略称は「みらい」。',
  },
  {
    displayName: '党首・安野の政治団体',
    orgName: 'デジタル民主主義を考える会',
    slug: 'digimin',
    description: '安野たかひろの政治団体です',
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
        const created = await prisma.politicalOrganization.create({ data: item });
        console.log(`  Created political organization: ${created.slug}`);
      } else {
        console.log(`  Political organization already exists: ${existing.slug}`);
      }
    }
  },
};
