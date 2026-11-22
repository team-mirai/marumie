import type {
  ResearchFundSyncExport,
  ResearchFundSyncPolitician,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import {
  assertResearchFundSyncMasterKeysExist,
  collectResearchFundSyncMasterKeys,
  collectResearchFundSyncOrganizationSlugs,
  decideResearchFundSyncImport,
  matchesResearchFundSyncConfirmation,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import { SyncImportValidationError } from "@/server/contexts/shared/domain/models/sync-import-file";

const timestamps = {
  createdAt: "2026-04-01T09:00:00.000Z",
  updatedAt: "2026-04-02T09:00:00.000Z",
};

function membership(organizationSlug: string, startedOn = "2025-05-08") {
  return { organizationSlug, startedOn, endedOn: null, ...timestamps };
}

function politician(
  slug: string,
  options: {
    memberships?: ResearchFundSyncPolitician["memberships"];
    lines?: { accountKey: string }[];
    legalCategoryKey?: string;
  } = {},
): ResearchFundSyncPolitician {
  return {
    profile: {
      slug,
      name: `議員 ${slug}`,
      nameKana: null,
      termStart: "2025-07-20",
      displayOrder: 0,
      isResearchFundPublic: true,
      house: null,
      constituency: null,
      profileUrl: null,
      websiteUrl: null,
      snsUrls: [],
      ...timestamps,
    },
    memberships: options.memberships ?? [],
    payees: [],
    prompts: [],
    addressSearchPrompts: [],
    books: [
      {
        financialYear: 2026,
        status: "active",
        publishedThrough: null,
        asOfDate: null,
        nextUpdateNote: null,
        policyComment: null,
        details: null,
        allowLegalCategoryOverride: true,
        ...timestamps,
        journalEntries: options.lines
          ? [
              {
                hash: `${slug}-1`,
                entryDate: "2026-05-31",
                description: "書籍購入",
                status: "draft",
                source: "manual",
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
                lines: options.lines.map((line) => ({
                  side: "debit",
                  accountKey: line.accountKey,
                  amount: "100",
                })),
                legalCategoryOverride: options.legalCategoryKey
                  ? {
                      legalCategoryKey: options.legalCategoryKey,
                      reason: "提出済みの区分に合わせる",
                      ...timestamps,
                    }
                  : null,
              },
            ]
          : [],
        expenditureGroups: [],
      },
    ],
  };
}

function file(politicians: ResearchFundSyncPolitician[]): ResearchFundSyncExport {
  return {
    meta: {
      formatVersion: 1,
      exportedAt: "2026-11-16T01:23:45.000Z",
      sourceEnvironment: "production",
      latestMigrationName: null,
      politicians: [],
    },
    politicians,
  };
}

describe("decideResearchFundSyncImport", () => {
  it("この環境に同じ slug の議員がいれば置き換え、その議員を取り込み先にする", () => {
    const taro = politician("taro", { memberships: [membership("team-mirai")] });

    const decisions = decideResearchFundSyncImport(
      file([taro]),
      new Map([["taro", { id: "3" }]]),
      new Set(["team-mirai"]),
    );

    expect(decisions).toEqual([{ mode: "replace", politician: taro, target: { id: "3" } }]);
  });

  it("いなければ新規に作り、この環境にある政治団体の所属履歴だけを作る", () => {
    const hanako = politician("hanako", {
      memberships: [
        membership("team-mirai", "2025-05-08"),
        membership("missing-org", "2025-05-08"),
        membership("team-mirai", "2026-01-01"),
        membership("missing-org", "2026-01-01"),
      ],
    });

    const [decision] = decideResearchFundSyncImport(
      file([hanako]),
      new Map(),
      new Set(["team-mirai"]),
    );

    expect(decision).toEqual({
      mode: "create",
      politician: hanako,
      memberships: [membership("team-mirai", "2025-05-08"), membership("team-mirai", "2026-01-01")],
      skippedOrganizationSlugs: ["missing-org"],
    });
  });

  it("ファイルの順に議員室ごとの判定を返す", () => {
    const decisions = decideResearchFundSyncImport(
      file([politician("taro"), politician("hanako"), politician("jiro")]),
      new Map([["jiro", 7]]),
      new Set<string>(),
    );

    expect(
      decisions.map((decision) => [decision.politician.profile.slug, decision.mode]),
    ).toEqual([
      ["taro", "create"],
      ["hanako", "create"],
      ["jiro", "replace"],
    ]);
  });
});

describe("collectResearchFundSyncOrganizationSlugs", () => {
  it("全議員室の所属先を重複なく出現順に集める", () => {
    expect(
      collectResearchFundSyncOrganizationSlugs(
        file([
          politician("taro", { memberships: [membership("team-mirai"), membership("a")] }),
          politician("hanako", { memberships: [membership("a"), membership("b")] }),
        ]),
      ),
    ).toEqual(["team-mirai", "a", "b"]);
  });
});

describe("collectResearchFundSyncMasterKeys", () => {
  it("仕訳の科目と法定区分の上書きのキーを重複なく集める", () => {
    expect(
      collectResearchFundSyncMasterKeys(
        file([
          politician("taro", {
            lines: [{ accountKey: "books" }, { accountKey: "bank" }],
            legalCategoryKey: "supplies",
          }),
          politician("hanako", { lines: [{ accountKey: "books" }] }),
        ]),
      ),
    ).toEqual({ accountKeys: ["books", "bank"], legalCategoryKeys: ["supplies"] });
  });
});

describe("assertResearchFundSyncMasterKeysExist", () => {
  const required = { accountKeys: ["books", "bank"], legalCategoryKeys: ["supplies"] };

  it("全てのキーがこの環境の科目マスタにあれば取り込める", () => {
    expect(() => assertResearchFundSyncMasterKeysExist(required, required)).not.toThrow();
  });

  it("科目マスタに無い科目があれば、そのキーを挙げて取り込めない", () => {
    expect(() =>
      assertResearchFundSyncMasterKeysExist(required, {
        accountKeys: ["books"],
        legalCategoryKeys: ["supplies"],
      }),
    ).toThrow(new SyncImportValidationError("この環境の科目マスタに無い科目があります: bank"));
  });

  it("科目マスタに無い法定区分があれば、そのキーを挙げて取り込めない", () => {
    expect(() =>
      assertResearchFundSyncMasterKeysExist(required, {
        accountKeys: ["books", "bank"],
        legalCategoryKeys: [],
      }),
    ).toThrow(
      new SyncImportValidationError("この環境の科目マスタに無い法定区分があります: supplies"),
    );
  });
});

describe("matchesResearchFundSyncConfirmation", () => {
  it("ファイルの議員 slug を全て入力すれば、順序・区切りによらず一致する", () => {
    expect(matchesResearchFundSyncConfirmation("taro, hanako", ["taro", "hanako"])).toBe(true);
    expect(matchesResearchFundSyncConfirmation(" hanako　taro ", ["taro", "hanako"])).toBe(true);
    expect(matchesResearchFundSyncConfirmation("hanako、taro", ["taro", "hanako"])).toBe(true);
  });

  it("足りない・余計な slug があれば一致しない", () => {
    expect(matchesResearchFundSyncConfirmation("taro", ["taro", "hanako"])).toBe(false);
    expect(matchesResearchFundSyncConfirmation("taro, hanako, jiro", ["taro", "hanako"])).toBe(
      false,
    );
    expect(matchesResearchFundSyncConfirmation("", ["taro"])).toBe(false);
  });

  it("議員室が無ければ一致しない", () => {
    expect(matchesResearchFundSyncConfirmation("", [])).toBe(false);
  });
});
