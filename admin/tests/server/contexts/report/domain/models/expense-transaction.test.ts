import {
  UtilityExpenseSection,
  SuppliesExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  ElectionExpenseSection,
  PublicationExpenseSection,
  AdvertisingExpenseSection,
  FundraisingPartyExpenseSection,
  OtherBusinessExpenseSection,
  ResearchExpenseSection,
  DonationGrantExpenseSection,
  OtherPoliticalExpenseSection,
  type UtilityExpenseTransaction,
  type SuppliesExpenseTransaction,
  type OfficeExpenseTransaction,
  type OrganizationExpenseTransaction,
} from "@/server/contexts/report/domain/models/expense-transaction";
import { resolveExpenseAmount } from "@/server/contexts/report/domain/models/transaction-utils";
import { ValidationErrorCode } from "@/server/contexts/report/domain/types/validation";

describe("UtilityExpenseSection.fromTransactions", () => {
  it("converts empty transactions to empty section", () => {
    const result = UtilityExpenseSection.fromTransactions([]);

    expect(result).toEqual({
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [],
    });
  });

  it("converts single transaction above threshold", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
        transactionDate: new Date("2024-04-01"),
        counterpartName: "電力会社",
        counterpartAddress: "東京都千代田区",
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(150000);
    expect(result.underThresholdAmount).toBe(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      ichirenNo: "1",
      kingaku: 150000,
      nm: "電力会社",
      adr: "東京都千代田区",
    });
  });

  it("separates transactions by 100,000 yen threshold", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 50000,
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 100000,
      }),
      createUtilityTransaction({
        transactionNo: "4",
        debitAmount: 99999,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    // Total includes all transactions
    expect(result.totalAmount).toBe(399999);
    // Only < 100,000 in underThreshold
    expect(result.underThresholdAmount).toBe(149999); // 50000 + 99999
    // Only >= 100,000 in rows
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].kingaku).toBe(150000);
    expect(result.rows[1].kingaku).toBe(100000);
  });

  it("rounds decimal amounts consistently in all fields", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 100000.5, // Rounds to 100001
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 100000.4, // Rounds to 100000
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 100000.3, // Rounds to 100000
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    // All amounts should be rounded
    expect(result.totalAmount).toBe(300001); // 100001 + 100000 + 100000
    expect(result.underThresholdAmount).toBe(0);
    expect(result.rows).toHaveLength(3);

    // Sum of kingaku should equal totalAmount
    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum).toBe(result.totalAmount);
    expect(kingakuSum).toBe(300001);

    expect(result.rows[0].kingaku).toBe(100001);
    expect(result.rows[1].kingaku).toBe(100000);
    expect(result.rows[2].kingaku).toBe(100000);
  });

  it("rounds decimal amounts with under-threshold transactions", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 100000.5, // Rounds to 100001 (above threshold)
      }),
      createUtilityTransaction({
        transactionNo: "2",
        debitAmount: 50000.6, // Rounds to 50001 (under threshold)
      }),
      createUtilityTransaction({
        transactionNo: "3",
        debitAmount: 30000.4, // Rounds to 30000 (under threshold)
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(180002); // 100001 + 50001 + 30000
    expect(result.underThresholdAmount).toBe(80001); // 50001 + 30000
    expect(result.rows).toHaveLength(1);

    // Sum of kingaku + underThresholdAmount should equal totalAmount
    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("SuppliesExpenseSection.fromTransactions", () => {
  it("converts supplies expense transactions", () => {
    const transactions: SuppliesExpenseTransaction[] = [
      createSuppliesTransaction({
        transactionNo: "1",
        debitAmount: 200000,
      }),
    ];

    const result = SuppliesExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(200000);
    expect(result.rows).toHaveLength(1);
  });

  it("rounds decimal amounts consistently", () => {
    const transactions: SuppliesExpenseTransaction[] = [
      createSuppliesTransaction({
        transactionNo: "1",
        debitAmount: 150000.75,
      }),
      createSuppliesTransaction({
        transactionNo: "2",
        debitAmount: 75000.25,
      }),
    ];

    const result = SuppliesExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(225001); // 150001 + 75000
    expect(result.underThresholdAmount).toBe(75000);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].kingaku).toBe(150001);

    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("OfficeExpenseSection.fromTransactions", () => {
  it("converts office expense transactions", () => {
    const transactions: OfficeExpenseTransaction[] = [
      createOfficeTransaction({
        transactionNo: "1",
        debitAmount: 300000,
      }),
    ];

    const result = OfficeExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(300000);
    expect(result.rows).toHaveLength(1);
  });

  it("rounds decimal amounts consistently", () => {
    const transactions: OfficeExpenseTransaction[] = [
      createOfficeTransaction({
        transactionNo: "1",
        debitAmount: 120000.49, // Rounds to 120000
      }),
      createOfficeTransaction({
        transactionNo: "2",
        debitAmount: 80000.51, // Rounds to 80001
      }),
    ];

    const result = OfficeExpenseSection.fromTransactions(transactions);

    expect(result.totalAmount).toBe(200001); // 120000 + 80001
    expect(result.underThresholdAmount).toBe(80001);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].kingaku).toBe(120000);

    const kingakuSum = result.rows.reduce((sum, row) => sum + row.kingaku, 0);
    expect(kingakuSum + result.underThresholdAmount).toBe(result.totalAmount);
  });
});

describe("resolveExpenseAmount", () => {
  it("uses debitAmount when positive", () => {
    expect(resolveExpenseAmount(100, 0)).toBe(100);
  });

  it("uses creditAmount when debitAmount is zero", () => {
    expect(resolveExpenseAmount(0, 200)).toBe(200);
  });

  it("uses creditAmount when debitAmount is negative", () => {
    expect(resolveExpenseAmount(-50, 200)).toBe(200);
  });

  it("returns 0 when both amounts are invalid", () => {
    expect(resolveExpenseAmount(0, 0)).toBe(0);
    expect(resolveExpenseAmount(NaN, NaN)).toBe(0);
  });
});

describe("expense field building", () => {
  it("builds mokuteki from friendlyCategory", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        friendlyCategory: "電気料金",
        debitAmount: 150000,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].mokuteki).toBe("電気料金");
  });

  it("builds bikou with transaction number", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "12345",
        debitAmount: 150000,
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].bikou).toContain("MF行番号: 12345");
  });

  it("sanitizes text fields", () => {
    const transactions: UtilityExpenseTransaction[] = [
      createUtilityTransaction({
        transactionNo: "1",
        debitAmount: 150000,
        counterpartName: "  電力  会社  ",
        counterpartAddress: "東京都   千代田区",
      }),
    ];

    const result = UtilityExpenseSection.fromTransactions(transactions);

    expect(result.rows[0].nm).toBe("電力 会社");
    expect(result.rows[0].adr).toBe("東京都 千代田区");
  });
});

