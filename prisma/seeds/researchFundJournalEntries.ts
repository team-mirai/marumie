import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Seeder } from "@/prisma/seeds/lib/types";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";

type SourceRow = [string, number, string, number, number?, string?];

// 旧分類 → 20分類の対応表。項目で判別できるものは下の関数で細分化する。
// 0 交通費 → transportation
// 1 システム・サーバ利用料 → telecom-it
// 2 調査研究費 → books-newspapers（入館料は misc）
// 3 文具・事務用消耗品費 → stationery-supplies
// 4 交流費 → hospitality（会場・会議室は meetings、のぼりは advertising、電報は postage）
// 5 日用消耗品費 → stationery-supplies（来客用飲食物は hospitality）
// 6 IT機器・周辺機器費 → pc-electronics（バッグ・テレビ台は stationery-supplies）
// 7 住居費 → housing / lodging
// 8 通信費 → telecom-it、9 光熱水費 → utilities、10 広報費 → advertising
// 判別できない分類は misc。
const categoryKeys = [
  "transportation",
  "telecom-it",
  "books-newspapers",
  "stationery-supplies",
  "hospitality",
  "stationery-supplies",
  "pc-electronics",
  "housing",
  "telecom-it",
  "utilities",
  "advertising",
];

function accountKey(category: number, description: string): string {
  if (category === 2 && description === "入館料") return "misc";
  if (category === 4) {
    if (["会場費", "会議室利用料"].includes(description)) return "meetings";
    if (description === "のぼり代") return "advertising";
    if (description === "電報代") return "postage";
  }
  if (category === 5 && (description.startsWith("来客用") || description === "飲料水代")) {
    return "hospitality";
  }
  if (category === 6 && ["バッグ代", "テレビ台代"].includes(description))
    return "stationery-supplies";
  if (category === 7 && description.startsWith("宿泊")) return "lodging";
  return categoryKeys[category] ?? "misc";
}

function generateLines(pattern: "expense" | "grant", key: string, amount: number) {
  const result = JournalPosting.generate({
    ...(pattern === "grant"
      ? { pattern, source: "grant" as const }
      : { pattern, source: "manual" as const }),
    amount,
    account: { key, type: pattern === "grant" ? "income" : "expense" },
    assetAccount: { key: "bank", type: "asset" },
  });
  if (result.status === "invalid")
    throw new Error(`Invalid seed posting: ${JSON.stringify(result.errors)}`);
  return result.value.lines.map((line) => ({ ...line }));
}

export function buildResearchFundJournalEntries(): Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] {
  // プロトタイプの JS は実行せず、JSON 形式の配列部分だけを読む。
  const source = readFileSync(
    resolve(__dirname, "../../docs/reference/design_handoff_choken/design/choken-data.js"),
    "utf8",
  );
  const match = source.match(/window\.CHOKEN_ROWS\s*=\s*(\[[\s\S]*\]);\s*$/);
  if (!match) throw new Error("CHOKEN_ROWS not found");
  const rows: SourceRow[] = JSON.parse(match[1]);
  const entries: Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] = [];
  for (const [rowIndex, [date, category, description, amount, count = 1, note]] of rows.entries()) {
    if (!Number.isSafeInteger(count) || count < 1)
      throw new Error(`Invalid split count at row ${rowIndex}`);
    const entryDate = new Date(`2026-${date.replace("/", "-")}T00:00:00.000Z`);
    const status = date >= "08/16" ? "draft" : date >= "08/10" ? "approved" : "published";
    for (let part = 0; part < count; part++) {
      entries.push({
        entryDate,
        description,
        source: "manual",
        status,
        // 同額・同日・同項目の分割行も別仕訳として保持するシード専用の識別子。
        hash: `seed:choken:2026:row:${rowIndex}:part:${part}`,
        splitGroup: count > 1 ? `seed:choken:2026:row:${rowIndex}` : null,
        note: note ?? null,
        publishedAt: status === "published" ? new Date("2026-08-31T00:00:00.000Z") : null,
        lines: { create: generateLines("expense", accountKey(category, description), amount) },
      });
    }
  }
  for (let month = 2; month <= 8; month++) {
    entries.push({
      entryDate: new Date(Date.UTC(2026, month - 1, 1)),
      description: `調査研究広報滞在費 ${month}月分`,
      source: "grant",
      status: "published",
      hash: `seed:choken:2026:grant:${month}`,
      publishedAt: new Date("2026-08-31T00:00:00.000Z"),
      lines: { create: generateLines("grant", "grant-income", 1_000_000) },
    });
  }
  return entries;
}

// 2人目の公開議員（サンプル 美咲）の仕訳。トップの SP で議員カードを複数枚開く E2E のため、
// 太郎とは金額の違う少数の published の仕訳と支給だけを持つ。
const secondPoliticianExpenses: [date: string, key: string, description: string, amount: number][] = [
  ["04/03", "transportation", "電車代", 12_400],
  ["04/10", "books-newspapers", "書籍代", 38_500],
  ["04/22", "telecom-it", "携帯電話料金", 9_800],
  ["05/08", "meetings", "会議室利用料", 66_000],
  ["05/20", "transportation", "航空券代", 54_300],
  ["06/05", "advertising", "チラシ印刷代", 220_000],
  ["06/18", "books-newspapers", "新聞購読料", 4_900],
  ["07/01", "housing", "事務所家賃", 180_000],
  ["07/15", "telecom-it", "携帯電話料金", 9_800],
  ["08/02", "transportation", "タクシー代", 3_600],
];

