import type { PrismaClient } from "@prisma/client";
import type { Seeder } from "./lib/types";

interface ExpenditureGroupSeedData {
  title: string;
  description: string;
  displayOrder: number;
  /** 紐づける仕訳の項目名（公開済みのものだけが成果カードに集計される） */
  entryDescriptions: string[];
  outcomes: { label: string; url: string | null }[];
}

// 公開ページ B-3「活用方針と主要な成果」の確認用。
// 金額・件数・期間は紐づけた仕訳から自動集計するため、ここには書かない。
const data: ExpenditureGroupSeedData[] = [
  {
    title: "意見受付窓口の開設",
    description:
      "有権者からの意見や陳情を受け付ける窓口として導入しました。初期費用および利用料です。",
    displayOrder: 1,
    entryDescriptions: ["ボネクタ利用料"],
    outcomes: [{ label: "受付窓口を見る", url: "https://example.com/madoguchi" }],
  },
  {
    title: "タウンミーティングの開催",
    description: "有権者と直接意見交換する場として、貸会議室を借りました。",
    displayOrder: 2,
    entryDescriptions: ["会場費", "会議室利用料"],
    // URL が無い成果物は公開側で「報告は準備中」と表示される。
    outcomes: [{ label: "開催報告", url: null }],
  },
];

export const researchFundExpenditureGroupsSeeder: Seeder = {
  name: "Research Fund Expenditure Groups",
  async seed(prisma: PrismaClient) {
    const politician = await prisma.politician.findUnique({ where: { slug: "sample-taro" } });
    if (!politician) {
      console.log("⚠️  Politician not found: sample-taro, skipping");
      return;
    }
    const book = await prisma.researchFundBook.findUnique({
      where: { politicianId_financialYear: { politicianId: politician.id, financialYear: 2026 } },
    });
    if (!book) {
      console.log("⚠️  Research fund book not found: sample-taro (2026), skipping");
      return;
    }

    for (const item of data) {
      const existing = await prisma.researchFundExpenditureGroup.findFirst({
        where: { bookId: book.id, title: item.title },
      });
      if (existing) {
        console.log(`⏭️  Already exists: ${item.title}`);
        continue;
      }

      const entries = await prisma.researchFundJournalEntry.findMany({
        where: {
          bookId: book.id,
          status: "published",
          description: { in: item.entryDescriptions },
        },
        select: { id: true },
      });
      if (entries.length === 0) {
        console.log(`⚠️  No published entries for ${item.title}, skipping`);
        continue;
      }

      await prisma.researchFundExpenditureGroup.create({
        data: {
          bookId: book.id,
          title: item.title,
          description: item.description,
          displayOrder: item.displayOrder,
          outcomes: {
            create: item.outcomes.map((outcome, index) => ({
              label: outcome.label,
              url: outcome.url,
              displayOrder: index + 1,
            })),
          },
          items: { create: entries.map((entry) => ({ entryId: entry.id })) },
        },
      });
      console.log(`✅ Created: ${item.title} (${entries.length} entries)`);
    }
  },
};
