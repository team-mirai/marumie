import { isResearchFundEntryHidden } from "@/server/contexts/research-fund/presentation/loaders/research-fund-entry-visibility";

describe("isResearchFundEntryHidden", () => {
  const originalValue = process.env.HIDE_RESEARCH_FUND_ENTRY;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.HIDE_RESEARCH_FUND_ENTRY;
    } else {
      process.env.HIDE_RESEARCH_FUND_ENTRY = originalValue;
    }
  });

  it("未設定なら隠さない", () => {
    delete process.env.HIDE_RESEARCH_FUND_ENTRY;
    expect(isResearchFundEntryHidden()).toBe(false);
  });

  it("true のときだけ隠す", () => {
    process.env.HIDE_RESEARCH_FUND_ENTRY = "true";
    expect(isResearchFundEntryHidden()).toBe(true);
  });

  it.each(["false", "", "1", "TRUE"])("%j では隠さない", (value) => {
    process.env.HIDE_RESEARCH_FUND_ENTRY = value;
    expect(isResearchFundEntryHidden()).toBe(false);
  });
});
