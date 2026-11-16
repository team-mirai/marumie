import { ImportResearchFundSyncUsecase } from "@/server/contexts/research-fund/application/usecases/import-research-fund-sync-usecase";
import { PreviewResearchFundSyncImportUsecase } from "@/server/contexts/research-fund/application/usecases/preview-research-fund-sync-import-usecase";
import type { IResearchFundSyncImportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import type { ResearchFundSyncSourcePolitician } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-export-repository.interface";
import { buildResearchFundSyncExport } from "@/server/contexts/research-fund/domain/services/research-fund-sync-export-builder";
import { Prisma } from "@prisma/client";
import {
  SyncImportForbiddenError,
  SyncImportValidationError,
} from "@/server/contexts/shared/domain/models/sync-import-file";
import type { ISyncImportFileStorage } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

const ALLOWED_ENVIRONMENT = { dataSyncImportEnabled: "true", vercelEnv: "preview" };
const PRODUCTION_ENVIRONMENT = { dataSyncImportEnabled: "true", vercelEnv: "production" };
const STORAGE_KEY = "0f8fad5b-d9cb-469f-a165-70867728950e.json";

const timestamps = {
  createdAt: new Date("2026-04-01T09:00:00.000Z"),
  updatedAt: new Date("2026-04-02T09:00:00.000Z"),
};

function sourcePolitician(slug: string): ResearchFundSyncSourcePolitician {
  return {
    profile: {
      slug,
      name: `議員 ${slug}`,
      nameKana: null,
      termStart: new Date("2025-07-20T00:00:00.000Z"),
      displayOrder: 0,
      isResearchFundPublic: false,
      house: null,
      constituency: null,
      profileUrl: null,
      websiteUrl: null,
      snsUrls: [],
      ...timestamps,
    },
    memberships: [
      { organizationSlug: "team-mirai", startedOn: new Date("2025-05-08"), endedOn: null, ...timestamps },
      { organizationSlug: "other-org", startedOn: new Date("2025-05-08"), endedOn: null, ...timestamps },
    ],
    payees: [],
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
        details: null,
        allowLegalCategoryOverride: true,
        ...timestamps,
        journalEntries: [
          {
            hash: "h1",
            entryDate: new Date("2026-05-31T00:00:00.000Z"),
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
            lines: [
              { side: "debit", accountKey: "books", amount: new Prisma.Decimal("3300") },
              { side: "credit", accountKey: "bank", amount: new Prisma.Decimal("3300") },
            ],
            legalCategoryOverride: {
              legalCategoryKey: "supplies",
              reason: "提出済みの区分に合わせる",
              ...timestamps,
            },
          },
        ],
        expenditureGroups: [],
      },
    ],
  };
}

function buildFileText(slugs: string[] = ["taro", "hanako"]): string {
  return JSON.stringify(
    buildResearchFundSyncExport({
      sources: slugs.map(sourcePolitician),
      exportedAt: new Date("2026-11-16T01:23:45.000Z"),
      sourceEnvironment: "production",
      latestMigrationName: "20261101000000_sample",
    }),
  );
}

const DELETING_COUNTS = {
  books: 2,
  payees: 3,
  journalEntries: 40,
  expenditureGroups: 1,
  prompts: 2,
  addressSearchPrompts: 1,
  documents: 30,
  scanJobs: 35,
};

function buildRepository(
  overrides: Partial<IResearchFundSyncImportRepository> = {},
): IResearchFundSyncImportRepository {
  return {
    // taro だけがこの環境にいる
    findPoliticiansBySlugs: jest.fn(async () => [{ id: "3", slug: "taro", name: "未来太郎" }]),
    countPoliticianData: jest.fn(async () => DELETING_COUNTS),
    findExistingOrganizationSlugs: jest.fn(async () => ["team-mirai"]),
    findExistingAccountKeys: jest.fn(async (keys: string[]) => keys),
    findExistingLegalCategoryKeys: jest.fn(async (keys: string[]) => keys),
    replaceResearchFundSyncData: jest.fn(async () => [
      {
        slug: "taro",
        mode: "replace" as const,
        deletedJournalEntryCount: 40,
        importedJournalEntryCount: 1,
        createdMembershipCount: 0,
      },
      {
        slug: "hanako",
        mode: "create" as const,
        deletedJournalEntryCount: 0,
        importedJournalEntryCount: 1,
        createdMembershipCount: 1,
      },
    ]),
    ...overrides,
  };
}

function buildFileStorage(fileText: string = buildFileText()): ISyncImportFileStorage {
  return {
    createUploadTarget: jest.fn(),
    readText: jest.fn(async () => fileText),
    remove: jest.fn(async () => undefined),
    list: jest.fn(async () => []),
    removeMany: jest.fn(async () => undefined),
  };
}

function buildCacheInvalidator(): ICacheInvalidator {
  return { invalidateWebappCache: jest.fn(async () => undefined) };
}

