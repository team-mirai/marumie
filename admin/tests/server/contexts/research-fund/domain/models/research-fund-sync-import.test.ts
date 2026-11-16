import { matchesResearchFundSyncConfirmation } from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";

describe("matchesResearchFundSyncConfirmation", () => {
  it("ファイルの議員 slug を全て入力すれば、順序・区切りによらず一致する", () => {
    expect(matchesResearchFundSyncConfirmation("taro, hanako", ["taro", "hanako"])).toBe(true);
    expect(matchesResearchFundSyncConfirmation(" hanako　taro ", ["taro", "hanako"])).toBe(true);
    expect(matchesResearchFundSyncConfirmation("hanako、taro", ["taro", "hanako"])).toBe(true);
  });

  it("足りない・余計な slug があれば一致しない", () => {
    expect(matchesResearchFundSyncConfirmation("taro", ["taro", "hanako"])).toBe(false);
    expect(matchesResearchFundSyncConfirmation("taro, hanako, jiro", ["taro", "hanako"])).toBe(
      false,
    );
    expect(matchesResearchFundSyncConfirmation("", ["taro"])).toBe(false);
  });

  it("議員室が無ければ一致しない", () => {
    expect(matchesResearchFundSyncConfirmation("", [])).toBe(false);
  });
});
