import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { PrismaPublicationRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-publication.repository";

function line(side: "debit" | "credit", accountKey: string, amount: number, type: string) {
  return {
    side,
    accountKey,
    amount: new Prisma.Decimal(amount),
    account: { label: accountKey === "taxi" ? "タクシー代" : accountKey, type, legalLabel: null },
  };
}
function entry(overrides: Record<string, unknown>) {
  return {
    id: BigInt(1),
    entryDate: new Date("2026-08-13T00:00:00.000Z"),
    description: "視察先への移動",
    status: "approved",
    lines: [line("debit", "taxi", 1500, "expense"), line("credit", "bank", 1500, "asset")],
    ...overrides,
  };
}
function setup(journalEntries: ReturnType<typeof entry>[], publishedThrough: Date | null = null) {
  const tx = {
    researchFundJournalEntry: {
      updateMany: jest.fn().mockResolvedValue({ count: journalEntries.length }),
      findMany: jest.fn().mockResolvedValue(journalEntries),
    },
    researchFundBook: {
      findUnique: jest.fn().mockResolvedValue({ publishedThrough, journalEntries }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const repository = new PrismaPublicationRepository({
    ...tx,
    $transaction: jest.fn(async (fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaClient);
  return { repository, tx };
}

test("公開済みは集計行に、確認済は公開の候補に振り分ける", async () => {
  const { repository } = setup([
    entry({ id: BigInt(1), status: "published" }),
    entry({
      id: BigInt(2),
      status: "approved",
      entryDate: new Date("2026-09-01T00:00:00.000Z"),
      description: "調査研究費 9月分",
      lines: [
        line("debit", "bank", 1_000_000, "asset"),
        line("credit", "grant-income", 1_000_000, "income"),
      ],
    }),
  ], new Date("2026-08-31T00:00:00.000Z"));
  await expect(repository.snapshot("1")).resolves.toEqual({
    published: [{ date: "2026-08-13", accountKey: "taxi", amount: 1500, type: "expense" }],
    candidates: [
      {
        id: "2",
        description: "調査研究費 9月分",
        date: "2026-09-01",
        accountKey: "grant-income",
        amount: 1_000_000,
        type: "grant",
      },
    ],
    accounts: {
      taxi: { label: "タクシー代", legalLabel: "" },
      bank: { label: "bank", legalLabel: "" },
      "grant-income": { label: "grant-income", legalLabel: "" },
    },
    publishedThrough: "2026-08-31",
  });
});

test("費用1行に射影できない仕訳は公開の候補にしない", async () => {
  const { repository } = setup([
    entry({
      lines: [
        line("debit", "taxi", 1000, "expense"),
        line("debit", "postage", 500, "expense"),
        line("credit", "bank", 1500, "asset"),
      ],
    }),
  ]);
  await expect(repository.snapshot("1")).resolves.toMatchObject({ candidates: [] });
});

test("帳簿が無ければ null を返す", async () => {
  const { repository, tx } = setup([]);
  tx.researchFundBook.findUnique.mockResolvedValue(null);
  await expect(repository.snapshot("1")).resolves.toBeNull();
  await expect(repository.pending("1", ["1"])).resolves.toBeNull();
});

test("公開対象の現在の状態と帳簿の公開範囲を返す", async () => {
  const { repository, tx } = setup([entry({})], new Date("2026-07-31T00:00:00.000Z"));
  await expect(repository.pending("1", ["1"])).resolves.toEqual({
    entries: [{ id: "1", status: "approved", entryDate: "2026-08-13", rowCount: 1 }],
    publishedThrough: "2026-07-31",
  });
  expect(tx.researchFundJournalEntry.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { bookId: BigInt(1), id: { in: [BigInt(1)] } } }),
  );
});

test("候補にできない仕訳の行数もそのまま返し、公開の可否はユースケースが判定できる", async () => {
  const { repository } = setup([
    entry({
      lines: [
        line("debit", "taxi", 1000, "expense"),
        line("debit", "postage", 500, "expense"),
        line("credit", "bank", 1500, "asset"),
      ],
    }),
  ]);
  await expect(repository.pending("1", ["1"])).resolves.toMatchObject({
    entries: [{ id: "1", rowCount: 2 }],
  });
});

test("確認済だけを公開済みにし、公開範囲は既存値より新しいときだけ前進させる", async () => {
  const { repository, tx } = setup([entry({})]);
  await repository.publish("1", ["1"], "2026-08-31");
  expect(tx.researchFundJournalEntry.updateMany).toHaveBeenCalledWith({
    where: { bookId: BigInt(1), id: { in: [BigInt(1)] }, status: "approved" },
    data: { status: "published", publishedAt: expect.any(Date) },
  });
  expect(tx.researchFundBook.updateMany).toHaveBeenCalledWith({
    where: {
      id: BigInt(1),
      OR: [{ publishedThrough: null }, { publishedThrough: { lt: new Date("2026-08-31") } }],
    },
    data: { publishedThrough: new Date("2026-08-31") },
  });
});

test("状態が変わって更新できなかった仕訳があればロールバックする", async () => {
  const { repository, tx } = setup([entry({})]);
  tx.researchFundJournalEntry.updateMany.mockResolvedValue({ count: 0 });
  await expect(repository.publish("1", ["1"], "2026-08-31")).rejects.toThrow(
    "仕訳の状態が変わりました",
  );
  expect(tx.researchFundBook.updateMany).not.toHaveBeenCalled();
});
