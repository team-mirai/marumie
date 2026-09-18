import { SyncImportValidationError } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import { parseOrganizationSyncImportFile } from "@/server/contexts/data-import/domain/services/organization-sync-import-parser";

const EXPORTED_AT = "2026-09-18T01:23:45.678Z";

function buildTransaction(overrides: Record<string, unknown> = {}) {
  return {
    transactionNo: "1",
    transactionDate: "2026-04-01",
    financialYear: 2026,
    transactionType: "income",
    debitAccount: "普通預金",
    debitSubAccount: null,
    debitDepartment: null,
    debitPartner: null,
    debitTaxCategory: null,
    debitAmount: "1000.00",
    creditAccount: "個人からの寄附",
    creditSubAccount: null,
    creditDepartment: null,
    creditPartner: null,
    creditTaxCategory: null,
    creditAmount: "1000.00",
    description: null,
    memo: null,
    friendlyCategory: null,
    categoryKey: "donation-individual",
    label: "寄附",
    hash: "abc",
    isGrantExpenditure: false,
    createdAt: "2026-04-02T00:00:00.000Z",
    updatedAt: "2026-04-03T00:00:00.000Z",
    counterpart: null,
    donor: null,
    ...overrides,
  };
}

/** 書き出し側と同じく、取引にネストした取引先・寄付者を自然キーで重複排除して数える。 */
function countDistinct(
  transactions: unknown[],
  key: "counterpart" | "donor",
  // biome-ignore lint/suspicious/noExplicitAny: テストのファイル組み立て用
  toKey: (value: any) => (string | null)[],
): number {
  const keys = new Set<string>();
  for (const transaction of transactions) {
    const value = (transaction as Record<string, unknown>)[key];
    if (value) keys.add(JSON.stringify(toKey(value)));
  }
  return keys.size;
}

function buildFile(overrides: Record<string, unknown> = {}) {
  const transactions = (overrides.transactions as unknown[]) ?? [buildTransaction()];
  const balanceSnapshots = (overrides.balanceSnapshots as unknown[]) ?? [];
  const organizationReportProfiles = (overrides.organizationReportProfiles as unknown[]) ?? [];

  return {
    meta: {
      formatVersion: 1,
      exportedAt: EXPORTED_AT,
      sourceEnvironment: "production",
      latestMigrationName: "20260901000000_add_something",
      organizationSlug: "team-mirai",
      counts: {
        transactions: transactions.length,
        counterparts: countDistinct(transactions, "counterpart", (c) => [c.name, c.address]),
        donors: countDistinct(transactions, "donor", (d) => [d.donorType, d.name, d.address]),
        balanceSnapshots: balanceSnapshots.length,
        organizationReportProfiles: organizationReportProfiles.length,
      },
      ...((overrides.meta as Record<string, unknown>) ?? {}),
    },
    transactions,
    balanceSnapshots,
    organizationReportProfiles,
  };
}

function parse(file: unknown) {
  return parseOrganizationSyncImportFile(JSON.stringify(file));
}

