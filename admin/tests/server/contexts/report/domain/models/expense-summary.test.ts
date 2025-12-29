import {
  ExpenseSummaryData,
  type ExpenseSummaryItem,
} from "@/server/contexts/report/domain/models/expense-summary";
import type { ExpenseData } from "@/server/contexts/report/domain/models/report-data";
import type {
  AdvertisingExpenseSection,
  DonationGrantExpenseSection,
  ElectionExpenseSection,
  FundraisingPartyExpenseSection,
  OfficeExpenseSection,
  OrganizationExpenseSection,
  OtherBusinessExpenseSection,
  OtherPoliticalExpenseSection,
  PersonnelExpenseSection,
  PublicationExpenseSection,
  ResearchExpenseSection,
  SuppliesExpenseSection,
  UtilityExpenseSection,
} from "@/server/contexts/report/domain/models/expense-transaction";

function createEmptyPersonnelExpenseSection(): PersonnelExpenseSection {
  return { totalAmount: 0 };
}

function createEmptyUtilityExpenseSection(): UtilityExpenseSection {
  return { totalAmount: 0, underThresholdAmount: 0, rows: [] };
}

function createEmptySuppliesExpenseSection(): SuppliesExpenseSection {
  return { totalAmount: 0, underThresholdAmount: 0, rows: [] };
}

function createEmptyOfficeExpenseSection(): OfficeExpenseSection {
  return { totalAmount: 0, underThresholdAmount: 0, rows: [] };
}

function createPoliticalActivitySection(totalAmount: number): {
  himoku: string;
  totalAmount: number;
  underThresholdAmount: number;
  rows: [];
} {
  return {
    himoku: "",
    totalAmount,
    underThresholdAmount: 0,
    rows: [],
  };
}

function createEmptyExpenseData(): ExpenseData {
  return {
    personnelExpenses: createEmptyPersonnelExpenseSection(),
    utilityExpenses: createEmptyUtilityExpenseSection(),
    suppliesExpenses: createEmptySuppliesExpenseSection(),
    officeExpenses: createEmptyOfficeExpenseSection(),
    organizationExpenses: [],
    electionExpenses: [],
    publicationExpenses: [],
    advertisingExpenses: [],
    fundraisingPartyExpenses: [],
    otherBusinessExpenses: [],
    researchExpenses: [],
    donationGrantExpenses: [],
    otherPoliticalExpenses: [],
  };
}

