import {
  GrantExpenditureSection,
  type FromExpenseSectionsInput,
} from "@/server/contexts/report/domain/models/grant-expenditure";
import type { ExpenseRow } from "@/server/contexts/report/domain/models/expense-transaction";

describe("GrantExpenditureSection", () => {
  const createExpenseRow = (overrides: Partial<ExpenseRow> = {}): ExpenseRow => ({
    ichirenNo: "1",
    mokuteki: "テスト目的",
    kingaku: 100000,
    dt: new Date("2024-06-01"),
    nm: "テスト取引先",
    adr: "東京都千代田区",
    bikou: "備考",
    koufukin: 0,
    ...overrides,
  });

  const createEmptyInput = (): FromExpenseSectionsInput => ({
    utilityExpenses: { rows: [] },
    suppliesExpenses: { rows: [] },
    officeExpenses: { rows: [] },
    organizationExpenses: [],
    electionExpenses: [],
    publicationExpenses: [],
    advertisingExpenses: [],
    fundraisingPartyExpenses: [],
    otherBusinessExpenses: [],
    researchExpenses: [],
    donationGrantExpenses: [],
    otherPoliticalExpenses: [],
  });

  describe("fromExpenseSections", () => {
    it("空の入力で空のセクションを返す", () => {
      const input = createEmptyInput();

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(0);
      expect(result.rows).toHaveLength(0);
    });

    it("交付金フラグなしの明細は抽出しない", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 0, kingaku: 50000 }),
        createExpenseRow({ koufukin: undefined, kingaku: 30000 }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(0);
      expect(result.rows).toHaveLength(0);
    });

    it("光熱水費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 50000, nm: "電力会社", adr: "東京都" }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(50000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("光熱水費");
      expect(result.rows[0].kingaku).toBe(50000);
      expect(result.rows[0].honsibuNm).toBe("電力会社");
      expect(result.rows[0].jimuAdr).toBe("東京都");
    });

    it("備品・消耗品費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.suppliesExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 30000 }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(30000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("備品・消耗品費");
    });

    it("事務所費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.officeExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 80000 }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(80000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("事務所費");
    });

    it("組織活動費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.organizationExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 60000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(60000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("組織活動費");
    });

    it("選挙関係費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.electionExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 70000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(70000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("選挙関係費");
    });

    it("機関紙誌の発行事業費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.publicationExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 40000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(40000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("機関紙誌の発行事業費");
    });

    it("宣伝事業費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.advertisingExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 90000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(90000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("宣伝事業費");
    });

    it("政治資金パーティー開催事業費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.fundraisingPartyExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 120000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(120000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("政治資金パーティー開催事業費");
    });

    it("その他の事業費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.otherBusinessExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 25000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(25000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("その他の事業費");
    });

    it("調査研究費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.researchExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 35000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(35000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("調査研究費");
    });

    it("寄附・交付金から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.donationGrantExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 45000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(45000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("寄附・交付金");
    });

    it("その他の経費から交付金フラグ付き明細を抽出する", () => {
      const input = createEmptyInput();
      input.otherPoliticalExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 55000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(55000);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].shisyutuKmk).toBe("その他の経費");
    });

    it("複数カテゴリから交付金フラグ付き明細を抽出して合計する", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 50000 }),
      ];
      input.suppliesExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 30000 }),
      ];
      input.organizationExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 60000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(140000);
      expect(result.rows).toHaveLength(3);
    });

    it("連番が正しく振られる", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 50000 }),
        createExpenseRow({ koufukin: 1, kingaku: 30000 }),
      ];
      input.officeExpenses.rows = [
        createExpenseRow({ koufukin: 1, kingaku: 40000 }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.rows[0].ichirenNo).toBe("1");
      expect(result.rows[1].ichirenNo).toBe("2");
      expect(result.rows[2].ichirenNo).toBe("3");
    });

    it("備考がある場合は備考を含める", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 1, bikou: "テスト備考" }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.rows[0].bikou).toBe("テスト備考");
    });

    it("備考がない場合はundefined", () => {
      const input = createEmptyInput();
      input.utilityExpenses.rows = [
        createExpenseRow({ koufukin: 1, bikou: undefined }),
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.rows[0].bikou).toBeUndefined();
    });

    it("複数セクションを持つ政治活動費から抽出する", () => {
      const input = createEmptyInput();
      input.organizationExpenses = [
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 60000 })] },
        { rows: [createExpenseRow({ koufukin: 1, kingaku: 70000 })] },
      ];

      const result = GrantExpenditureSection.fromExpenseSections(input);

      expect(result.totalAmount).toBe(130000);
      expect(result.rows).toHaveLength(2);
    });
  });

  describe("shouldOutputSheet", () => {
    it("明細がある場合はtrueを返す", () => {
      const section = {
        totalAmount: 100000,
        rows: [
          {
            ichirenNo: "1",
            shisyutuKmk: "光熱水費",
            kingaku: 100000,
            dt: new Date("2024-06-01"),
            honsibuNm: "テスト",
            jimuAdr: "東京都",
          },
        ],
      };

      expect(GrantExpenditureSection.shouldOutputSheet(section)).toBe(true);
    });

    it("明細がない場合はfalseを返す", () => {
      const section = {
        totalAmount: 0,
        rows: [],
      };

      expect(GrantExpenditureSection.shouldOutputSheet(section)).toBe(false);
    });
  });
});
