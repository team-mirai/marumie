import { ExpenseData, type ExpenseData as ExpenseDataType } from "@/server/contexts/report/domain/models/report-data";

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