describe("PreviewResearchFundSyncImportUsecase", () => {
  it("議員室ごとに、置き換えか新規作成かと、ファイル側・消える側の件数を返す", async () => {
    const repository = buildRepository();
    const usecase = new PreviewResearchFundSyncImportUsecase(repository, buildFileStorage());

    const plan = await usecase.execute({ storageKey: STORAGE_KEY, environment: ALLOWED_ENVIRONMENT });

    const importing = {
      books: 1,
      payees: 0,
      journalEntries: 1,
      expenditureGroups: 0,
      prompts: 1,
      addressSearchPrompts: 0,
    };
    expect(plan).toEqual({
      exportedAt: "2026-11-16T01:23:45.000Z",
      sourceEnvironment: "production",
      latestMigrationName: "20261101000000_sample",
      politicians: [
        { mode: "replace", slug: "taro", name: "未来太郎", importing, deleting: DELETING_COUNTS },
        {
          mode: "create",
          slug: "hanako",
          name: "議員 hanako",
          importing,
          creatingMembershipCount: 1,
          skippedOrganizationSlugs: ["other-org"],
        },
      ],
    });
    expect(repository.countPoliticianData).toHaveBeenCalledWith("3");
    expect(repository.replaceResearchFundSyncData).not.toHaveBeenCalled();
  });

  it("本番ではフラグによらず拒否し、ファイルも読まない", async () => {
    const fileStorage = buildFileStorage();
    const usecase = new PreviewResearchFundSyncImportUsecase(buildRepository(), fileStorage);

    await expect(
      usecase.execute({ storageKey: STORAGE_KEY, environment: PRODUCTION_ENVIRONMENT }),
    ).rejects.toThrow(SyncImportForbiddenError);
    expect(fileStorage.readText).not.toHaveBeenCalled();
  });

  it("フラグが無い環境では拒否する", async () => {
    const usecase = new PreviewResearchFundSyncImportUsecase(buildRepository(), buildFileStorage());

    await expect(
      usecase.execute({
        storageKey: STORAGE_KEY,
        environment: { dataSyncImportEnabled: undefined, vercelEnv: "preview" },
      }),
    ).rejects.toThrow(SyncImportForbiddenError);
  });

  it("形式の合わないファイルは理由を返し、置いたファイルを消す", async () => {
    const fileStorage = buildFileStorage(
      JSON.stringify({ ...JSON.parse(buildFileText()), meta: { formatVersion: 99 } }),
    );
    const usecase = new PreviewResearchFundSyncImportUsecase(buildRepository(), fileStorage);

    await expect(
      usecase.execute({ storageKey: STORAGE_KEY, environment: ALLOWED_ENVIRONMENT }),
    ).rejects.toThrow(SyncImportValidationError);
    expect(fileStorage.remove).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("この環境の科目マスタに無い科目・法定区分があれば取り込めない", async () => {
    const accountMissing = new PreviewResearchFundSyncImportUsecase(
      buildRepository({ findExistingAccountKeys: jest.fn(async () => ["bank"]) }),
      buildFileStorage(),
    );
    await expect(
      accountMissing.execute({ storageKey: STORAGE_KEY, environment: ALLOWED_ENVIRONMENT }),
    ).rejects.toThrow("科目マスタに無い科目があります: books");

    const legalMissing = new PreviewResearchFundSyncImportUsecase(
      buildRepository({ findExistingLegalCategoryKeys: jest.fn(async () => []) }),
      buildFileStorage(),
    );
    await expect(
      legalMissing.execute({ storageKey: STORAGE_KEY, environment: ALLOWED_ENVIRONMENT }),
    ).rejects.toThrow("科目マスタに無い法定区分があります: supplies");
  });
});

describe("ImportResearchFundSyncUsecase", () => {
  it("確認入力がファイルの議員 slug と一致すれば置き換え、キャッシュを消してファイルを片付ける", async () => {
    const repository = buildRepository();
    const cacheInvalidator = buildCacheInvalidator();
    const fileStorage = buildFileStorage();
    const usecase = new ImportResearchFundSyncUsecase(repository, cacheInvalidator, fileStorage);

    const result = await usecase.execute({
      storageKey: STORAGE_KEY,
      confirmation: "hanako, taro",
      environment: ALLOWED_ENVIRONMENT,
    });

    expect(repository.replaceResearchFundSyncData).toHaveBeenCalledTimes(1);
    const [file] = (repository.replaceResearchFundSyncData as jest.Mock).mock.calls[0];
    expect(file.politicians.map((p: { profile: { slug: string } }) => p.profile.slug)).toEqual([
      "taro",
      "hanako",
    ]);
    expect(result.politicians.map((p) => p.slug)).toEqual(["taro", "hanako"]);
    expect(result.cacheInvalidationError).toBeNull();
    expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalled();
    expect(fileStorage.remove).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("確認入力が一致しなければ置き換えない", async () => {
    const repository = buildRepository();
    const usecase = new ImportResearchFundSyncUsecase(
      repository,
      buildCacheInvalidator(),
      buildFileStorage(),
    );

    await expect(
      usecase.execute({ storageKey: STORAGE_KEY, confirmation: "taro", environment: ALLOWED_ENVIRONMENT }),
    ).rejects.toThrow("ファイルの議員 slug（taro, hanako）と一致しません");
    expect(repository.replaceResearchFundSyncData).not.toHaveBeenCalled();
  });

  it("本番ではフラグによらず置き換えない", async () => {
    const repository = buildRepository();
    const usecase = new ImportResearchFundSyncUsecase(
      repository,
      buildCacheInvalidator(),
      buildFileStorage(),
    );

    await expect(
      usecase.execute({
        storageKey: STORAGE_KEY,
        confirmation: "taro, hanako",
        environment: PRODUCTION_ENVIRONMENT,
      }),
    ).rejects.toThrow(SyncImportForbiddenError);
    expect(repository.replaceResearchFundSyncData).not.toHaveBeenCalled();
  });

  it("キャッシュ無効化に失敗しても取り込みは成功として警告を返す", async () => {
    const cacheInvalidator = {
      invalidateWebappCache: jest.fn(async () => {
        throw new Error("webapp unreachable");
      }),
    };
    const usecase = new ImportResearchFundSyncUsecase(
      buildRepository(),
      cacheInvalidator,
      buildFileStorage(),
    );

    const result = await usecase.execute({
      storageKey: STORAGE_KEY,
      confirmation: "taro hanako",
      environment: ALLOWED_ENVIRONMENT,
    });

    expect(result.cacheInvalidationError).toBe("webapp unreachable");
  });
});
