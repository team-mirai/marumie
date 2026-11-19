import { parseResearchFundDetails } from "@/server/contexts/research-fund/domain/services/research-fund-details";

describe("parseResearchFundDetails", () => {
  it("dataNote を読む", () => {
    expect(parseResearchFundDetails({ dataNote: "仕訳が完了した支出を掲載しています" })).toEqual({
      dataNote: "仕訳が完了した支出を掲載しています",
    });
  });

  it("未設定・空文字・型違いは null にしてページを落とさない", () => {
    expect(parseResearchFundDetails(null).dataNote).toBeNull();
    expect(parseResearchFundDetails(undefined).dataNote).toBeNull();
    expect(parseResearchFundDetails("text").dataNote).toBeNull();
    expect(parseResearchFundDetails([{ dataNote: "x" }]).dataNote).toBeNull();
    expect(parseResearchFundDetails({ dataNote: "  " }).dataNote).toBeNull();
    expect(parseResearchFundDetails({ dataNote: 1 }).dataNote).toBeNull();
  });
});
