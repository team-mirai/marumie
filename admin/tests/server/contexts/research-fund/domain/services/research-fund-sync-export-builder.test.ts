import { Prisma } from "@prisma/client";
import type { ResearchFundSyncSourcePolitician } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";
import { buildResearchFundSyncExport } from "@/server/contexts/research-fund/domain/services/research-fund-sync-export-builder";

const EXPORTED_AT = new Date("2026-11-16T01:23:45.000Z");
const CREATED_AT = new Date("2026-04-01T09:00:00.000Z");
const UPDATED_AT = new Date("2026-04-02T09:00:00.000Z");
const timestamps = { createdAt: CREATED_AT, updatedAt: UPDATED_AT };

type SourceBook = ResearchFundSyncSourcePolitician["books"][number];
type SourceEntry = SourceBook["journalEntries"][number];

function sourceEntry(overrides: Partial<SourceEntry> = {}): SourceEntry {
  return {
    hash: "hash-1",
    // @db.Date のカラムは Prisma から UTC 0 時の Date として返る
    entryDate: new Date("2026-05-31T00:00:00.000Z"),
    description: "書籍購入",
    status: "published",
    source: "scan",
    splitGroup: null,
    note: null,
    memo: null,
    advancedBy: null,
    settledAt: null,
    payee: null,
    payeeLinkSource: null,
    payeeLinkConfidence: null,
    payeeLinkReason: null,
    receiptAbsent: false,
    receiptAbsenceReason: null,
    fromFundManagementOrg: false,
    treatAsOverTenThousand: null,
    publishedAt: null,
    ...timestamps,
    lines: [
      { side: "debit", accountKey: "books", amount: new Prisma.Decimal("3300") },
      { side: "credit", accountKey: "bank", amount: new Prisma.Decimal("3300") },
    ],
    legalCategoryOverride: null,
    ...overrides,
  };
}

function sourceBook(overrides: Partial<SourceBook> = {}): SourceBook {
  return {
    financialYear: 2026,
    status: "active",
    publishedThrough: null,
    asOfDate: null,
    nextUpdateNote: null,
    policyComment: null,
    details: null,
    allowLegalCategoryOverride: false,
    ...timestamps,
    journalEntries: [],
    expenditureGroups: [],
    ...overrides,
  };
}

function sourcePolitician(
  overrides: Partial<ResearchFundSyncSourcePolitician> = {},
): ResearchFundSyncSourcePolitician {
  return {
    profile: {
      slug: "taro",
      name: "未来太郎",
      nameKana: "みらいたろう",
      termStart: new Date("2025-07-20T00:00:00.000Z"),
      displayOrder: 1,
      isResearchFundPublic: true,
      house: "sangiin",
      constituency: "比例代表",
      profileUrl: null,
      websiteUrl: "https://example.com",
      snsUrls: ["https://x.com/taro"],
      ...timestamps,
    },
    memberships: [],
    payees: [],
    prompts: [],
    addressSearchPrompts: [],
    books: [],
    ...overrides,
  };
}

function build(sources: ResearchFundSyncSourcePolitician[]) {
  return buildResearchFundSyncExport({
    sources,
    exportedAt: EXPORTED_AT,
    sourceEnvironment: "production",
    latestMigrationName: "20261101000000_sample",
  });
}

