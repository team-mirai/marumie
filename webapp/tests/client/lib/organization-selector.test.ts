import { formatResearchFundSelectorLabel } from "@/client/lib/organization-selector";

describe("formatResearchFundSelectorLabel", () => {
  it("調研費ページの表示名は「{氏名}（調研費）」", () => {
    expect(formatResearchFundSelectorLabel("峰島侑也")).toBe("峰島侑也（調研費）");
  });
});
