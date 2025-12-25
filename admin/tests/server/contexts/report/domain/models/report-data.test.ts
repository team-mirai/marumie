import {
  ExpenseData,
  ReportData,
  type ExpenseData as ExpenseDataType,
  type ReportData as ReportDataType,
} from "@/server/contexts/report/domain/models/report-data";

describe("ExpenseData", () => {
  const createEmptyExpenseData = (): ExpenseDataType => ({
    utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
    organizationExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    electionExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    publicationExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    advertisingExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    fundraisingPartyExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    otherBusinessExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    researchExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    donationGrantExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
    otherPoliticalExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
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
      data.organizationExpenses.totalAmount = 100000;
      data.electionExpenses.totalAmount = 50000;
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
      data.organizationExpenses.totalAmount = 100000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("選挙関係費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.electionExpenses.totalAmount = 50000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("機関紙誌の発行事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.publicationExpenses.totalAmount = 30000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("宣伝事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.advertisingExpenses.totalAmount = 20000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("政治資金パーティー開催事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.fundraisingPartyExpenses.totalAmount = 10000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("その他の事業費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.otherBusinessExpenses.totalAmount = 5000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("調査研究費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.researchExpenses.totalAmount = 3000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("寄附・交付金にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.donationGrantExpenses.totalAmount = 2000;
      expect(ExpenseData.shouldOutputPoliticalActivitySheet(data)).toBe(true);
    });

    it("その他の経費にデータがある場合はtrueを返す", () => {
      const data = createEmptyExpenseData();
      data.otherPoliticalExpenses.totalAmount = 1000;
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
      data.organizationExpenses.rows = [createExpenseRow()];
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
      details: {},
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
      utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      organizationExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      electionExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      publicationExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      advertisingExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      fundraisingPartyExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      otherBusinessExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      researchExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      donationGrantExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
      otherPoliticalExpenses: { himoku: "", totalAmount: 0, underThresholdAmount: 0, rows: [] },
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

    it("データがない場合、01桁目以外は全て0を返す", () => {
      const data = createEmptyReportData();
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString.slice(1)).toBe("0".repeat(50));
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
      data.expenses.organizationExpenses.totalAmount = 100000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[24]).toBe("1");
    });

    it("26桁目: 選挙関係費がある場合は1を返す", () => {
      const data = createEmptyReportData();
      data.expenses.electionExpenses.totalAmount = 50000;
      const flagString = ReportData.buildSyuushiUmuFlg(data);
      expect(flagString[25]).toBe("1");
    });

    it("複数のセクションにデータがある場合、対応する桁が全て1になる", () => {
      const data = createEmptyReportData();
      data.income.businessIncome.totalAmount = 100000; // 03桁目
      data.donations.personalDonations.totalAmount = 50000; // 07桁目
      data.expenses.utilityExpenses.totalAmount = 30000; // 22桁目
      data.expenses.organizationExpenses.totalAmount = 20000; // 25桁目

      const flagString = ReportData.buildSyuushiUmuFlg(data);

      expect(flagString[0]).toBe("1"); // 01桁目: その1（常に1）
      expect(flagString[2]).toBe("1"); // 03桁目: 事業収入
      expect(flagString[6]).toBe("1"); // 07桁目: 個人寄附
      expect(flagString[21]).toBe("1"); // 22桁目: 光熱水費
      expect(flagString[24]).toBe("1"); // 25桁目: 組織活動費
    });
  });
});
