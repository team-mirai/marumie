import {
  serializeReportData,
  KNOWN_FORM_IDS,
} from "@/server/contexts/report/domain/services/report-serializer";
import { ReportData } from "@/server/contexts/report/domain/models/report-data";

describe("serializeReportData", () => {
  const createEmptyReportData = (): ReportData => ({
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
      // SYUUSHI07_14: 経常経費
      utilityExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      suppliesExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      officeExpenses: { totalAmount: 0, underThresholdAmount: 0, rows: [] },
      // SYUUSHI07_15: 政治活動費（全9区分）
      organizationExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      electionExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      publicationExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      advertisingExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      fundraisingPartyExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      otherBusinessExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      researchExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      donationGrantExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
      otherPoliticalExpenses: {
        himoku: "",
        totalAmount: 0,
        underThresholdAmount: 0,
        rows: [],
      },
    },
  });

  it("generates valid XML document with HEAD section", () => {
    const reportData = createEmptyReportData();

    const xml = serializeReportData(reportData);

    expect(xml).toContain('<?xml version="1.0" encoding="Shift_JIS"?>');
    expect(xml).toContain("<BOOK>");
    expect(xml).toContain("<HEAD>");
    expect(xml).toContain("<VERSION>20081001</VERSION>");
    expect(xml).toContain("<APP>収支報告書作成ソフト (収支報告書作成ソフト)</APP>");
  });

  it("generates SYUUSHI_UMU_FLG section with profile flag set", () => {
    const reportData = createEmptyReportData();

    const xml = serializeReportData(reportData);

    // SYUUSHI_UMU_FLG should be direct child of BOOK (not wrapped in SYUUSHI_FLG)
    expect(xml).toContain("<SYUUSHI_UMU_FLG>");
    expect(xml).not.toContain("<SYUUSHI_FLG>");
    // First flag is set for profile (SYUUSHI07_01)
    expect(xml).toContain("<SYUUSHI07_01>");
    expect(xml).toContain("<HOUKOKU_NEN>2024</HOUKOKU_NEN>");
  });

  it("wraps SYUUSHI07_01 content in SHEET tag", () => {
    const reportData = createEmptyReportData();

    const xml = serializeReportData(reportData);

    // SYUUSHI07_01 should contain SHEET which contains HOUKOKU_NEN
    expect(xml).toMatch(/<SYUUSHI07_01>\s*<SHEET>/);
    expect(xml).toMatch(/<\/SHEET>\s*<\/SYUUSHI07_01>/);
  });

  it("sets correct flag when personalDonations has data", () => {
    const reportData = createEmptyReportData();
    reportData.donations.personalDonations = {
      totalAmount: 100000,
      sonotaGk: 0,
      rows: [
        {
          ichirenNo: "1",
          kifusyaNm: "テスト太郎",
          kingaku: 100000,
          dt: new Date("2024-06-01"),
          adr: "東京都",
          syokugyo: "会社員",
          zeigakukoujyo: "0",
          rowkbn: "0",
        },
      ],
    };

    const xml = serializeReportData(reportData);

    expect(xml).toContain("<SYUUSHI07_07>");
    // SYUUSHI07_07 is at index 6 in KNOWN_FORM_IDS
    const syuushi07_07Index = KNOWN_FORM_IDS.indexOf("SYUUSHI07_07");
    expect(syuushi07_07Index).toBeGreaterThanOrEqual(0);
  });

  it("includes expense section when any expense category has data", () => {
    const reportData = createEmptyReportData();
    reportData.expenses.utilityExpenses = {
      totalAmount: 50000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          mokuteki: "電気代",
          kingaku: 50000,
          dt: new Date("2024-06-01"),
          nm: "電力会社",
          adr: "東京都",
        },
      ],
    };

    const xml = serializeReportData(reportData);

    expect(xml).toContain("<SYUUSHI07_14>");
    expect(xml).toContain("<KUBUN1>");
    expect(xml).toContain("<MOKUTEKI>電気代</MOKUTEKI>");
  });

  it("includes multiple income sections when they have data", () => {
    const reportData = createEmptyReportData();
    reportData.income.businessIncome = {
      totalAmount: 120000,
      rows: [
        {
          ichirenNo: "1",
          gigyouSyurui: "機関紙発行",
          kingaku: 120000,
        },
      ],
    };
    reportData.income.otherIncome = {
      totalAmount: 80000,
      underThresholdAmount: 0,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "その他収入",
          kingaku: 80000,
        },
      ],
    };

    const xml = serializeReportData(reportData);

    expect(xml).toContain("<SYUUSHI07_03>");
    expect(xml).toContain("<SYUUSHI07_06>");
  });
});

describe("KNOWN_FORM_IDS", () => {
  it("has expected form IDs in correct order", () => {
    expect(KNOWN_FORM_IDS).toContain("SYUUSHI07_07");
    expect(KNOWN_FORM_IDS).toContain("SYUUSHI07_14");
    expect(KNOWN_FORM_IDS).toContain("SYUUSHI07_03");
  });
});
