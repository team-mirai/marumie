import { Prisma } from "@prisma/client";
import type { ResearchFundSyncSourcePolitician } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";
import { buildResearchFundSyncExport } from "@/server/contexts/research-fund/domain/services/research-fund-sync-export-builder";
import { parseResearchFundSyncImportFile } from "@/server/contexts/research-fund/domain/services/research-fund-sync-import-parser";
import { SyncImportValidationError } from "@/server/contexts/shared/domain/models/sync-import-file";

const timestamps = {
  createdAt: new Date("2026-04-01T09:00:00.000Z"),
  updatedAt: new Date("2026-04-02T09:00:00.000Z"),
};

function sourcePolitician(slug: string): ResearchFundSyncSourcePolitician {
  return {
    profile: {
      slug,
      name: "未来太郎",
      nameKana: null,
      termStart: new Date("2025-07-20T00:00:00.000Z"),
      displayOrder: 0,
      isResearchFundPublic: false,
      house: "sangiin",
      constituency: null,
      profileUrl: null,
      websiteUrl: null,
      snsUrls: [],
      ...timestamps,
    },
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
        name: "書店A",
        address: "",
        postalCode: null,
        invoiceRegistrationNumber: null,
        ...timestamps,
        aliases: [{ name: "書店Ａ", normalizedName: "書店a", source: "rule", ...timestamps }],
      },
    ],
    prompts: [{ version: 1, body: "読み取って", isActive: true, ...timestamps }],
    addressSearchPrompts: [],
    books: [
      {
        financialYear: 2026,
        status: "active",
        publishedThrough: null,
        asOfDate: null,
        nextUpdateNote: null,
        policyComment: null,
        details: { note: "データについて" },
        allowLegalCategoryOverride: false,
        ...timestamps,
        journalEntries: [
          {
            hash: "h1",
            entryDate: new Date("2026-05-31T00:00:00.000Z"),
            description: "書籍購入",
            status: "published",
            source: "scan",
            splitGroup: null,
            note: null,
            memo: null,
            advancedBy: null,
            settledAt: null,
            payee: { name: "書店A", address: "" },
            payeeLinkSource: "ai",
            payeeLinkConfidence: new Prisma.Decimal("0.9"),
            payeeLinkReason: "店名が一致",
            receiptAbsent: false,
            receiptAbsenceReason: null,
            fromFundManagementOrg: false,
            treatAsOverTenThousand: null,
            publishedAt: new Date("2026-06-01T00:00:00.000Z"),
            ...timestamps,
            lines: [
              { side: "debit", accountKey: "books", amount: new Prisma.Decimal("3300") },
              { side: "credit", accountKey: "bank", amount: new Prisma.Decimal("3300") },
            ],
            legalCategoryOverride: null,
          },
        ],
        expenditureGroups: [
          {
            title: "政策調査",
            description: "",
            displayOrder: 0,
            ...timestamps,
            entryHashes: ["h1"],
            outcomes: [{ label: "議事録", url: null, displayOrder: 0, ...timestamps }],
          },
        ],
      },
    ],
  };
}

function buildFile(slugs: string[] = ["taro"]) {
  return buildResearchFundSyncExport({
    sources: slugs.map(sourcePolitician),
    exportedAt: new Date("2026-11-16T01:23:45.000Z"),
    sourceEnvironment: "production",
    latestMigrationName: null,
  });
}

/** JSON にしてから書き換える（ファイルの壊れ方を再現する）。 */
function mutate(edit: (file: ReturnType<typeof JSON.parse>) => void, slugs?: string[]): string {
  const file = JSON.parse(JSON.stringify(buildFile(slugs)));
  edit(file);
  return JSON.stringify(file);
}

function expectRejected(text: string, message: string) {
  expect(() => parseResearchFundSyncImportFile(text)).toThrow(SyncImportValidationError);
  expect(() => parseResearchFundSyncImportFile(text)).toThrow(message);
}

describe("parseResearchFundSyncImportFile", () => {
  it("書き出し側が作ったファイルをそのまま読める", () => {
    const file = buildFile(["taro", "hanako"]);

    expect(parseResearchFundSyncImportFile(JSON.stringify(file))).toEqual(file);
  });

  it("JSON として壊れていれば拒否する", () => {
    expectRejected("{", "JSON として読み取れません");
  });

  it("対応していない形式バージョンは拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.meta.formatVersion = 2;
      }),
      "形式バージョン 2 には対応していません",
    );
  });

  it("件数がメタ情報と合わなければ拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].lines.pop();
      }),
      "議員 taro の journalLines の件数が meta と一致しません（meta: 2 / 実際: 1）",
    );
  });

  it("メタ情報の議員室とファイルの議員室が合わなければ拒否する", () => {
    expectRejected(
      mutate(
        (file) => {
          file.politicians.pop();
        },
        ["taro", "hanako"],
      ),
      "meta の議員室（taro, hanako）とファイルの議員室（taro）が一致しません",
    );
  });

  it("議員室が 1 件も無ければ拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.meta.politicians = [];
        file.politicians = [];
      }),
      "議員室が含まれていません",
    );
  });

  it("同じ slug の議員室が重複していれば拒否する", () => {
    expectRejected(
      JSON.stringify(buildFile(["taro", "taro"])),
      "議員の slug が重複しています: taro",
    );
  });

  it("現在のスキーマが知らないカラムがあれば拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].documentId = "1";
      }),
      "現在のスキーマが知らないカラムがあります: documentId",
    );
  });

  it("現在のスキーマに無い enum の値は拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].status = "archived";
      }),
      'status の値 "archived" は現在のスキーマでは扱えません',
    );
  });

  it("仕訳の支払先が同じ議員の支払先に無ければ拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].payee = { name: "別の店", address: "" };
      }),
      '支払先 "別の店" が、同じ議員の支払先にありません',
    );
  });

  it("支出群が同じ帳簿に無い仕訳を指していれば拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].expenditureGroups[0].entryHashes = ["missing"];
      }),
      "同じ帳簿に無い仕訳（hash: missing）を指しています",
    );
  });

  it("金額が円・整数でなければ拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].lines[0].amount = "3300.5";
      }),
      "amount は円・整数（12 桁まで）の文字列である必要があります",
    );
  });

  it("実在しない日付は拒否する", () => {
    expectRejected(
      mutate((file) => {
        file.politicians[0].books[0].journalEntries[0].entryDate = "2026-02-30";
      }),
      "entryDate は実在する YYYY-MM-DD 形式の日付である必要があります",
    );
  });
});
