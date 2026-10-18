import type { PrismaClient } from "@prisma/client";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";

function setup() {
  const prisma = {
    researchFundBook: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    politicalOrganization: { findUnique: jest.fn().mockResolvedValue(null) },
    politician: { findMany: jest.fn().mockResolvedValue([]) },
    researchFundJournalEntry: { findFirst: jest.fn() },
  };
  return {
    prisma,
    repository: new PrismaResearchFundRepository(prisma as unknown as PrismaClient),
  };
}

describe("PrismaResearchFundRepository の調研費の公開フラグ", () => {
  it("組織セレクターには調研費を公開する議員だけを出す", async () => {
    const { prisma, repository } = setup();

    await repository.findPoliticians(2026);

    expect(prisma.politician.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isResearchFundPublic: true, books: { some: { financialYear: 2026 } } },
      }),
    );
  });

  it("sitemap には調研費を公開する議員のページだけを載せる", async () => {
    const { prisma, repository } = setup();

    await repository.findPublishedPageRefs();

    expect(prisma.researchFundBook.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          politician: { isResearchFundPublic: true },
          journalEntries: { some: { status: "published" } },
        },
      }),
    );
  });

  it("政党ページの調査研究費セクションには調研費を公開する所属議員だけを出す", async () => {
    const { prisma, repository } = setup();

    await repository.findPublishedByOrganization("team-mirai", 2026);

    const args = prisma.politicalOrganization.findUnique.mock.calls[0][0];
    expect(args.select.politicianMemberships.where).toEqual({
      endedOn: null,
      politician: { isResearchFundPublic: true },
    });
  });

  it.each([true, false])(
    "議員ページには公開フラグ（%s）を添え、公開しない議員でもデータを返す",
    async (isResearchFundPublic) => {
      const { prisma, repository } = setup();
      prisma.researchFundBook.findFirst.mockResolvedValue({
        financialYear: 2026,
        publishedThrough: null,
        asOfDate: null,
        nextUpdateNote: null,
        policyComment: null,
        details: null,
        politician: { name: "サンプル太郎", slug: "sample-taro", isResearchFundPublic },
        journalEntries: [],
        expenditureGroups: [],
      });

      const result = await repository.findPublished("sample-taro", 2026);

      expect(result?.politician).toEqual({ name: "サンプル太郎", slug: "sample-taro" });
      expect(result?.isPublic).toBe(isResearchFundPublic);
    },
  );
});

describe("PrismaResearchFundRepository の領収書（公開用の版だけを配信する）", () => {
  function expenseEntry(id: number, document: unknown) {
    return {
      id: BigInt(id),
      entryDate: new Date("2026-08-13T00:00:00.000Z"),
      description: "視察先への移動",
      note: null,
      splitGroup: null,
      documentId: document ? BigInt(id) : null,
      document,
      lines: [
        {
          id: BigInt(id),
          side: "debit",
          accountKey: "taxi",
          amount: { toNumber: () => 1500 },
          account: { type: "expense", label: "タクシー代", legalLabel: "交通費", legalCategoryKey: "travel" },
        },
      ],
    };
  }

  it("明細には、公開用の版が作成済みの書類だけを表示できるものとして載せ、それ以外は準備中にする", async () => {
    const { prisma, repository } = setup();
    prisma.researchFundBook.findFirst.mockResolvedValue({
      financialYear: 2026,
      publishedThrough: null,
      asOfDate: null,
      nextUpdateNote: null,
      policyComment: null,
      details: null,
      politician: { name: "サンプル太郎", slug: "sample-taro", isResearchFundPublic: true },
      journalEntries: [
        expenseEntry(1, { maskingStatus: "succeeded", maskedKey: "masked-1" }),
        expenseEntry(2, { maskingStatus: "pending", maskedKey: null }),
        // 作り直しの依頼中・失敗は前の版が残っていても配信しない
        expenseEntry(3, { maskingStatus: "pending", maskedKey: "masked-3" }),
        expenseEntry(4, { maskingStatus: "failed", maskedKey: "masked-4" }),
        expenseEntry(5, null),
      ],
      expenditureGroups: [],
    });

    const result = await repository.findPublished("sample-taro", 2026);

    expect(
      result?.expenses.map(({ entryId, hasReceipt, receiptReady, receiptMime }) => ({
        entryId,
        hasReceipt,
        receiptReady,
        receiptMime,
      })),
    ).toEqual([
      { entryId: "1", hasReceipt: true, receiptReady: true, receiptMime: "application/pdf" },
      { entryId: "2", hasReceipt: true, receiptReady: false, receiptMime: null },
      { entryId: "3", hasReceipt: true, receiptReady: false, receiptMime: null },
      { entryId: "4", hasReceipt: true, receiptReady: false, receiptMime: null },
      { entryId: "5", hasReceipt: false, receiptReady: false, receiptMime: null },
    ]);
    // 公開ページの射影に原本のキーを読み出さない
    const select = prisma.researchFundBook.findFirst.mock.calls[0][0].select;
    expect(select.journalEntries.select.document).toEqual({
      select: { maskingStatus: true, maskedKey: true },
    });
  });

  it("配信するのは作成済みの公開用の版のキーで、原本のキーは返さない", async () => {
    const { prisma, repository } = setup();
    prisma.researchFundJournalEntry.findFirst.mockResolvedValue({
      document: { maskingStatus: "succeeded", maskedKey: "masked-1" },
    });

    await expect(repository.findPublishedReceipt("1")).resolves.toEqual({ maskedKey: "masked-1" });
    expect(prisma.researchFundJournalEntry.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(1), status: "published" },
      select: { document: { select: { maskingStatus: true, maskedKey: true } } },
    });
  });

  it.each([
    ["公開用の版がまだ無い", { maskingStatus: "pending", maskedKey: null }],
    ["作り直しの依頼中", { maskingStatus: "pending", maskedKey: "masked-1" }],
    ["作り直し中", { maskingStatus: "running", maskedKey: "masked-1" }],
    ["作り直しに失敗した", { maskingStatus: "failed", maskedKey: "masked-1" }],
    ["書類の無い", null],
  ])("%s仕訳の領収書は配信しない", async (_label, document) => {
    const { prisma, repository } = setup();
    prisma.researchFundJournalEntry.findFirst.mockResolvedValue({ document });

    await expect(repository.findPublishedReceipt("1")).resolves.toBeNull();
  });

  it("公開されていない・存在しない仕訳の領収書は配信しない", async () => {
    const { prisma, repository } = setup();
    prisma.researchFundJournalEntry.findFirst.mockResolvedValue(null);

    await expect(repository.findPublishedReceipt("1")).resolves.toBeNull();
  });
});