// Factory functions for test data
function createUtilityTransaction(
  overrides: Partial<UtilityExpenseTransaction> = {},
): UtilityExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "光熱水費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

function createSuppliesTransaction(
  overrides: Partial<SuppliesExpenseTransaction> = {},
): SuppliesExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "備品・消耗品費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

function createOfficeTransaction(
  overrides: Partial<OfficeExpenseTransaction> = {},
): OfficeExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "事務所費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

const createExpenseRow = () => ({
  ichirenNo: "1",
  mokuteki: "テスト",
  kingaku: 100000,
  dt: new Date("2024-01-01"),
  nm: "テスト取引先",
  adr: "東京都",
});

describe("UtilityExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [createExpenseRow()],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("目的が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), mokuteki: "" }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("金額が0以下の場合エラーを返す", () => {
    const section = {
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), kingaku: 0 }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.NEGATIVE_VALUE);
  });

  it("年月日が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), dt: null as unknown as Date }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("氏名が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), nm: "" }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("住所が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), adr: "" }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("目的が200文字を超える場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), mokuteki: "あ".repeat(201) }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.MAX_LENGTH_EXCEEDED);
  });

  it("氏名が120文字を超える場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), nm: "あ".repeat(121) }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.MAX_LENGTH_EXCEEDED);
  });

  it("住所が120文字を超える場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), adr: "あ".repeat(121) }],
    };
    const errors = UtilityExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.MAX_LENGTH_EXCEEDED);
  });
});

