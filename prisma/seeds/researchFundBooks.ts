import type { PrismaClient, ResearchFundBookStatus } from '@prisma/client';
import type { Seeder } from './lib/types';

interface ResearchFundBookSeedData {
  politicianSlug: string;
  financialYear: number;
  status: ResearchFundBookStatus;
  /** 公開ページの「◯◯時点」 */
  asOfDate?: string;
  /** 公開ページの「次回更新◯◯の予定」 */
  nextUpdateNote?: string;
  /** 公開ページ B-3 の活用方針 */
  policyComment?: string;
  /** 公開ページ B-5「調査研究費のデータについて」の本文 */
  details?: { dataNote: string };
}

const data: ResearchFundBookSeedData[] = [
  {
    politicianSlug: 'sample-taro',
    financialYear: 2026,
    status: 'active',
    asOfDate: '2026-08-20',
    nextUpdateNote: '11月ごろ',
    policyComment:
      '2026年2月の当選後、まずは議員事務所の立ち上げに使っています。今後は調査活動や広報の比重を増やしていく予定です。',
    details: {
      dataNote:
        '2026年2月の当選以降、仕訳が完了した支出を掲載しています。費目はチームみらい独自の詳細区分にマッピングし、使途等報告書で定められた法律上の区分にも切り替えて表示できます。',
    },
  },
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
          asOfDate: item.asOfDate ? new Date(item.asOfDate) : null,
          nextUpdateNote: item.nextUpdateNote ?? null,
          policyComment: item.policyComment ?? null,
          details: item.details ?? undefined,
        },
      });
      console.log(`✅ Created: ${item.politicianSlug} (${item.financialYear})`);
    }
  },
};
