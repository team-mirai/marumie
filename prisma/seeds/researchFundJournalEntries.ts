import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Seeder } from "@/prisma/seeds/lib/types";
import { JournalPosting } from "@/server/contexts/research-fund/domain/models/journal-posting";

type SourceRow = [string, number, string, number, number?, string?];

// 旧分類 → 21分類の対応表。項目で判別できるものは下の関数で細分化する。
// 0 交通費 → taxi / public-transport
// 1 システム・サーバ利用料 → telecom-it
// 2 調査研究費 → books-newspapers（入館料は misc）
// 3 文具・事務用消耗品費 → stationery-supplies
// 4 交流費 → hospitality（会場・会議室は meetings、のぼりは printing-pr、電報は postage）
// 5 日用消耗品費 → stationery-supplies（来客用飲食物は hospitality）
// 6 IT機器・周辺機器費 → pc-electronics（バッグ・テレビ台は stationery-supplies）
// 7 住居費 → housing / lodging
// 8 通信費 → telecom-it、9 光熱水費 → utilities、10 広報費 → printing-pr
// 判別できない分類は misc。
const categoryKeys = [
  "taxi",
  "telecom-it",
  "books-newspapers",
  "stationery-supplies",
  "hospitality",
  "stationery-supplies",
  "pc-electronics",
  "housing",
  "telecom-it",
  "utilities",
  "printing-pr",
];

function accountKey(category: number, description: string): string {
  if (category === 0 && description === "電車代") return "public-transport";
  if (category === 2 && description === "入館料") return "misc";
  if (category === 4) {
    if (["会場費", "会議室利用料"].includes(description)) return "meetings";
    if (description === "のぼり代") return "printing-pr";
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
      description: `2026年${month}月分 調査研究費支給`,
      source: "grant",
      status: "published",
      hash: `seed:choken:2026:grant:${month}`,
      publishedAt: new Date("2026-08-31T00:00:00.000Z"),
      lines: { create: generateLines("grant", "grant-income", 1_000_000) },
    });
  }
  return entries;
}

export const researchFundJournalEntriesSeeder: Seeder = {
  name: "Research Fund Journal Entries",
  async seed(prisma: PrismaClient) {
    // 所属ありの開発用議員だけに投入。E2E テナント・無所属議員には投入しない。
    const politician = await prisma.politician.findUnique({ where: { slug: "sample-taro" } });
    if (!politician) throw new Error("Seed politician sample-taro not found");
    const book = await prisma.researchFundBook.findUnique({
      where: { politicianId_financialYear: { politicianId: politician.id, financialYear: 2026 } },
    });
    if (!book) throw new Error("Seed research fund book for sample-taro (2026) not found");
    const entries = buildResearchFundJournalEntries();
    await prisma.$transaction(
      async (tx) => {
        const existing = await tx.researchFundJournalEntry.findMany({
          where: { bookId: book.id, hash: { startsWith: "seed:choken:2026:" } },
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
          data: { publishedThrough: new Date("2026-08-31T00:00:00.000Z") },
        });
      },
      { timeout: 30_000 },
    );
    console.log("✅ Seeded sample-taro: 296 expenses + 7 grants (existing entries preserved)");
  },
};