describe("SuppliesExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = SuppliesExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [createExpenseRow()],
    };
    const errors = SuppliesExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("目的が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), mokuteki: "" }],
    };
    const errors = SuppliesExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });
});

describe("OfficeExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = OfficeExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [createExpenseRow()],
    };
    const errors = OfficeExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("目的が空の場合エラーを返す", () => {
    const section = {
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), mokuteki: "" }],
    };
    const errors = OfficeExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });
});

describe("OrganizationExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = OrganizationExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      himoku: "会議費",
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [createExpenseRow()],
    };
    const errors = OrganizationExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("目的が空の場合エラーを返す", () => {
    const section = {
      himoku: "会議費",
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), mokuteki: "" }],
    };
    const errors = OrganizationExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });
});

describe("ElectionExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = ElectionExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      himoku: "選挙ポスター",
      totalAmount: 50000,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), kingaku: 50000 }],
    };
    const errors = ElectionExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("PublicationExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = PublicationExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("AdvertisingExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = AdvertisingExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("FundraisingPartyExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = FundraisingPartyExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("OtherBusinessExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = OtherBusinessExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("ResearchExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = ResearchExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("DonationGrantExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = DonationGrantExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });
});

describe("OtherPoliticalExpenseSection.validate", () => {
  it("空のセクションでエラーを返さない", () => {
    const section = { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] };
    const errors = OtherPoliticalExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("正常なデータでエラーを返さない", () => {
    const section = {
      himoku: "その他経費",
      totalAmount: 100000,
      underThresholdAmount: 0,
      rows: [createExpenseRow()],
    };
    const errors = OtherPoliticalExpenseSection.validate(section);

    expect(errors).toHaveLength(0);
  });

  it("金額が0以下の場合エラーを返す", () => {
    const section = {
      himoku: "その他経費",
      totalAmount: 0,
      underThresholdAmount: 0,
      rows: [{ ...createExpenseRow(), kingaku: 0 }],
    };
    const errors = OtherPoliticalExpenseSection.validate(section);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.NEGATIVE_VALUE);
  });
});

// ============================================================
// 統合テスト: 複数friendlyCategoryによるグループ化
// ============================================================

function createOrganizationExpenseTransaction(
  overrides: Partial<OrganizationExpenseTransaction> = {},
): OrganizationExpenseTransaction {
  return {
    transactionNo: "1",
    friendlyCategory: "組織活動費",
    label: null,
    description: null,
    memo: null,
    debitAmount: 50000,
    creditAmount: 0,
    transactionDate: new Date("2024-01-01"),
    counterpartName: "取引先",
    counterpartAddress: "東京都",
    ...overrides,
  };
}

