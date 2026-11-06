import type { PrismaClient } from "@prisma/client";
import { PrismaResearchFundRepository } from "@/server/contexts/research-fund/infrastructure/repositories/prisma-research-fund.repository";

function setup() {
  const prisma = {
    researchFundBook: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    politicalOrganization: { findUnique: jest.fn().mockResolvedValue(null) },
    politician: { findMany: jest.fn().mockResolvedValue([]) },
    researchFundJournalEntry: { findFirst: jest.fn() },
    researchFundAccount: {
      findMany: jest.fn().mockResolvedValue([
        { legalCategoryKey: "stay", legalLabel: "⑨ 滞在費" },
        { legalCategoryKey: "research", legalLabel: "⑦ 調査研究費" },
      ]),
    },
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

describe("PrismaResearchFundRepository の法定区分の上書き（#1880）", () => {
  function entry(id: number, override: string | null) {
    return {
      id: BigInt(id),
      entryDate: new Date("2026-08-13T00:00:00.000Z"),
      description: "視察の宿泊",
      note: null,
      splitGroup: null,
      documentId: null,
      document: null,
      legalCategoryOverride: override === null ? null : { legalCategoryKey: override },
      lines: [
        {
          id: BigInt(id),
          side: "debit",
          accountKey: "lodging",
          amount: { toNumber: () => 10000 },
          account: {
            type: "expense",
            label: "宿泊費",
            legalLabel: "⑨ 滞在費",
            legalCategoryKey: "stay",
          },
        },
      ],
    };
  }
  function book(journalEntries: unknown[]) {
    return {
      financialYear: 2025,
      publishedThrough: null,
      asOfDate: null,
      nextUpdateNote: null,
      policyComment: null,
      details: null,
      politician: { name: "サンプル太郎", slug: "sample-taro", isResearchFundPublic: true },
      journalEntries,
      expenditureGroups: [],
    };
  }
  const research = { key: "research", label: "⑦ 調査研究費" };

  it("議員ページでは、上書きした仕訳の集計行と明細に上書き先の区分を添える", async () => {
    const { prisma, repository } = setup();
    prisma.researchFundBook.findFirst.mockResolvedValue(
      book([entry(1, "research"), entry(2, null)]),
    );

    const result = await repository.findPublished("sample-taro", 2025);

    expect(result?.rows.map((row) => row.legalCategoryOverride)).toEqual([research, undefined]);
    expect(result?.expenses.map((expense) => expense.legalCategoryOverride)).toEqual([
      research,
      undefined,
    ]);
    // 科目の既定の区分（科目マスタの対応）は変えない
    expect(result?.accounts.lodging).toEqual({
      label: "宿泊費",
      legalLabel: "⑨ 滞在費",
      legalCategoryKey: "stay",
    });
  });

  it("上書きが1件も無い帳簿では科目マスタを読まず、行に上書きの項目を足さない", async () => {
    const { prisma, repository } = setup();
    prisma.researchFundBook.findFirst.mockResolvedValue(book([entry(1, null)]));

    const result = await repository.findPublished("sample-taro", 2025);

    expect(prisma.researchFundAccount.findMany).not.toHaveBeenCalled();
    expect(result?.rows[0]).not.toHaveProperty("legalCategoryOverride");
    expect(result?.expenses[0]).not.toHaveProperty("legalCategoryOverride");
  });

  it("政党ページの集計行にも、上書き先の区分を添える", async () => {
    const { prisma, repository } = setup();
    prisma.politicalOrganization.findUnique.mockResolvedValue({
      slug: "team-mirai",
      displayName: "チームみらい",
      politicianMemberships: [
        {
          politician: {
            name: "サンプル太郎",
            slug: "sample-taro",
            books: [
              {
                asOfDate: null,
                publishedThrough: null,
                journalEntries: [entry(1, "research"), entry(2, null)],
              },
            ],
          },
        },
      ],
    });

    const result = await repository.findPublishedByOrganization("team-mirai", 2025);

    expect(result?.politicians[0].rows.map((row) => row.legalCategoryOverride)).toEqual([
      research,
      undefined,
    ]);
  });
});
