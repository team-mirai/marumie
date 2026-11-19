import { toggleUserRole } from "@/client/lib/toggle-user-role";

describe("toggleUserRole", () => {
  it("チェックしたロールを表示順の位置に加える", () => {
    expect(toggleUserRole(["research_fund"], "admin", true)).toEqual(["admin", "research_fund"]);
  });

  it("チェックを外したロールを取り除く", () => {
    expect(toggleUserRole(["admin", "political_fund"], "admin", false)).toEqual([
      "political_fund",
    ]);
  });

  it("既に持っているロールをチェックしても重複させない", () => {
    expect(toggleUserRole(["political_fund"], "political_fund", true)).toEqual([
      "political_fund",
    ]);
  });
});
