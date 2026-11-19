import { Prisma } from "@prisma/client";
import { buildOrganizationSyncExport } from "@/server/contexts/shared/domain/services/organization-sync-export-builder";
import type { OrganizationSyncExportSource } from "@/server/contexts/shared/domain/repositories/organization-sync-export-repository.interface";

const EXPORTED_AT = new Date("2026-09-18T01:23:45.000Z");

function sourceTransaction(
  overrides: Partial<OrganizationSyncExportSource["transactions"][number]> = {},
): OrganizationSyncExportSource["transactions"][number] {
  return {
    transactionNo: "T-001",
    // @db.Date のカラムは Prisma から UTC 0 時の Date として返る
    transactionDate: new Date("2026-01-31T00:00:00.000Z"),
    financialYear: 2026,
    transactionType: "income",
    debitAccount: "普通預金",
    debitSubAccount: null,
    debitDepartment: null,
    debitPartner: null,
    debitTaxCategory: null,
    debitAmount: new Prisma.Decimal("1000"),
    creditAccount: "個人からの寄附",
    creditSubAccount: null,
    creditDepartment: null,
    creditPartner: null,
    creditTaxCategory: null,
    creditAmount: new Prisma.Decimal("1000"),
    description: null,
    memo: null,
    friendlyCategory: null,
    categoryKey: "donation_individual",
    label: "",
    hash: "hash-1",
    isGrantExpenditure: false,
    createdAt: new Date("2026-02-01T09:00:00.000Z"),
    updatedAt: new Date("2026-02-02T09:00:00.000Z"),
    counterpart: null,
    donor: null,
    ...overrides,
  };
}

function buildSource(overrides: Partial<OrganizationSyncExportSource> = {}) {
  return {
    organizationSlug: "team-mirai",
    transactions: [],
    balanceSnapshots: [],
    organizationReportProfiles: [],
    ...overrides,
  } satisfies OrganizationSyncExportSource;
}

function build(source: OrganizationSyncExportSource) {
  return buildOrganizationSyncExport({
    source,
    exportedAt: EXPORTED_AT,
    sourceEnvironment: "production",
    latestMigrationName: "20260912000000_add_research_fund_unique_constraints",
  });
}

