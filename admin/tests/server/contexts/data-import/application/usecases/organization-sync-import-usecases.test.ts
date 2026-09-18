import { ImportOrganizationSyncUsecase } from "@/server/contexts/data-import/application/usecases/import-organization-sync-usecase";
import { PreviewOrganizationSyncImportUsecase } from "@/server/contexts/data-import/application/usecases/preview-organization-sync-import-usecase";
import {
  SyncImportForbiddenError,
  SyncImportOrganizationNotFoundError,
  SyncImportValidationError,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type {
  IOrganizationSyncImportRepository,
  ReplaceOrganizationSyncDataResult,
} from "@/server/contexts/data-import/domain/repositories/organization-sync-import-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

const ALLOWED_ENVIRONMENT = { dataSyncImportEnabled: "true", vercelEnv: "preview" };
const EXPORTED_AT = "2026-09-18T01:23:45.678Z";

function buildTransaction(
  transactionNo: string,
  counterpartName: string | null,
  donorName: string | null,
) {
  return {
    transactionNo,
    transactionDate: "2026-04-01",
    financialYear: 2026,
    transactionType: "income",
    debitAccount: "普通預金",
    debitAmount: "1000.00",
    creditAccount: "個人からの寄附",
    creditAmount: "1000.00",
    categoryKey: "donation-individual",
    counterpart: counterpartName ? { name: counterpartName, postalCode: null, address: null } : null,
    donor: donorName
      ? { donorType: "individual", name: donorName, address: null, occupation: "会社員" }
      : null,
  };
}

/** 書き出し側と同じく、取引にネストした値を自然キーで重複排除して数える。 */
function countDistinct(transactions: unknown[], toKey: (t: Transaction) => string | null): number {
  const keys = new Set<string>();
  for (const transaction of transactions) {
    const key = toKey(transaction as Transaction);
    if (key !== null) keys.add(key);
  }
  return keys.size;
}

type Transaction = ReturnType<typeof buildTransaction>;

function buildFileText(transactions: unknown[] = []) {
  return JSON.stringify({
    meta: {
      formatVersion: 1,
      exportedAt: EXPORTED_AT,
      sourceEnvironment: "production",
      latestMigrationName: null,
      organizationSlug: "team-mirai",
      counts: {
        transactions: transactions.length,
        counterparts: countDistinct(transactions, (t) =>
          t.counterpart ? JSON.stringify([t.counterpart.name, t.counterpart.address]) : null,
        ),
        donors: countDistinct(transactions, (t) =>
          t.donor ? JSON.stringify([t.donor.donorType, t.donor.name, t.donor.address]) : null,
        ),
        balanceSnapshots: 0,
        organizationReportProfiles: 0,
      },
    },
    transactions,
    balanceSnapshots: [],
    organizationReportProfiles: [],
  });
}

const REPLACE_RESULT: ReplaceOrganizationSyncDataResult = {
  deletedTransactionCount: 5,
  importedTransactionCount: 2,
  createdCounterpartCount: 1,
  createdDonorCount: 0,
  importedBalanceSnapshotCount: 0,
  upsertedReportProfileCount: 0,
};

function buildRepository(
  overrides: Partial<IOrganizationSyncImportRepository> = {},
): IOrganizationSyncImportRepository {
  return {
    findOrganizationBySlug: jest.fn(async () => ({ id: "7", displayName: "チームみらい" })),
    countTransactions: jest.fn(async () => 5),
    countBalanceSnapshots: jest.fn(async () => 3),
    findExistingCounterpartKeys: jest.fn(async () => []),
    findExistingDonorKeys: jest.fn(async () => []),
    replaceOrganizationSyncData: jest.fn(async () => REPLACE_RESULT),
    ...overrides,
  };
}

describe("PreviewOrganizationSyncImportUsecase", () => {
  it("削除される件数・取り込まれる件数・新規作成される件数を返す", async () => {
    const repository = buildRepository({
      // 「株式会社A」だけ既にこの環境にある
      findExistingCounterpartKeys: jest.fn(async () => [{ name: "株式会社A", address: null }]),
    });
    const usecase = new PreviewOrganizationSyncImportUsecase(repository);

    const plan = await usecase.execute({
      fileText: buildFileText([
        buildTransaction("1", "株式会社A", "山田太郎"),
        buildTransaction("2", "株式会社B", "山田太郎"),
        // 同じ取引先・寄付者は自然キーで重複排除される
        buildTransaction("3", "株式会社B", "山田太郎"),
      ]),
      environment: ALLOWED_ENVIRONMENT,
    });

    expect(plan).toMatchObject({
      organizationSlug: "team-mirai",
      organizationDisplayName: "チームみらい",
      deletingTransactionCount: 5,
      importingTransactionCount: 3,
      deletingBalanceSnapshotCount: 3,
      importingBalanceSnapshotCount: 0,
      newCounterpartCount: 1,
      newDonorCount: 1,
    });
  });

  it("許可されない環境では DB を触らずに拒否する", async () => {
    const repository = buildRepository();
    const usecase = new PreviewOrganizationSyncImportUsecase(repository);

    await expect(
      usecase.execute({
        fileText: buildFileText(),
        environment: { dataSyncImportEnabled: "true", vercelEnv: "production" },
      }),
    ).rejects.toThrow(SyncImportForbiddenError);
    expect(repository.findOrganizationBySlug).not.toHaveBeenCalled();
  });

  it("slug に一致する政治団体が無ければエラーにする", async () => {
    const usecase = new PreviewOrganizationSyncImportUsecase(
      buildRepository({ findOrganizationBySlug: jest.fn(async () => null) }),
    );

    await expect(
      usecase.execute({ fileText: buildFileText(), environment: ALLOWED_ENVIRONMENT }),
    ).rejects.toThrow(SyncImportOrganizationNotFoundError);
  });
});

describe("ImportOrganizationSyncUsecase", () => {
  function buildCacheInvalidator(): ICacheInvalidator {
    return { invalidateWebappCache: jest.fn(async () => undefined) };
  }

  it("確認入力がファイルの slug と一致すれば置き換えてキャッシュを無効化する", async () => {
    const repository = buildRepository();
    const cacheInvalidator = buildCacheInvalidator();
    const usecase = new ImportOrganizationSyncUsecase(repository, cacheInvalidator);

    const result = await usecase.execute({
      fileText: buildFileText([buildTransaction("1", null, null)]),
      confirmationSlug: " team-mirai ",
      environment: ALLOWED_ENVIRONMENT,
    });

    expect(repository.replaceOrganizationSyncData).toHaveBeenCalledWith(
      expect.objectContaining({ politicalOrganizationId: "7" }),
    );
    expect(cacheInvalidator.invalidateWebappCache).toHaveBeenCalled();
    expect(result).toMatchObject({
      organizationSlug: "team-mirai",
      deletedTransactionCount: 5,
      cacheInvalidationError: null,
    });
  });

  it("確認入力が一致しなければ置き換えない", async () => {
    const repository = buildRepository();
    const usecase = new ImportOrganizationSyncUsecase(repository, buildCacheInvalidator());

    await expect(
      usecase.execute({
        fileText: buildFileText(),
        confirmationSlug: "other-slug",
        environment: ALLOWED_ENVIRONMENT,
      }),
    ).rejects.toThrow(SyncImportValidationError);
    expect(repository.replaceOrganizationSyncData).not.toHaveBeenCalled();
  });

  it("許可されない環境では置き換えない", async () => {
    const repository = buildRepository();
    const usecase = new ImportOrganizationSyncUsecase(repository, buildCacheInvalidator());

    await expect(
      usecase.execute({
        fileText: buildFileText(),
        confirmationSlug: "team-mirai",
        environment: { dataSyncImportEnabled: undefined, vercelEnv: "preview" },
      }),
    ).rejects.toThrow(SyncImportForbiddenError);
    expect(repository.replaceOrganizationSyncData).not.toHaveBeenCalled();
  });

  it("キャッシュ無効化に失敗しても取り込み自体は成功として警告を返す", async () => {
    const usecase = new ImportOrganizationSyncUsecase(buildRepository(), {
      invalidateWebappCache: jest.fn(async () => {
        throw new Error("webapp に接続できませんでした");
      }),
    });

    const result = await usecase.execute({
      fileText: buildFileText(),
      confirmationSlug: "team-mirai",
      environment: ALLOWED_ENVIRONMENT,
    });

    expect(result.cacheInvalidationError).toBe("webapp に接続できませんでした");
  });
});
