import { PublishedFiscalYears } from "@/server/contexts/public-finance/domain/models/published-fiscal-years";

describe("PublishedFiscalYears", () => {
  it("公開している年度は 2025年と 2026年（古い順）", () => {
    expect(PublishedFiscalYears.all).toEqual([2025, 2026]);
  });

  it("最初に見せる年度は公開している一番新しい年度", () => {
    expect(PublishedFiscalYears.defaultYear).toBe(2026);
    expect(PublishedFiscalYears.defaultYear).toBe(Math.max(...PublishedFiscalYears.all));
  });

  describe("includes", () => {
    it("公開している年度なら true", () => {
      expect(PublishedFiscalYears.includes(2025)).toBe(true);
      expect(PublishedFiscalYears.includes(2026)).toBe(true);
    });

    it("公開していない年度・数でない値なら false", () => {
      expect(PublishedFiscalYears.includes(2024)).toBe(false);
      expect(PublishedFiscalYears.includes(2027)).toBe(false);
      expect(PublishedFiscalYears.includes(Number.NaN)).toBe(false);
    });
  });
});