describe("ExpenseSummaryData.fromExpenseData", () => {
  describe("経常経費の集計", () => {
    it("人件費が正しく集計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.personnelExpenses = { totalAmount: 100000 };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.personnelExpense.amount).toBe(100000);
      expect(result.regularExpenses.subtotal.amount).toBe(100000);
      expect(result.totalAmount).toBe(100000);
    });

    it("光熱水費が正しく集計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.utilityExpenses = { totalAmount: 50000, underThresholdAmount: 0, rows: [] };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.utilityExpense.amount).toBe(50000);
      expect(result.regularExpenses.subtotal.amount).toBe(50000);
    });

    it("備品・消耗品費が正しく集計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.suppliesExpenses = { totalAmount: 30000, underThresholdAmount: 0, rows: [] };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.suppliesExpense.amount).toBe(30000);
      expect(result.regularExpenses.subtotal.amount).toBe(30000);
    });

    it("事務所費が正しく集計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.officeExpenses = { totalAmount: 80000, underThresholdAmount: 0, rows: [] };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.officeExpense.amount).toBe(80000);
      expect(result.regularExpenses.subtotal.amount).toBe(80000);
    });

    it("経常経費が0の場合はnullになる", () => {
      const expenseData = createEmptyExpenseData();

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.personnelExpense.amount).toBeNull();
      expect(result.regularExpenses.utilityExpense.amount).toBeNull();
      expect(result.regularExpenses.suppliesExpense.amount).toBeNull();
      expect(result.regularExpenses.officeExpense.amount).toBeNull();
      expect(result.regularExpenses.subtotal.amount).toBe(0);
    });

    it("経常経費の小計が正しく計算される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.personnelExpenses = { totalAmount: 100000 };
      expenseData.utilityExpenses = { totalAmount: 50000, underThresholdAmount: 0, rows: [] };
      expenseData.suppliesExpenses = { totalAmount: 30000, underThresholdAmount: 0, rows: [] };
      expenseData.officeExpenses = { totalAmount: 80000, underThresholdAmount: 0, rows: [] };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.subtotal.amount).toBe(260000);
    });
  });

  describe("政治活動費の集計（配列対応）", () => {
    it("組織活動費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.organizationExpenses = [
        createPoliticalActivitySection(100000) as OrganizationExpenseSection,
        createPoliticalActivitySection(50000) as OrganizationExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.organizationExpense.amount).toBe(150000);
    });

    it("選挙関係費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.electionExpenses = [
        createPoliticalActivitySection(200000) as ElectionExpenseSection,
        createPoliticalActivitySection(100000) as ElectionExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.electionExpense.amount).toBe(300000);
    });

    it("機関紙誌の発行事業費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.publicationExpenses = [
        createPoliticalActivitySection(50000) as PublicationExpenseSection,
        createPoliticalActivitySection(30000) as PublicationExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.publicationExpense.amount).toBe(80000);
    });

    it("宣伝事業費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.advertisingExpenses = [
        createPoliticalActivitySection(70000) as AdvertisingExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.advertisingExpense.amount).toBe(70000);
    });

    it("政治資金パーティー開催事業費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.fundraisingPartyExpenses = [
        createPoliticalActivitySection(500000) as FundraisingPartyExpenseSection,
        createPoliticalActivitySection(300000) as FundraisingPartyExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.partyExpense.amount).toBe(800000);
    });

    it("その他の事業費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.otherBusinessExpenses = [
        createPoliticalActivitySection(40000) as OtherBusinessExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.otherBusinessExpense.amount).toBe(40000);
    });

    it("調査研究費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.researchExpenses = [
        createPoliticalActivitySection(60000) as ResearchExpenseSection,
        createPoliticalActivitySection(40000) as ResearchExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.researchExpense.amount).toBe(100000);
    });

    it("寄附・交付金の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.donationGrantExpenses = [
        createPoliticalActivitySection(150000) as DonationGrantExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.donationGrantExpense.amount).toBe(150000);
    });

    it("その他の経費の配列が正しく合計される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.otherPoliticalExpenses = [
        createPoliticalActivitySection(25000) as OtherPoliticalExpenseSection,
        createPoliticalActivitySection(15000) as OtherPoliticalExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.otherPoliticalExpense.amount).toBe(40000);
    });

    it("空の配列の場合は0になる", () => {
      const expenseData = createEmptyExpenseData();

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.organizationExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.electionExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.publicationExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.advertisingExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.partyExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.otherBusinessExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.researchExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.donationGrantExpense.amount).toBe(0);
      expect(result.politicalActivityExpenses.otherPoliticalExpense.amount).toBe(0);
    });
  });

  describe("機関紙誌の発行その他の事業費の合算", () => {
    it("4項目（publication + advertising + party + otherBusiness）が合算される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.publicationExpenses = [
        createPoliticalActivitySection(100000) as PublicationExpenseSection,
      ];
      expenseData.advertisingExpenses = [
        createPoliticalActivitySection(200000) as AdvertisingExpenseSection,
      ];
      expenseData.fundraisingPartyExpenses = [
        createPoliticalActivitySection(300000) as FundraisingPartyExpenseSection,
      ];
      expenseData.otherBusinessExpenses = [
        createPoliticalActivitySection(400000) as OtherBusinessExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.politicalActivityExpenses.businessExpense.amount).toBe(1000000);
      expect(result.politicalActivityExpenses.publicationExpense.amount).toBe(100000);
      expect(result.politicalActivityExpenses.advertisingExpense.amount).toBe(200000);
      expect(result.politicalActivityExpenses.partyExpense.amount).toBe(300000);
      expect(result.politicalActivityExpenses.otherBusinessExpense.amount).toBe(400000);
    });
  });

  describe("政治活動費小計の計算", () => {
    it("政治活動費小計が正しく計算される", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.organizationExpenses = [
        createPoliticalActivitySection(100000) as OrganizationExpenseSection,
      ];
      expenseData.electionExpenses = [
        createPoliticalActivitySection(200000) as ElectionExpenseSection,
      ];
      expenseData.publicationExpenses = [
        createPoliticalActivitySection(50000) as PublicationExpenseSection,
      ];
      expenseData.advertisingExpenses = [
        createPoliticalActivitySection(50000) as AdvertisingExpenseSection,
      ];
      expenseData.fundraisingPartyExpenses = [
        createPoliticalActivitySection(50000) as FundraisingPartyExpenseSection,
      ];
      expenseData.otherBusinessExpenses = [
        createPoliticalActivitySection(50000) as OtherBusinessExpenseSection,
      ];
      expenseData.researchExpenses = [
        createPoliticalActivitySection(100000) as ResearchExpenseSection,
      ];
      expenseData.donationGrantExpenses = [
        createPoliticalActivitySection(150000) as DonationGrantExpenseSection,
      ];
      expenseData.otherPoliticalExpenses = [
        createPoliticalActivitySection(50000) as OtherPoliticalExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      // 組織活動費(100000) + 選挙関係費(200000) + 事業費(200000) + 調査研究費(100000) + 寄附・交付金(150000) + その他の経費(50000)
      expect(result.politicalActivityExpenses.subtotal.amount).toBe(800000);
    });
  });

  describe("支出総額の計算", () => {
    it("経常経費と政治活動費の合計が支出総額になる", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.personnelExpenses = { totalAmount: 100000 };
      expenseData.utilityExpenses = { totalAmount: 50000, underThresholdAmount: 0, rows: [] };
      expenseData.organizationExpenses = [
        createPoliticalActivitySection(200000) as OrganizationExpenseSection,
      ];

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.totalAmount).toBe(350000);
    });

    it("すべてが0の場合は支出総額も0になる", () => {
      const expenseData = createEmptyExpenseData();

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.totalAmount).toBe(0);
    });
  });

  describe("ExpenseSummaryItem構造", () => {
    it("grantAmountとbikouはnullになる", () => {
      const expenseData = createEmptyExpenseData();
      expenseData.personnelExpenses = { totalAmount: 100000 };

      const result = ExpenseSummaryData.fromExpenseData(expenseData);

      expect(result.regularExpenses.personnelExpense.grantAmount).toBeNull();
      expect(result.regularExpenses.personnelExpense.bikou).toBeNull();
    });
  });
});