describe("parseOrganizationSyncImportFile", () => {
  it("書き出し形式をそのまま読める", () => {
    const parsed = parse(
      buildFile({
        transactions: [
          buildTransaction({
            counterpart: { name: "株式会社A", postalCode: "1000001", address: "東京都千代田区" },
            donor: {
              donorType: "individual",
              name: "山田太郎",
              address: "東京都港区",
              occupation: "会社員",
            },
          }),
        ],
        balanceSnapshots: [
          {
            snapshotDate: "2026-03-31",
            balance: "123456.78",
            createdAt: EXPORTED_AT,
            updatedAt: EXPORTED_AT,
          },
        ],
        organizationReportProfiles: [
          {
            financialYear: 2026,
            officialName: "チームみらい",
            officialNameKana: "チームミライ",
            officeAddress: "東京都千代田区",
            officeAddressBuilding: null,
            details: { foo: "bar" },
            createdAt: EXPORTED_AT,
            updatedAt: EXPORTED_AT,
          },
        ],
      }),
    );

    expect(parsed.meta.organizationSlug).toBe("team-mirai");
    expect(parsed.transactions[0].counterpart).toEqual({
      name: "株式会社A",
      postalCode: "1000001",
      address: "東京都千代田区",
    });
    expect(parsed.transactions[0].donor?.donorType).toBe("individual");
    expect(parsed.balanceSnapshots[0].balance).toBe("123456.78");
    expect(parsed.organizationReportProfiles[0].details).toEqual({ foo: "bar" });
  });

  it("JSON として読めないファイルを拒否する", () => {
    expect(() => parseOrganizationSyncImportFile("{")).toThrow(SyncImportValidationError);
  });

  it("未対応の形式バージョンを拒否する", () => {
    expect(() => parse(buildFile({ meta: { formatVersion: 2 } }))).toThrow(
      /形式バージョン 2 には対応していません/,
    );
  });

  it("現在のスキーマが知らないカラムがあれば拒否する", () => {
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ unknownColumn: "x" })] })),
    ).toThrow(/知らないカラム/);
  });

  it("取引先・寄付者の知らないカラムも拒否する", () => {
    expect(() =>
      parse(
        buildFile({
          transactions: [
            buildTransaction({ counterpart: { name: "A", address: null, newColumn: 1 } }),
          ],
        }),
      ),
    ).toThrow(/知らないカラム/);
  });

  it("ファイルに無い新しいカラムはデフォルト値で埋める", () => {
    const transaction = buildTransaction();
    for (const key of [
      "label",
      "hash",
      "isGrantExpenditure",
      "memo",
      "createdAt",
      "updatedAt",
      "counterpart",
      "donor",
    ]) {
      delete (transaction as Record<string, unknown>)[key];
    }

    const parsed = parse(buildFile({ transactions: [transaction] }));

    expect(parsed.transactions[0]).toMatchObject({
      label: "",
      hash: "",
      isGrantExpenditure: false,
      memo: null,
      // ファイルに無ければ書き出し時刻で埋める（取り込み時刻より元データの鮮度に近い）
      createdAt: EXPORTED_AT,
      updatedAt: EXPORTED_AT,
      counterpart: null,
      donor: null,
    });
  });

  it("報告書プロフィールの details が無ければ空オブジェクトで埋める", () => {
    const parsed = parse(
      buildFile({
        organizationReportProfiles: [{ financialYear: 2026 }],
      }),
    );

    expect(parsed.organizationReportProfiles[0]).toMatchObject({
      details: {},
      officialName: null,
      createdAt: EXPORTED_AT,
    });
  });

  it("必須カラムが欠けていれば拒否する", () => {
    const transaction = buildTransaction();
    delete (transaction as Record<string, unknown>).categoryKey;

    expect(() => parse(buildFile({ transactions: [transaction] }))).toThrow(
      /transactions\[0\]\.categoryKey がありません/,
    );
  });

  it("現在の enum に無い値を拒否する", () => {
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ transactionType: "unknown_type" })] })),
    ).toThrow(/現在のスキーマでは扱えません/);
  });

  it("日付・金額の表記が違えば拒否する", () => {
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ transactionDate: "2026/04/01" })] })),
    ).toThrow(/YYYY-MM-DD/);
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ debitAmount: 1000 })] })),
    ).toThrow(/文字列である必要があります/);
  });

  it("実在しない日付を拒否する（Date.parse が別の日付に正規化してしまうため）", () => {
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ transactionDate: "2026-02-30" })] })),
    ).toThrow(/実在する YYYY-MM-DD/);
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ transactionDate: "2026-13-01" })] })),
    ).toThrow(/実在する YYYY-MM-DD/);
    expect(
      parse(buildFile({ transactions: [buildTransaction({ transactionDate: "2024-02-29" })] }))
        .transactions[0].transactionDate,
    ).toBe("2024-02-29");
  });

  it("Decimal(15, 2) に収まらない金額を拒否する", () => {
    expect(() =>
      parse(buildFile({ transactions: [buildTransaction({ debitAmount: "1000.999" })] })),
    ).toThrow(/数値の文字列である必要があります/);
    expect(() =>
      parse(
        buildFile({ transactions: [buildTransaction({ creditAmount: "12345678901234.00" })] }),
      ),
    ).toThrow(/数値の文字列である必要があります/);
  });

  it("meta に知らないカラムがあれば拒否する", () => {
    expect(() => parse(buildFile({ meta: { newMetaColumn: "x" } }))).toThrow(/知らないカラム/);
  });

  it("取引先・寄付者の件数が meta とずれていれば拒否する（ネストした値が欠けたファイル）", () => {
    const file = buildFile({
      transactions: [
        buildTransaction({
          counterpart: { name: "株式会社A", postalCode: null, address: "東京都千代田区" },
        }),
      ],
    });
    // 取引先が落ちたファイル（トップレベルの配列長は一致したまま）
    file.transactions = [buildTransaction()];

    expect(() => parse(file)).toThrow(/counterparts の件数が meta と一致しません/);
  });

  it("寄付者の件数も自然キーで重複排除して照合する", () => {
    const donor = {
      donorType: "individual",
      name: "山田太郎",
      address: "東京都港区",
      occupation: "会社員",
    };
    const file = buildFile({
      transactions: [
        buildTransaction({ transactionNo: "1", donor }),
        buildTransaction({ transactionNo: "2", donor }),
      ],
    });

    // 同じ寄付者なので meta は 1 件。取引 2 件でも通る。
    expect(file.meta.counts.donors).toBe(1);
    expect(parse(file).transactions).toHaveLength(2);

    file.meta.counts.donors = 2;
    expect(() => parse(file)).toThrow(/donors の件数が meta と一致しません/);
  });

  it("meta の件数と実際の件数がずれていれば拒否する（途中で欠けたファイル）", () => {
    const file = buildFile();
    file.meta.counts.transactions = 2;

    expect(() => parse(file)).toThrow(/件数が meta と一致しません/);
  });

  it("トップレベルに知らないキーがあれば拒否する", () => {
    expect(() => parse({ ...buildFile(), politicians: [] })).toThrow(/知らないカラム/);
  });
});
