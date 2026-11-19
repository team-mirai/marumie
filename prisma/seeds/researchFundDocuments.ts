import type { PrismaClient } from "@prisma/client";
import type { Seeder } from "./lib/types";

interface ReceiptSeedData {
  /** 領収書を紐づける仕訳（researchFundJournalEntries のシード識別子） */
  hash: string;
  mime: string;
  originalFilename: string;
}

// 公開ページの「領収書」ピルとモーダルの確認用。ストレージに原本は置かないので、
// 署名URLの発行に失敗して画像は読めないが、ピルの表示とモーダルの開閉は確認できる。
const data: ReceiptSeedData[] = [
  // 2026.8.2 イヤホン代（明細の先頭）: 画像の領収書
  { hash: "seed:choken:2026:row:229:part:0", mime: "image/png", originalFilename: "earphone.png" },
  // 2026.8.1 新聞購読料: PDF の領収書
  { hash: "seed:choken:2026:row:228:part:0", mime: "application/pdf", originalFilename: "nikkei.pdf" },
  // 2026.6.30 ボネクタ利用料（用途1に紐づく）: 「★ 用途N」と並ぶ行
  { hash: "seed:choken:2026:row:216:part:0", mime: "image/jpeg", originalFilename: "bonecta.jpg" },
];

export const researchFundDocumentsSeeder: Seeder = {
  name: "Research Fund Documents",
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
      const entry = await prisma.researchFundJournalEntry.findFirst({
        where: { bookId: book.id, hash: item.hash },
        select: { id: true, documentId: true, description: true },
      });
      if (!entry) {
        console.log(`⚠️  Journal entry not found: ${item.hash}, skipping`);
        continue;
      }
      if (entry.documentId !== null) {
        console.log(`⏭️  Already has receipt: ${entry.description}`);
        continue;
      }
      await prisma.researchFundJournalEntry.update({
        where: { id: entry.id },
        data: {
          document: {
            create: {
              bookId: book.id,
              storageKey: `seed/receipts/${item.originalFilename}`,
              mime: item.mime,
              originalFilename: item.originalFilename,
            },
          },
        },
      });
      console.log(`✅ Attached receipt: ${entry.description}`);
    }
  },
};
