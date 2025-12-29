import {
  DonationData,
  ExpenseData,
  IncomeData,
  ReportData,
  type ExpenseData as ExpenseDataType,
  type ReportData as ReportDataType,
} from "@/server/contexts/report/domain/models/report-data";
import { ValidationErrorCode } from "@/server/contexts/report/domain/types/validation";

describe("ExpenseData", () => {
  const createEmptyExpenseData = (): ExpenseDataType => ({
    personnelExpenses: { totalAmount: 0 },
    utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    // 政治活動費は配列で返される
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

  const createExpenseRow = () => ({
    ichirenNo: "1",
    mokuteki: "テスト",
    kingaku: 100000,
    dt: new Date("2024-01-01"),
    nm: "テスト取引先",
    adr: "東京都",
  });

  describe("shouldOutputRegularExpenseSheet", () => {
    it("全ての経常経費が空の場合はfalseを返す", () => {
      const data = createEmptyExpenseData();
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(false);
    });

    it("光熱水費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.utilityExpenses.totalAmount = 50000;
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(true);
    });

    it("光熱水費に明細行がある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.utilityExpenses.rows = [createExpenseRow()];
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(true);
    });

    it("備品・消耗品費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.suppliesExpenses.totalAmount = 30000;
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(true);
    });

    it("事務所費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.officeExpenses.totalAmount = 20000;
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(true);
    });

    it("政治活動費のみにデータがある場合はfalseを返す", () => {
      const data = createEmptyExpenseData();
      data.organizationExpenses = [
        { himoku: "", totalAmount: 100000, underThresholdAmount: 0, rows: [] },
      ];
      data.electionExpenses = [
        { himoku: "", totalAmount: 50000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputRegularExpenseSheet(data)).toBe(false);
    });
  });

  describe("shouldOutputPoliticalActivitySheet", () => {
    it("全ての政治活動費が空の場合はfalseを返す", () => {
      const data = createEmptyExpenseData();
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(false);
    });

    it("組織活動費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.organizationExpenses = [
        { himoku: "", totalAmount: 100000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("選挙関係費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.electionExpenses = [
        { himoku: "", totalAmount: 50000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("機関紙誌の発行事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.publicationExpenses = [
        { himoku: "", totalAmount: 30000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("宣伝事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.advertisingExpenses = [
        { himoku: "", totalAmount: 20000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("政治資金パーティー開催事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.fundraisingPartyExpenses = [
        { himoku: "", totalAmount: 10000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("その他の事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.otherBusinessExpenses = [
        { himoku: "", totalAmount: 5000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("調査研究費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.researchExpenses = [
        { himoku: "", totalAmount: 3000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("寄附・交付金にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.donationGrantExpenses = [
        { himoku: "", totalAmount: 2000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("その他の経費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.otherPoliticalExpenses = [
        { himoku: "", totalAmount: 1000, underThresholdAmount: 0, rows: [] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("経常経費のみにデータがある場合はfalseを返す", () => {
      const data = createEmptyExpenseData();
      data.utilityExpenses.totalAmount = 100000;
      data.suppliesExpenses.totalAmount = 50000;
      data.officeExpenses.totalAmount = 30000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(false);
    });

    it("明細行のみがある場合もtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.organizationExpenses = [
        { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [createExpenseRow()] },
      ];
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });
  });
});

describe("ReportData", () => {
  const createEmptyReportData = (): ReportDataType => ({
    profile: {
      id: "1",
      politicalOrganizationId: "org-1",
      financialYear: 2024,
      officialName: "テスト政治団体",
      officialNameKana: "テストセイジダンタイ",
      officeAddress: "東京都千代田区",
      officeAddressBuilding: null,
      details: {
        representative: { lastName: "山田", firstName: "太郎" },
        accountant: { lastName: "田中", firstName: "花子" },
        activityArea: "1",
        dietMemberRelation: { type: "0" },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    donations: {
      personalDonations: { totalAmount: 0, sonotaGk: 0, rows: [] },
    },
    income: {
      businessIncome: { totalAmount: 0, rows: [] },
      loanIncome: { totalAmount: 0, rows: [] },
      grantIncome: { totalAmount: 0, rows: [] },
      otherIncome: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    },
    expenses: {
      personnelExpenses: { totalAmount: 0 },
      utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      // 政治活動費は配列で返される
      organizationExpenses: [],
      electionExpenses: [],
      publicationExpenses: [],
      advertisingExpenses: [],
      fundraisingPartyExpenses: [],
      otherBusinessExpenses: [],
      researchExpenses: [],
      donationGrantExpenses: [],
      otherPoliticalExpenses: [],
    },
  });

  describe("buildSyuushiUmuFlg", () => {
    it("51桁のフラグ文字列を生成する", () => {
      const data = createEmptyReportData();
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString).toHaveLength(51);
    });

    it("01桁目（その1）は常に1を返す", () => {
      const data = createEmptyReportData();
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[0]).toBe("1");
    });

    it("データがない場合、01桁目と02桁目以外は全て0を返す", () => {
      const data = createEmptyReportData();
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      // 01桁目（その1）と02桁目（その2：収支総括表）は常に1
      expect(flagString[0]).toBe("1");
      expect(flagString[1]).toBe("1");
      expect(flagString.slice(2)).toBe("0".repeat(49));
    });

    it("03桁目: 事業による収入がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.income.businessIncome.totalAmount = 100000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[2]).toBe("1"); // 0-indexed: 桁3 = index 2
    });

    it("04桁目: 借入金がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.income.loanIncome.totalAmount = 50000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[3]).toBe("1");
    });

    it("05桁目: 交付金がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.income.grantIncome.totalAmount = 30000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[4]).toBe("1");
    });

    it("06桁目: その他の収入がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.income.otherIncome.totalAmount = 20000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[5]).toBe("1");
    });

    it("07桁目: 個人からの寄附がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.donations.personalDonations.totalAmount = 100000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[6]).toBe("1");
    });

    it("22桁目: 光熱水費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.utilityExpenses.totalAmount = 50000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[21]).toBe("1"); // 0-indexed: 桁22 = index 21
    });

    it("23桁目: 備品・消耗品費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.suppliesExpenses.totalAmount = 30000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[22]).toBe("1");
    });

    it("24桁目: 事務所費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.officeExpenses.totalAmount = 20000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[23]).toBe("1");
    });

    it("25桁目: 組織活動費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.organizationExpenses = [
        { himoku: "", totalAmount: 100000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[24]).toBe("1");
    });

    it("26桁目: 選挙関係費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.electionExpenses = [
        { himoku: "", totalAmount: 50000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[25]).toBe("1");
    });

    it("27桁目: 機関紙誌の発行事業費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.publicationExpenses = [
        { himoku: "", totalAmount: 30000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[26]).toBe("1");
    });

    it("28桁目: 宣伝事業費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.advertisingExpenses = [
        { himoku: "", totalAmount: 20000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[27]).toBe("1");
    });

    it("29桁目: 政治資金パーティー開催事業費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.fundraisingPartyExpenses = [
        { himoku: "", totalAmount: 10000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[28]).toBe("1");
    });

    it("30桁目: その他の事業費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.otherBusinessExpenses = [
        { himoku: "", totalAmount: 5000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[29]).toBe("1");
    });

    it("31桁目: 調査研究費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.researchExpenses = [
        { himoku: "", totalAmount: 3000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[30]).toBe("1");
    });

    it("32桁目: 寄附・交付金がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.donationGrantExpenses = [
        { himoku: "", totalAmount: 2000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[31]).toBe("1");
    });

    it("33桁目: その他の経費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.otherPoliticalExpenses = [
        { himoku: "", totalAmount: 1000, underThresholdAmount: 0, rows: [] },
      ];
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[32]).toBe("1");
    });

    it("複数のセクションにデータがある場合、対応する桁が全て1になる", () => {
      const data = createEmptyReportData();
      data.income.businessIncome.totalAmount = 100000; // 03桁目
      data.donations.personalDonations.totalAmount = 50000; // 07桁目
      data.expenses.utilityExpenses.totalAmount = 30000; // 22桁目
      data.expenses.organizationExpenses = [
        { himoku: "", totalAmount: 20000, underThresholdAmount: 0, rows: [] },
      ]; // 25桁目

      const flagString = ReportData.buildSyuushiUmuFlg(data);

      expect(flagString[0]).toBe("1"); // 01桁目: その1（常に1）
      expect(flagString[2]).toBe("1"); // 03桁目: 事業収入
      expect(flagString[6]).toBe("1"); // 07桁目: 個人寄附
      expect(flagString[21]).toBe("1"); // 22桁目: 光熱水費
      expect(flagString[24]).toBe("1"); // 25桁目: 組織活動費
    });
  });

  describe("getSummary", () => {
    it("空のデータから収支総括表を計算する", () => {
      const data = createEmptyReportData();
      const summary = ReportData.getSummary(data, 0);

      expect(summary.syunyuSgk).toBe(0);
      expect(summary.zennenKksGk).toBe(0);
      expect(summary.honnenSyunyuGk).toBe(0);
      expect(summary.sisyutuSgk).toBe(0);
      expect(summary.yokunenKksGk).toBe(0);
      expect(summary.kojinKifuGk).toBe(0);
      expect(summary.kifuSkeiGk).toBe(0);
      expect(summary.kifuGkeiGk).toBe(0);
    });

    it("前年繰越額を含めて収入総額を計算する", () => {
      const data = createEmptyReportData();
      data.donations.personalDonations.totalAmount = 100000;

      const summary = ReportData.getSummary(data, 50000);

      expect(summary.zennenKksGk).toBe(50000);
      expect(summary.kojinKifuGk).toBe(100000);
      expect(summary.kifuSkeiGk).toBe(100000);
      expect(summary.kifuGkeiGk).toBe(100000);
      expect(summary.honnenSyunyuGk).toBe(100000);
      expect(summary.syunyuSgk).toBe(150000); // 前年繰越50000 + 本年収入100000
    });

    it("全ての収入項目を合計して本年収入額を計算する", () => {
      const data = createEmptyReportData();
      data.donations.personalDonations.totalAmount = 100000; // 寄附
      data.income.businessIncome.totalAmount = 50000; // 事業収入
      data.income.loanIncome.totalAmount = 30000; // 借入金
      data.income.grantIncome.totalAmount = 20000; // 交付金
      data.income.otherIncome.totalAmount = 10000; // その他収入

      const summary = ReportData.getSummary(data, 0);

      // 本年収入額 = 寄附合計 + 事業収入 + 借入金 + 交付金 + その他収入
      expect(summary.honnenSyunyuGk).toBe(210000);
      expect(summary.syunyuSgk).toBe(210000);
    });

    it("全ての支出項目を合計して支出総額を計算する", () => {
      const data = createEmptyReportData();
      // 経常経費
      data.expenses.utilityExpenses.totalAmount = 10000;
      data.expenses.suppliesExpenses.totalAmount = 20000;
      data.expenses.officeExpenses.totalAmount = 30000;
      // 政治活動費（配列で設定）
      data.expenses.organizationExpenses = [
        { himoku: "", totalAmount: 40000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.electionExpenses = [
        { himoku: "", totalAmount: 50000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.publicationExpenses = [
        { himoku: "", totalAmount: 60000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.advertisingExpenses = [
        { himoku: "", totalAmount: 70000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.fundraisingPartyExpenses = [
        { himoku: "", totalAmount: 80000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.otherBusinessExpenses = [
        { himoku: "", totalAmount: 90000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.researchExpenses = [
        { himoku: "", totalAmount: 100000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.donationGrantExpenses = [
        { himoku: "", totalAmount: 110000, underThresholdAmount: 0, rows: [] },
      ];
      data.expenses.otherPoliticalExpenses = [
        { himoku: "", totalAmount: 120000, underThresholdAmount: 0, rows: [] },
      ];

      const summary = ReportData.getSummary(data, 0);

      // 支出総額 = 経常経費(60000) + 政治活動費(720000)
      expect(summary.sisyutuSgk).toBe(780000);
    });

    it("翌年繰越額を正しく計算する", () => {
      const data = createEmptyReportData();
      data.donations.personalDonations.totalAmount = 500000;
      data.expenses.utilityExpenses.totalAmount = 100000;
      data.expenses.organizationExpenses = [
        { himoku: "", totalAmount: 200000, underThresholdAmount: 0, rows: [] },
      ];

      const summary = ReportData.getSummary(data, 100000);

      // 収入総額 = 前年繰越100000 + 本年収入500000 = 600000
      // 支出総額 = 経常経費100000 + 政治活動費200000 = 300000
      // 翌年繰越額 = 収入総額 - 支出総額 = 300000
      expect(summary.syunyuSgk).toBe(600000);
      expect(summary.sisyutuSgk).toBe(300000);
      expect(summary.yokunenKksGk).toBe(300000);
    });

    it("スコープ外の項目はnullを返す", () => {
      const data = createEmptyReportData();
      const summary = ReportData.getSummary(data, 0);

      expect(summary.kojinFutanKgk).toBeNull();
      expect(summary.kojinFutanSu).toBeNull();
      expect(summary.tokuteiKifuGk).toBeNull();
      expect(summary.hojinKifuGk).toBeNull();
      expect(summary.seijiKifuGk).toBeNull();
      expect(summary.atusenGk).toBeNull();
      expect(summary.tokumeiKifuGk).toBeNull();
    });
  });

  describe("validate", () => {
    it("正常なデータでisValid: trueを返す", () => {
      const data = createEmptyReportData();
      const result = ReportData.validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("プロフィールのバリデーションエラーを集約する", () => {
      const data = createEmptyReportData();
      data.profile.financialYear = 123; // 4桁でない

      const result = ReportData.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("profile"))).toBe(true);
    });

    it("寄附データのバリデーションエラーを集約する", () => {
      const data = createEmptyReportData();
      data.donations.personalDonations.rows = [
        {
          ichirenNo: "1",
          kifusyaNm: "",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ];

      const result = ReportData.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === ValidationErrorCode.REQUIRED)).toBe(true);
    });

    it("収入データのバリデーションエラーを集約する", () => {
      const data = createEmptyReportData();
      data.income.businessIncome.rows = [
        {
          ichirenNo: "1",
          gigyouSyurui: "",
          kingaku: 100000,
        },
      ];

      const result = ReportData.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("income"))).toBe(true);
    });

    it("支出データのバリデーションエラーを集約する", () => {
      const data = createEmptyReportData();
      data.expenses.utilityExpenses.rows = [
        {
          ichirenNo: "1",
          mokuteki: "",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          nm: "取引先",
          adr: "東京都",
        },
      ];

      const result = ReportData.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.path.includes("expenses"))).toBe(true);
    });

    it("複数のセクションからエラーを集約する", () => {
      const data = createEmptyReportData();
      data.profile.financialYear = 123;
      data.donations.personalDonations.rows = [
        {
          ichirenNo: "1",
          kifusyaNm: "",
          kingaku: 100000,
          dt: new Date("2024-01-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ];

      const result = ReportData.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("DonationData", () => {
  describe("validate", () => {
    it("空のデータでエラーを返さない", () => {
      const data = {
        personalDonations: { totalAmount: 0, sonotaGk: 0, rows: [] },
      };
      const errors = DonationData.validate(data);

      expect(errors).toHaveLength(0);
    });

    it("正常な寄附行でエラーを返さない", () => {
      const data = {
        personalDonations: {
          totalAmount: 100000,
          sonotaGk: 0,
          rows: [
            {
              ichirenNo: "1",
              kifusyaNm: "山田太郎",
              kingaku: 100000,
              dt: new Date("2024-01-01"),
              adr: "東京都千代田区",
              syokugyo: "会社員",
              zeigakukoujyo: "0",
              rowkbn: "0",
            },
          ],
        },
      };
      const errors = DonationData.validate(data);

      expect(errors).toHaveLength(0);
    });

    it("寄附者氏名が空の場合エラーを返す", () => {
      const data = {
        personalDonations: {
          totalAmount: 100000,
          sonotaGk: 0,
          rows: [
            {
              ichirenNo: "1",
              kifusyaNm: "",
              kingaku: 100000,
              dt: new Date("2024-01-01"),
              adr: "東京都",
              syokugyo: "会社員",
              zeigakukoujyo: "0",
              rowkbn: "0",
            },
          ],
        },
      };
      const errors = DonationData.validate(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
    });

    it("金額が0以下の場合エラーを返す", () => {
      const data = {
        personalDonations: {
          totalAmount: 0,
          sonotaGk: 0,
          rows: [
            {
              ichirenNo: "1",
              kifusyaNm: "山田太郎",
              kingaku: 0,
              dt: new Date("2024-01-01"),
              adr: "東京都",
              syokugyo: "会社員",
              zeigakukoujyo: "0",
              rowkbn: "0",
            },
          ],
        },
      };
      const errors = DonationData.validate(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe(ValidationErrorCode.NEGATIVE_VALUE);
    });
  });
});

describe("IncomeData", () => {
  describe("validate", () => {
    it("空のデータでエラーを返さない", () => {
      const data = {
        businessIncome: { totalAmount: 0, rows: [] },
        loanIncome: { totalAmount: 0, rows: [] },
        grantIncome: { totalAmount: 0, rows: [] },
        otherIncome: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      };
      const errors = IncomeData.validate(data);

      expect(errors).toHaveLength(0);
    });

    it("事業収入の事業種類が空の場合エラーを返す", () => {
      const data = {
        businessIncome: {
          totalAmount: 100000,
          rows: [
            {
              ichirenNo: "1",
              gigyouSyurui: "",
              kingaku: 100000,
            },
          ],
        },
        loanIncome: { totalAmount: 0, rows: [] },
        grantIncome: { totalAmount: 0, rows: [] },
        otherIncome: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      };
      const errors = IncomeData.validate(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
    });

    it("借入金の借入先が空の場合エラーを返す", () => {
      const data = {
        businessIncome: { totalAmount: 0, rows: [] },
        loanIncome: {
          totalAmount: 100000,
          rows: [
            {
              ichirenNo: "1",
              kariiresaki: "",
              kingaku: 100000,
            },
          ],
        },
        grantIncome: { totalAmount: 0, rows: [] },
        otherIncome: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      };
      const errors = IncomeData.validate(data);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
    });
  });
});

describe("ExpenseData.validate", () => {
  const createEmptyExpenseDataForValidation = (): ExpenseDataType => ({
    personnelExpenses: { totalAmount: 0 },
    utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    // 政治活動費は配列で返される
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

  it("空のデータでエラーを返さない", () => {
    const data = createEmptyExpenseDataForValidation();
    const errors = ExpenseData.validate(data);

    expect(errors).toHaveLength(0);
  });

  it("光熱水費の目的が空の場合エラーを返す", () => {
    const data = createEmptyExpenseDataForValidation();
    data.utilityExpenses.rows = [
      {
        ichirenNo: "1",
        mokuteki: "",
        kingaku: 100000,
        dt: new Date("2024-01-01"),
        nm: "取引先",
        adr: "東京都",
      },
    ];
    const errors = ExpenseData.validate(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("組織活動費の金額が0以下の場合エラーを返す", () => {
    const data = createEmptyExpenseDataForValidation();
    data.organizationExpenses = [
      {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [
          {
            ichirenNo: "1",
            mokuteki: "会議費",
            kingaku: 0,
            dt: new Date("2024-01-01"),
            nm: "取引先",
            adr: "東京都",
          },
        ],
      },
    ];
    const errors = ExpenseData.validate(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.NEGATIVE_VALUE);
  });

  it("選挙関係費の年月日が空の場合エラーを返す", () => {
    const data = createEmptyExpenseDataForValidation();
    data.electionExpenses = [
      {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [
          {
            ichirenNo: "1",
            mokuteki: "選挙ポスター",
            kingaku: 50000,
            dt: null as unknown as Date,
            nm: "印刷会社",
            adr: "東京都",
          },
        ],
      },
    ];
    const errors = ExpenseData.validate(data);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe(ValidationErrorCode.REQUIRED);
  });

  it("複数のセクションからエラーを集約する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.utilityExpenses.rows = [
      {
        ichirenNo: "1",
        mokuteki: "",
        kingaku: 100000,
        dt: new Date("2024-01-01"),
        nm: "取引先",
        adr: "東京都",
      },
    ];
    data.organizationExpenses = [
      {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [
          {
            ichirenNo: "1",
            mokuteki: "会議費",
            kingaku: 0,
            dt: new Date("2024-01-01"),
            nm: "取引先",
            adr: "東京都",
          },
        ],
      },
    ];
    const errors = ExpenseData.validate(data);

    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it("機関紙誌の発行事業費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.publicationExpenses = [
      {
        himoku: "機関紙",
        totalAmount: 50000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("宣伝事業費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.advertisingExpenses = [
      {
        himoku: "広告",
        totalAmount: 30000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("政治資金パーティー開催事業費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.fundraisingPartyExpenses = [
      {
        himoku: "パーティー",
        totalAmount: 100000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("その他の事業費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.otherBusinessExpenses = [
      {
        himoku: "その他事業",
        totalAmount: 20000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("調査研究費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.researchExpenses = [
      {
        himoku: "調査",
        totalAmount: 15000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("寄附・交付金の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.donationGrantExpenses = [
      {
        himoku: "寄附",
        totalAmount: 10000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });

  it("その他の経費の配列を検証する", () => {
    const data = createEmptyExpenseDataForValidation();
    data.otherPoliticalExpenses = [
      {
        himoku: "その他",
        totalAmount: 5000,
        underThresholdAmount: 0,
        rows: [],
      },
    ];
    const errors = ExpenseData.validate(data);
    expect(errors).toHaveLength(0);
  });
});
