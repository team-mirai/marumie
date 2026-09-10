import type { PrismaClient, ResearchFundBookStatus } from '@prisma/client';
import type { Seeder } from './lib/types';

interface ResearchFundBookSeedData {
  politicianSlug: string;
  financialYear: number;
  status: ResearchFundBookStatus;
}

const data: ResearchFundBookSeedData[] = [
  { politicianSlug: 'sample-taro', financialYear: 2026, status: 'active' },
  { politicianSlug: 'sample-hanako', financialYear: 2026, status: 'preparing' },
  { politicianSlug: 'e2e-politician', financialYear: 2026, status: 'active' },
];

export const researchFundBooksSeeder: Seeder = {
  name: 'Research Fund Books',
  async seed(prisma: PrismaClient) {
    for (const item of data) {
      const politician = await prisma.politician.findUnique({
        where: { slug: item.politicianSlug },
      });
      if (!politician) {
        console.log(`⚠️  Politician not found: ${item.politicianSlug}, skipping`);
        continue;
      }

      const existing = await prisma.researchFundBook.findUnique({
        where: {
          politicianId_financialYear: {
            politicianId: politician.id,
            financialYear: item.financialYear,
          },
        },
      });
      if (existing) {
        console.log(`⏭️  Already exists: ${item.politicianSlug} (${item.financialYear})`);
        continue;
      }

      await prisma.researchFundBook.create({
        data: {
          politicianId: politician.id,
          financialYear: item.financialYear,
          status: item.status,
        },
      });
      console.log(`✅ Created: ${item.politicianSlug} (${item.financialYear})`);
    }
  },
};