describe("buildResearchFundSyncExport", () => {
  it("形式バージョン・書き出し日時・環境・マイグレーション名をメタに載せる", () => {
    const result = build([]);

    expect(result.meta).toEqual({
      formatVersion: 1,
      exportedAt: "2026-11-16T01:23:45.000Z",
      sourceEnvironment: "production",
      latestMigrationName: "20261101000000_sample",
      politicians: [],
    });
  });

  it("選んだ議員室を渡された順にすべて書き出す", () => {
    const result = build([
      sourcePolitician(),
      sourcePolitician({ profile: { ...sourcePolitician().profile, slug: "hanako" } }),
    ]);

    expect(result.politicians.map((p) => p.profile.slug)).toEqual(["taro", "hanako"]);
    expect(result.meta.politicians.map((p) => p.slug)).toEqual(["taro", "hanako"]);
  });

  it("議員のプロフィールを日付・日時の文字列にして書き出し、顔写真は含めない", () => {
    const [politician] = build([sourcePolitician()]).politicians;

    expect(politician.profile).toEqual({
      slug: "taro",
      name: "未来太郎",
      nameKana: "みらいたろう",
      termStart: "2025-07-20",
      displayOrder: 1,
      isResearchFundPublic: true,
      house: "sangiin",
      constituency: "比例代表",
      profileUrl: null,
      websiteUrl: "https://example.com",
      snsUrls: ["https://x.com/taro"],
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-02T09:00:00.000Z",
    });
    expect(politician.profile).not.toHaveProperty("photoPath");
  });

  it("所属履歴は政治団体の slug と日付で表す", () => {
    const [politician] = build([
      sourcePolitician({
        memberships: [
          {
            organizationSlug: "team-mirai",
            startedOn: new Date("2025-05-08T00:00:00.000Z"),
            endedOn: null,
            ...timestamps,
          },
        ],
      }),
    ]).politicians;

    expect(politician.memberships).toEqual([
      {
        organizationSlug: "team-mirai",
        startedOn: "2025-05-08",
        endedOn: null,
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
      },
    ]);
  });

  it("支払先は表記をネストして書き出す", () => {
    const [politician] = build([
      sourcePolitician({
        payees: [
          {
            name: "未来書店",
            address: "",
            postalCode: null,
            invoiceRegistrationNumber: "T1234567890123",
            ...timestamps,
            aliases: [
              { name: "ミライ書店", normalizedName: "みらい書店", source: "manual", ...timestamps },
            ],
          },
        ],
      }),
    ]).politicians;

    expect(politician.payees).toEqual([
      {
        name: "未来書店",
        address: "",
        postalCode: null,
        invoiceRegistrationNumber: "T1234567890123",
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
        aliases: [
          {
            name: "ミライ書店",
            normalizedName: "みらい書店",
            source: "manual",
            createdAt: "2026-04-01T09:00:00.000Z",
            updatedAt: "2026-04-02T09:00:00.000Z",
          },
        ],
      },
    ]);
  });

  it("読み取りプロンプトと住所検索プロンプトの各版を書き出す", () => {
    const [politician] = build([
      sourcePolitician({
        prompts: [
          { version: 1, body: "旧版", isActive: false, ...timestamps },
          { version: 2, body: "新版", isActive: true, ...timestamps },
        ],
        addressSearchPrompts: [{ version: 1, body: "住所", isActive: true, ...timestamps }],
      }),
    ]).politicians;

    expect(politician.prompts.map((p) => [p.version, p.body, p.isActive])).toEqual([
      [1, "旧版", false],
      [2, "新版", true],
    ]);
    expect(politician.addressSearchPrompts).toEqual([
      {
        version: 1,
        body: "住所",
        isActive: true,
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
      },
    ]);
  });

  it("帳簿の日付は YYYY-MM-DD、details はそのまま書き出す", () => {
    const [politician] = build([
      sourcePolitician({
        books: [
          sourceBook({
            publishedThrough: new Date("2026-08-31T00:00:00.000Z"),
            asOfDate: new Date("2026-09-20T00:00:00.000Z"),
            nextUpdateNote: "次回更新 11月ごろ",
            policyComment: "政策立案に使います",
            details: { about: "説明" },
            allowLegalCategoryOverride: true,
          }),
        ],
      }),
    ]).politicians;

    expect(politician.books[0]).toMatchObject({
      financialYear: 2026,
      status: "active",
      publishedThrough: "2026-08-31",
      asOfDate: "2026-09-20",
      nextUpdateNote: "次回更新 11月ごろ",
      policyComment: "政策立案に使います",
      details: { about: "説明" },
      allowLegalCategoryOverride: true,
    });
  });

  it("仕訳は支払先を自然キーで参照し、行の金額・確信度を桁を固定した文字列にする", () => {
    const [politician] = build([
      sourcePolitician({
        books: [
          sourceBook({
            journalEntries: [
              sourceEntry({
                advancedBy: "秘書A",
                settledAt: new Date("2026-06-10T00:00:00.000Z"),
                payee: { name: "未来書店", address: "" },
                payeeLinkSource: "ai",
                payeeLinkConfidence: new Prisma.Decimal("0.9"),
                payeeLinkReason: "店名が一致",
                publishedAt: new Date("2026-07-01T00:00:00.000Z"),
                legalCategoryOverride: {
                  legalCategoryKey: "supplies",
                  reason: "提出済みの区分に合わせる",
                  ...timestamps,
                },
              }),
            ],
          }),
        ],
      }),
    ]).politicians;

    expect(politician.books[0].journalEntries[0]).toEqual({
      hash: "hash-1",
      entryDate: "2026-05-31",
      description: "書籍購入",
      status: "published",
      source: "scan",
      splitGroup: null,
      note: null,
      memo: null,
      advancedBy: "秘書A",
      settledAt: "2026-06-10",
      payee: { name: "未来書店", address: "" },
      payeeLinkSource: "ai",
      payeeLinkConfidence: "0.900",
      payeeLinkReason: "店名が一致",
      receiptAbsent: false,
      receiptAbsenceReason: null,
      fromFundManagementOrg: false,
      treatAsOverTenThousand: null,
      publishedAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-02T09:00:00.000Z",
      lines: [
        { side: "debit", accountKey: "books", amount: "3300" },
        { side: "credit", accountKey: "bank", amount: "3300" },
      ],
      legalCategoryOverride: {
        legalCategoryKey: "supplies",
        reason: "提出済みの区分に合わせる",
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
      },
    });
  });

  it("仕訳は書類なしとして書き出し、書類・領収書等番号・ユーザーへの参照を含めない", () => {
    const result = build([
      sourcePolitician({ books: [sourceBook({ journalEntries: [sourceEntry()] })] }),
    ]);
    const entry = result.politicians[0].books[0].journalEntries[0];

    for (const key of [
      "id",
      "bookId",
      "documentId",
      "document",
      "receiptNumber",
      "originalFilename",
      "storageKey",
      "createdById",
    ]) {
      expect(entry).not.toHaveProperty(key);
    }
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/"(id|documentId|storageKey|maskedKey|createdById|updatedById)"/);
  });

  it("支出群は対象の仕訳を hash で表し、成果をネストする", () => {
    const [politician] = build([
      sourcePolitician({
        books: [
          sourceBook({
            journalEntries: [sourceEntry()],
            expenditureGroups: [
              {
                title: "AI 政策の調査",
                description: "書籍で調べた",
                displayOrder: 0,
                ...timestamps,
                entryHashes: ["hash-1"],
                outcomes: [{ label: "質問主意書", url: null, displayOrder: 0, ...timestamps }],
              },
            ],
          }),
        ],
      }),
    ]).politicians;

    expect(politician.books[0].expenditureGroups).toEqual([
      {
        title: "AI 政策の調査",
        description: "書籍で調べた",
        displayOrder: 0,
        createdAt: "2026-04-01T09:00:00.000Z",
        updatedAt: "2026-04-02T09:00:00.000Z",
        entryHashes: ["hash-1"],
        outcomes: [
          {
            label: "質問主意書",
            url: null,
            displayOrder: 0,
            createdAt: "2026-04-01T09:00:00.000Z",
            updatedAt: "2026-04-02T09:00:00.000Z",
          },
        ],
      },
    ]);
  });

  it("議員室ごとの件数を年度をまたいで数える", () => {
    const result = build([
      sourcePolitician({
        memberships: [
          {
            organizationSlug: "team-mirai",
            startedOn: new Date("2025-05-08T00:00:00.000Z"),
            endedOn: null,
            ...timestamps,
          },
        ],
        payees: [
          {
            name: "未来書店",
            address: "",
            postalCode: null,
            invoiceRegistrationNumber: null,
            ...timestamps,
            aliases: [
              { name: "ミライ書店", normalizedName: "みらい書店", source: "manual", ...timestamps },
              { name: "未来書店本店", normalizedName: "未来書店本店", source: "rule", ...timestamps },
            ],
          },
        ],
        prompts: [{ version: 1, body: "p", isActive: true, ...timestamps }],
        addressSearchPrompts: [],
        books: [
          sourceBook({
            financialYear: 2025,
            journalEntries: [sourceEntry({ hash: "a" })],
          }),
          sourceBook({
            financialYear: 2026,
            journalEntries: [
              sourceEntry({
                hash: "b",
                legalCategoryOverride: { legalCategoryKey: "x", reason: "r", ...timestamps },
              }),
              sourceEntry({ hash: "c" }),
            ],
            expenditureGroups: [
              {
                title: "群",
                description: "",
                displayOrder: 0,
                ...timestamps,
                entryHashes: ["b", "c"],
                outcomes: [{ label: "成果", url: null, displayOrder: 0, ...timestamps }],
              },
            ],
          }),
        ],
      }),
    ]);

    expect(result.meta.politicians).toEqual([
      {
        slug: "taro",
        counts: {
          memberships: 1,
          books: 2,
          payees: 1,
          payeeAliases: 2,
          journalEntries: 3,
          journalLines: 6,
          legalCategoryOverrides: 1,
          expenditureGroups: 1,
          groupItems: 2,
          groupOutcomes: 1,
          prompts: 1,
          addressSearchPrompts: 0,
        },
      },
    ]);
  });
});
