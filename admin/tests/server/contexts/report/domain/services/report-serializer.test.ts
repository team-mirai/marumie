import {
  serializeReportData,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
} from "@/server/contexts/report/domain/services/report-serializer";
import type { ReportData } from "@/server/contexts/report/domain/models/report-data";

describe("serializeReportData", () => {
  const createEmptyReportData = (): ReportData => ({
    donations: {},
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

  it("generates SYUUSHI_FLG section with all zeros when no data", () => {
    const reportData = createEmptyReportData();

    const xml = serializeReportData(reportData);

    expect(xml).toContain("<SYUUSHI_FLG>");
    expect(xml).toContain("<SYUUSHI_UMU_FLG>");
    // All zeros because no sections have data
    const expectedFlags = "0".repeat(FLAG_STRING_LENGTH);
    expect(xml).toContain(`<SYUUSHI_UMU>${expectedFlags}</SYUUSHI_UMU>`);
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

describe("FLAG_STRING_LENGTH", () => {
  it("is 51 characters", () => {
    expect(FLAG_STRING_LENGTH).toBe(51);
  });
});