describe("buildOrganizationSyncExport", () => {
  it("形式バージョン・書き出し日時・環境・マイグレーション名・団体slugをメタに載せる", () => {
    const result = build(buildSource());

    expect(result.meta).toMatchObject({
      formatVersion: 1,
      exportedAt: "2026-09-18T01:23:45.000Z",
      sourceEnvironment: "production",
      latestMigrationName: "20260912000000_add_research_fund_unique_constraints",
      organizationSlug: "team-mirai",
    });
  });

  it("マイグレーション名を取得できなかった場合は null のまま載せる", () => {
    const result = buildOrganizationSyncExport({
      source: buildSource(),
      exportedAt: EXPORTED_AT,
      sourceEnvironment: "preview",
      latestMigrationName: null,
    });

    expect(result.meta.latestMigrationName).toBeNull();
  });

  it("取引にDBのIDを含めない", () => {
    const result = build(buildSource({ transactions: [sourceTransaction()] }));
    const [transaction] = result.transactions;

    expect(transaction).not.toHaveProperty("id");
    expect(transaction).not.toHaveProperty("politicalOrganizationId");
    expect(JSON.stringify(result)).not.toContain('"id"');
  });

  it("取引先・寄付者を自然キーで取引にネストする", () => {
    const result = build(
      buildSource({
        transactions: [
          sourceTransaction({
            counterpart: { name: "株式会社ABC", postalCode: "100-0001", address: "東京都千代田区" },
            donor: {
              donorType: "individual",
              name: "山田太郎",
              address: "東京都港区",
              occupation: "会社員",
            },
          }),
        ],
      }),
    );

    expect(result.transactions[0].counterpart).toEqual({
      name: "株式会社ABC",
      postalCode: "100-0001",
      address: "東京都千代田区",
    });
    expect(result.transactions[0].donor).toEqual({
      donorType: "individual",
      name: "山田太郎",
      address: "東京都港区",
      occupation: "会社員",
    });
  });

  it("取引先・寄付者が紐づいていない取引は null にする", () => {
    const result = build(buildSource({ transactions: [sourceTransaction()] }));

    expect(result.transactions[0].counterpart).toBeNull();
    expect(result.transactions[0].donor).toBeNull();
  });

  it("金額は精度を落とさない文字列にする（数値にしない）", () => {
    const result = build(
      buildSource({
        transactions: [
          sourceTransaction({
            debitAmount: new Prisma.Decimal("1234567890123.45"),
            creditAmount: new Prisma.Decimal("0.05"),
          }),
        ],
      }),
    );

    expect(result.transactions[0].debitAmount).toBe("1234567890123.45");
    expect(result.transactions[0].creditAmount).toBe("0.05");
  });

  it("@db.Date の日付はタイムゾーンでずれない YYYY-MM-DD にする", () => {
    const result = build(
      buildSource({
        transactions: [
          sourceTransaction({ transactionDate: new Date("2026-01-01T00:00:00.000Z") }),
        ],
        balanceSnapshots: [
          {
            snapshotDate: new Date("2026-12-31T00:00:00.000Z"),
            balance: new Prisma.Decimal("500000"),
            createdAt: new Date("2027-01-05T00:00:00.000Z"),
            updatedAt: new Date("2027-01-05T00:00:00.000Z"),
          },
        ],
      }),
    );

    expect(result.transactions[0].transactionDate).toBe("2026-01-01");
    expect(result.balanceSnapshots[0].snapshotDate).toBe("2026-12-31");
    expect(result.balanceSnapshots[0].balance).toBe("500000.00");
  });

  it("残高・報告書プロフィールも同じ団体分として書き出す", () => {
    const result = build(
      buildSource({
        balanceSnapshots: [
          {
            snapshotDate: new Date("2026-03-31T00:00:00.000Z"),
            balance: new Prisma.Decimal("120.50"),
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-02T00:00:00.000Z"),
          },
        ],
        organizationReportProfiles: [
          {
            financialYear: 2026,
            officialName: "チームみらい",
            officialNameKana: "チームミライ",
            officeAddress: "東京都千代田区",
            officeAddressBuilding: "1F",
            details: { representative: "山田太郎" },
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
            updatedAt: new Date("2026-04-02T00:00:00.000Z"),
          },
        ],
      }),
    );

    expect(result.balanceSnapshots).toEqual([
      {
        snapshotDate: "2026-03-31",
        balance: "120.50",
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
      },
    ]);
    expect(result.organizationReportProfiles[0]).toMatchObject({
      financialYear: 2026,
      officialName: "チームみらい",
      details: { representative: "山田太郎" },
    });
  });

  it("件数は取引先・寄付者を自然キーで重複排除して数える", () => {
    const counterpart = { name: "株式会社ABC", postalCode: "100-0001", address: "東京都千代田区" };
    const donor = {
      donorType: "individual",
      name: "山田太郎",
      address: "東京都港区",
      occupation: null,
    };

    const result = build(
      buildSource({
        transactions: [
          sourceTransaction({ transactionNo: "T-001", counterpart, donor }),
          // 同じ自然キーなので 1 件として数える（postalCode は自然キーに含めない）
          sourceTransaction({
            transactionNo: "T-002",
            counterpart: { ...counterpart, postalCode: "100-9999" },
            donor,
          }),
          sourceTransaction({
            transactionNo: "T-003",
            counterpart: { name: "株式会社ABC", postalCode: null, address: "大阪府大阪市" },
            donor: { ...donor, donorType: "corporation" },
          }),
        ],
        balanceSnapshots: [
          {
            snapshotDate: new Date("2026-03-31T00:00:00.000Z"),
            balance: new Prisma.Decimal("1"),
            createdAt: EXPORTED_AT,
            updatedAt: EXPORTED_AT,
          },
        ],
      }),
    );

    expect(result.meta.counts).toEqual({
      transactions: 3,
      counterparts: 2,
      donors: 2,
      balanceSnapshots: 1,
      organizationReportProfiles: 0,
    });
  });
});