describe("OrganizationExpenseSection.fromTransactions - 複数friendlyCategoryのグループ化", () => {
  it("空のトランザクションで空の配列を返す", () => {
    const sections = OrganizationExpenseSection.fromTransactions([]);

    expect(sections).toHaveLength(0);
  });

  it("単一のfriendlyCategoryで1つのセクションを返す", () => {
    const transactions: OrganizationExpenseTransaction[] = [
      createOrganizationExpenseTransaction({
        transactionNo: "1",
        friendlyCategory: "会議費",
        debitAmount: 60000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "2",
        friendlyCategory: "会議費",
        debitAmount: 70000,
      }),
    ];

    const sections = OrganizationExpenseSection.fromTransactions(transactions);

    expect(sections).toHaveLength(1);
    expect(sections[0].himoku).toBe("会議費");
    expect(sections[0].totalAmount).toBe(130000);
  });

  it("複数のfriendlyCategoryでグループ化して複数セクションを返す", () => {
    const transactions: OrganizationExpenseTransaction[] = [
      createOrganizationExpenseTransaction({
        transactionNo: "1",
        friendlyCategory: "会議費",
        debitAmount: 60000,
        transactionDate: new Date("2024-06-01"),
        counterpartName: "会議室A",
        counterpartAddress: "東京都千代田区",
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "2",
        friendlyCategory: "交通費",
        debitAmount: 80000,
        transactionDate: new Date("2024-06-15"),
        counterpartName: "タクシー会社",
        counterpartAddress: "東京都港区",
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "3",
        friendlyCategory: "会議費",
        debitAmount: 70000,
        transactionDate: new Date("2024-06-20"),
        counterpartName: "会議室B",
        counterpartAddress: "東京都渋谷区",
      }),
    ];

    const sections = OrganizationExpenseSection.fromTransactions(transactions);

    expect(sections).toHaveLength(2);

    const meetingSection = sections.find((s) => s.himoku === "会議費");
    const transportSection = sections.find((s) => s.himoku === "交通費");

    expect(meetingSection).toBeDefined();
    expect(meetingSection!.totalAmount).toBe(130000);
    expect(meetingSection!.rows).toHaveLength(2);

    expect(transportSection).toBeDefined();
    expect(transportSection!.totalAmount).toBe(80000);
    expect(transportSection!.rows).toHaveLength(1);
  });

  it("5万円閾値でrows/underThresholdAmountを正しく分離する", () => {
    const transactions: OrganizationExpenseTransaction[] = [
      createOrganizationExpenseTransaction({
        transactionNo: "1",
        friendlyCategory: "会議費",
        debitAmount: 60000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "2",
        friendlyCategory: "会議費",
        debitAmount: 40000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "3",
        friendlyCategory: "交通費",
        debitAmount: 30000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "4",
        friendlyCategory: "交通費",
        debitAmount: 50000,
      }),
    ];

    const sections = OrganizationExpenseSection.fromTransactions(transactions);

    expect(sections).toHaveLength(2);

    const meetingSection = sections.find((s) => s.himoku === "会議費");
    expect(meetingSection).toBeDefined();
    expect(meetingSection!.totalAmount).toBe(100000);
    expect(meetingSection!.underThresholdAmount).toBe(40000);
    expect(meetingSection!.rows).toHaveLength(1);
    expect(meetingSection!.rows[0].kingaku).toBe(60000);

    const transportSection = sections.find((s) => s.himoku === "交通費");
    expect(transportSection).toBeDefined();
    expect(transportSection!.totalAmount).toBe(80000);
    expect(transportSection!.underThresholdAmount).toBe(30000);
    expect(transportSection!.rows).toHaveLength(1);
    expect(transportSection!.rows[0].kingaku).toBe(50000);
  });

  it("ichirenNoがカテゴリごとに1から採番される", () => {
    const transactions: OrganizationExpenseTransaction[] = [
      createOrganizationExpenseTransaction({
        transactionNo: "1",
        friendlyCategory: "会議費",
        debitAmount: 60000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "2",
        friendlyCategory: "会議費",
        debitAmount: 70000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "3",
        friendlyCategory: "交通費",
        debitAmount: 80000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "4",
        friendlyCategory: "交通費",
        debitAmount: 90000,
      }),
    ];

    const sections = OrganizationExpenseSection.fromTransactions(transactions);

    const meetingSection = sections.find((s) => s.himoku === "会議費");
    expect(meetingSection!.rows[0].ichirenNo).toBe("1");
    expect(meetingSection!.rows[1].ichirenNo).toBe("2");

    const transportSection = sections.find((s) => s.himoku === "交通費");
    expect(transportSection!.rows[0].ichirenNo).toBe("1");
    expect(transportSection!.rows[1].ichirenNo).toBe("2");
  });

  it("費目でソートされる（空文字は最後）", () => {
    const transactions: OrganizationExpenseTransaction[] = [
      createOrganizationExpenseTransaction({
        transactionNo: "1",
        friendlyCategory: "交通費",
        debitAmount: 60000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "2",
        friendlyCategory: null,
        debitAmount: 70000,
      }),
      createOrganizationExpenseTransaction({
        transactionNo: "3",
        friendlyCategory: "会議費",
        debitAmount: 80000,
      }),
    ];

    const sections = OrganizationExpenseSection.fromTransactions(transactions);

    expect(sections).toHaveLength(3);
    expect(sections[0].himoku).toBe("会議費");
    expect(sections[1].himoku).toBe("交通費");
    expect(sections[2].himoku).toBe("");
  });
});