export function buildSecondPoliticianJournalEntries(): Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] {
  const publishedAt = new Date("2026-08-31T00:00:00.000Z");
  const entries: Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] =
    secondPoliticianExpenses.map(([date, key, description, amount], index) => ({
      entryDate: new Date(`2026-${date.replace("/", "-")}T00:00:00.000Z`),
      description,
      source: "manual",
      status: "published",
      hash: `seed:choken-misaki:2026:row:${index}`,
      publishedAt,
      lines: { create: generateLines("expense", key, amount) },
    }));
  for (let month = 4; month <= 8; month++) {
    entries.push({
      entryDate: new Date(Date.UTC(2026, month - 1, 1)),
      description: `調査研究広報滞在費 ${month}月分`,
      source: "grant",
      status: "published",
      hash: `seed:choken-misaki:2026:grant:${month}`,
      publishedAt,
      lines: { create: generateLines("grant", "grant-income", 1_000_000) },
    });
  }
  return entries;
}

// サンプル 美咲の 2025 年分（2025 年から在職）。トップの「所属議員の調研費」で年を切り替える E2E のため、
// 2026 年分とは金額の違う少数の published の仕訳と支給だけを持つ。
const secondPolitician2025Expenses: [date: string, key: string, description: string, amount: number][] =
  [
    ["10/06", "transportation", "電車代", 8_200],
    ["11/12", "books-newspapers", "書籍代", 21_000],
    ["12/03", "advertising", "チラシ印刷代", 150_000],
  ];

export function buildSecondPolitician2025JournalEntries(): Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] {
  const publishedAt = new Date("2026-01-31T00:00:00.000Z");
  const entries: Prisma.ResearchFundJournalEntryCreateWithoutBookInput[] =
    secondPolitician2025Expenses.map(([date, key, description, amount], index) => ({
      entryDate: new Date(`2025-${date.replace("/", "-")}T00:00:00.000Z`),
      description,
      source: "manual",
      status: "published",
      hash: `seed:choken-misaki:2025:row:${index}`,
      publishedAt,
      lines: { create: generateLines("expense", key, amount) },
    }));
  for (let month = 10; month <= 12; month++) {
    entries.push({
      entryDate: new Date(Date.UTC(2025, month - 1, 1)),
      description: `調査研究広報滞在費 ${month}月分`,
      source: "grant",
      status: "published",
      hash: `seed:choken-misaki:2025:grant:${month}`,
      publishedAt,
      lines: { create: generateLines("grant", "grant-income", 1_000_000) },
    });
  }
  return entries;
}

const seedTargets = [
  {
    slug: "sample-taro",
    financialYear: 2026,
    publishedThrough: "2026-08-31",
    hashPrefix: "seed:choken:2026:",
    build: buildResearchFundJournalEntries,
  },
  {
    slug: "sample-misaki",
    financialYear: 2026,
    publishedThrough: "2026-08-31",
    hashPrefix: "seed:choken-misaki:2026:",
    build: buildSecondPoliticianJournalEntries,
  },
  {
    slug: "sample-misaki",
    financialYear: 2025,
    publishedThrough: "2025-12-31",
    hashPrefix: "seed:choken-misaki:2025:",
    build: buildSecondPolitician2025JournalEntries,
  },
];

export const researchFundJournalEntriesSeeder: Seeder = {
  name: "Research Fund Journal Entries",
  async seed(prisma: PrismaClient) {
    // 調研費を公開する開発用議員だけに投入。E2E 用・無所属・準備中の議員には投入しない。
    for (const target of seedTargets) {
      const politician = await prisma.politician.findUnique({ where: { slug: target.slug } });
      if (!politician) throw new Error(`Seed politician ${target.slug} not found`);
      const book = await prisma.researchFundBook.findUnique({
        where: {
          politicianId_financialYear: {
            politicianId: politician.id,
            financialYear: target.financialYear,
          },
        },
      });
      if (!book)
        throw new Error(
          `Seed research fund book for ${target.slug} (${target.financialYear}) not found`,
        );
      const entries = target.build();
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.researchFundJournalEntry.findMany({
            where: { bookId: book.id, hash: { startsWith: target.hashPrefix } },
            select: { hash: true },
          });
          const hashes = new Set(existing.map((entry) => entry.hash));
          for (const entry of entries) {
            if (hashes.has(entry.hash ?? "")) continue;
            await tx.researchFundJournalEntry.create({
              data: { ...entry, book: { connect: { id: book.id } } },
            });
          }
          await tx.researchFundBook.update({
            where: { id: book.id },
            data: { publishedThrough: new Date(`${target.publishedThrough}T00:00:00.000Z`) },
          });
        },
        { timeout: 30_000 },
      );
      console.log(
        `✅ Seeded ${target.slug} (${target.financialYear}): ${entries.length} entries (existing entries preserved)`,
      );
    }
  },
};
