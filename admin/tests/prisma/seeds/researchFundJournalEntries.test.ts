import type { PrismaClient } from "@prisma/client";
import {
  buildResearchFundJournalEntries,
  buildSecondPoliticianJournalEntries,
  researchFundJournalEntriesSeeder,
} from "@/prisma/seeds/researchFundJournalEntries";

describe("research fund journal seed", () => {
  const entries = buildResearchFundJournalEntries();
  const expenses = entries.filter((entry) => entry.source === "manual");
  const lines = (entry: (typeof entries)[number]) => {
    const create = entry.lines?.create;
    return Array.isArray(create) ? create : create ? [create] : [];
  };

  it("expands the source into 296 expenses with the reference monthly counts and totals", () => {
    expect(expenses).toHaveLength(296);
    expect(new Set(entries.map((entry) => entry.hash)).size).toBe(303);
    const monthly = new Map<number, { count: number; amount: number }>();
    for (const entry of expenses) {
      const month = new Date(entry.entryDate).getUTCMonth() + 1;
      const totals = monthly.get(month) ?? { count: 0, amount: 0 };
      totals.count++;
      totals.amount += Number(lines(entry).find((line) => line.side === "debit")?.amount);
      monthly.set(month, totals);
    }
    expect(Object.fromEntries(monthly)).toEqual({
      2: { count: 33, amount: 126860 },
      3: { count: 65, amount: 362307 },
      4: { count: 99, amount: 861279 },
      5: { count: 32, amount: 364704 },
      6: { count: 37, amount: 369940 },
      7: { count: 13, amount: 106156 },
      8: { count: 17, amount: 21335 },
    });
    expect([...monthly.values()].reduce((sum, month) => sum + month.amount, 0)).toBe(2212581);
  });

  it("generates balanced postings and seven monthly grants", () => {
    for (const entry of entries) {
      const posting = lines(entry);
      expect(posting).toHaveLength(2);
      expect(posting[0].side).toBe("debit");
      expect(posting[1].side).toBe("credit");
      expect(posting[0].amount).toBe(posting[1].amount);
      expect(Number(posting[0].amount)).toBeGreaterThan(0);
    }
    const grants = entries.filter((entry) => entry.source === "grant");
    expect(grants.map((entry) => new Date(entry.entryDate).getUTCMonth() + 1)).toEqual([
      2, 3, 4, 5, 6, 7, 8,
    ]);
    for (const entry of grants) {
      expect(entry.status).toBe("published");
      expect(lines(entry)).toEqual([
        { side: "debit", accountKey: "bank", amount: 1000000 },
        { side: "credit", accountKey: "grant-income", amount: 1000000 },
      ]);
    }
  });

  it("preserves split groups and notes, and provides all three statuses", () => {
    const toner = expenses.filter(
      (entry) =>
        entry.description === "トナー代" &&
        new Date(entry.entryDate).toISOString().startsWith("2026-04-23"),
    );
    expect(toner).toHaveLength(10);
    expect(new Set(toner.map((entry) => entry.splitGroup)).size).toBe(1);
    expect(toner[0].splitGroup).toBeTruthy();
    expect(expenses.find((entry) => entry.description === "宿泊取消料")?.note).toBe(
      "JR東日本ホテルメッツ プレミア札幌（2026/07/30チェックイン分）キャンセル・不課税",
    );
    expect(expenses.filter((entry) => entry.status === "published")).toHaveLength(281);
    expect(expenses.filter((entry) => entry.status === "approved")).toHaveLength(3);
    expect(expenses.filter((entry) => entry.status === "draft")).toHaveLength(12);
    for (const entry of expenses.filter((entry) => entry.status !== "published")) {
      expect(new Date(entry.entryDate).getUTCMonth()).toBe(7);
      expect(entry.publishedAt).toBeNull();
    }
  });

  it.each([
    ["タクシー代", "transportation"],
    ["電車代", "transportation"],
    ["書籍代", "books-newspapers"],
    ["入館料", "misc"],
    ["トナー代", "stationery-supplies"],
    ["来客用コーヒー代", "hospitality"],
    ["パソコン代", "pc-electronics"],
    ["宿舎使用料", "housing"],
    ["宿泊費", "lodging"],
    ["会議室利用料", "meetings"],
    ["のぼり代", "advertising"],
    ["電報代", "postage"],
    ["ChatGPT利用料", "telecom-it"],
    ["電気代", "utilities"],
  ])("maps %s to %s", (description, key) => {
    const matching = expenses.filter((entry) => entry.description === description);
    expect(matching.length).toBeGreaterThan(0);
    for (const entry of matching) expect(lines(entry)[0]).toMatchObject({ accountKey: key });
  });

  it("gives sample-misaki a small set of published expenses and grants with their own hashes", () => {
    const second = buildSecondPoliticianJournalEntries();
    expect(second.every((entry) => entry.status === "published")).toBe(true);
    expect(second.filter((entry) => entry.source === "grant")).toHaveLength(5);
    expect(second.filter((entry) => entry.source === "manual")).toHaveLength(10);
    expect(new Set(second.map((entry) => entry.hash)).size).toBe(second.length);
    const taroHashes = new Set(entries.map((entry) => entry.hash));
    for (const entry of second) expect(taroHashes.has(entry.hash)).toBe(false);
  });

  it("seeds sample-taro's and sample-misaki's 2026 books and does not duplicate entries on rerun", async () => {
    const saved = new Map<bigint, { hash: string }[]>();
    const tx = {
      researchFundJournalEntry: {
        findMany: jest.fn(async ({ where }) => [...(saved.get(where.bookId) ?? [])]),
        create: jest.fn(async ({ data }) => {
          const bookId = data.book.connect.id;
          saved.set(bookId, [...(saved.get(bookId) ?? []), { hash: data.hash }]);
        }),
      },
      researchFundBook: { update: jest.fn() },
    };
    const politicianIds: Record<string, bigint> = {
      "sample-taro": BigInt(10),
      "sample-misaki": BigInt(11),
    };
    const prisma = {
      politician: {
        findUnique: jest.fn(async ({ where }) => ({ id: politicianIds[where.slug] })),
      },
      researchFundBook: {
        findUnique: jest.fn(async ({ where }) => ({
          id: where.politicianId_financialYear.politicianId + BigInt(10),
        })),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    await researchFundJournalEntriesSeeder.seed(prisma as unknown as PrismaClient);
    await researchFundJournalEntriesSeeder.seed(prisma as unknown as PrismaClient);
    expect(prisma.politician.findUnique).toHaveBeenCalledWith({ where: { slug: "sample-taro" } });
    expect(prisma.politician.findUnique).toHaveBeenCalledWith({ where: { slug: "sample-misaki" } });
    expect(prisma.researchFundBook.findUnique).toHaveBeenCalledWith({
      where: { politicianId_financialYear: { politicianId: BigInt(10), financialYear: 2026 } },
    });
    expect(saved.get(BigInt(20))).toHaveLength(303);
    expect(saved.get(BigInt(21))).toHaveLength(15);
    expect(tx.researchFundJournalEntry.create).toHaveBeenCalledTimes(318);
    for (const bookId of [BigInt(20), BigInt(21)]) {
      expect(tx.researchFundBook.update).toHaveBeenCalledWith({
        where: { id: bookId },
        data: { publishedThrough: new Date("2026-08-31T00:00:00.000Z") },
      });
    }
  });
});