describe("ExpenseSummaryData.shouldOutputSheet", () => {
  it("支出総額が0より大きい場合はtrueを返す", () => {
    const data = {
      regularExpenses: {
        personnelExpense: { amount: 100000, grantAmount: null, bikou: null },
        utilityExpense: { amount: null, grantAmount: null, bikou: null },
        suppliesExpense: { amount: null, grantAmount: null, bikou: null },
        officeExpense: { amount: null, grantAmount: null, bikou: null },
        subtotal: { amount: 100000, grantAmount: null, bikou: null },
      },
      politicalActivityExpenses: {
        organizationExpense: { amount: 0, grantAmount: null, bikou: null },
        electionExpense: { amount: 0, grantAmount: null, bikou: null },
        businessExpense: { amount: 0, grantAmount: null, bikou: null },
        publicationExpense: { amount: 0, grantAmount: null, bikou: null },
        advertisingExpense: { amount: 0, grantAmount: null, bikou: null },
        partyExpense: { amount: 0, grantAmount: null, bikou: null },
        otherBusinessExpense: { amount: 0, grantAmount: null, bikou: null },
        researchExpense: { amount: 0, grantAmount: null, bikou: null },
        donationGrantExpense: { amount: 0, grantAmount: null, bikou: null },
        otherPoliticalExpense: { amount: 0, grantAmount: null, bikou: null },
        subtotal: { amount: 0, grantAmount: null, bikou: null },
      },
      totalAmount: 100000,
    };

    expect(ExpenseSummaryData.shouldOutputSheet(data)).toBe(true);
  });

  it("支出総額が0の場合はfalseを返す", () => {
    const data = {
      regularExpenses: {
        personnelExpense: { amount: null, grantAmount: null, bikou: null },
        utilityExpense: { amount: null, grantAmount: null, bikou: null },
        suppliesExpense: { amount: null, grantAmount: null, bikou: null },
        officeExpense: { amount: null, grantAmount: null, bikou: null },
        subtotal: { amount: 0, grantAmount: null, bikou: null },
      },
      politicalActivityExpenses: {
        organizationExpense: { amount: 0, grantAmount: null, bikou: null },
        electionExpense: { amount: 0, grantAmount: null, bikou: null },
        businessExpense: { amount: 0, grantAmount: null, bikou: null },
        publicationExpense: { amount: 0, grantAmount: null, bikou: null },
        advertisingExpense: { amount: 0, grantAmount: null, bikou: null },
        partyExpense: { amount: 0, grantAmount: null, bikou: null },
        otherBusinessExpense: { amount: 0, grantAmount: null, bikou: null },
        researchExpense: { amount: 0, grantAmount: null, bikou: null },
        donationGrantExpense: { amount: 0, grantAmount: null, bikou: null },
        otherPoliticalExpense: { amount: 0, grantAmount: null, bikou: null },
        subtotal: { amount: 0, grantAmount: null, bikou: null },
      },
      totalAmount: 0,
    };

    expect(ExpenseSummaryData.shouldOutputSheet(data)).toBe(false);
  });
});
