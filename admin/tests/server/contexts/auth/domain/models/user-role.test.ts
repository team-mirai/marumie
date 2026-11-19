import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

describe("UserRoleModel", () => {
  describe("canWriteResearchFund", () => {
    it("research_fund のユーザーは担当の議員にだけ書き込める", () => {
      expect(UserRoleModel.canWriteResearchFund(["research_fund"], ["1", "3"], "1")).toBe(true);
      expect(UserRoleModel.canWriteResearchFund(["research_fund"], ["1", "3"], "3")).toBe(true);
      expect(UserRoleModel.canWriteResearchFund(["research_fund"], ["1", "3"], "2")).toBe(false);
    });

    it("担当のない research_fund のユーザーはどの議員にも書き込めない（閲覧のみ）", () => {
      expect(UserRoleModel.canWriteResearchFund(["research_fund"], [], "1")).toBe(false);
    });

    it("admin は担当の有無に関係なく全議員に書き込める", () => {
      expect(UserRoleModel.canWriteResearchFund(["admin"], [], "1")).toBe(true);
      expect(UserRoleModel.canWriteResearchFund(["admin"], ["2"], "1")).toBe(true);
    });

    it("research_fund ロールが無ければ、担当が残っていても書き込めない", () => {
      expect(UserRoleModel.canWriteResearchFund(["political_fund"], ["1"], "1")).toBe(false);
      expect(UserRoleModel.canWriteResearchFund([], ["1"], "1")).toBe(false);
    });
  });

  describe("canUse", () => {
    it("admin は他のロールの有無に関係なく全機能を使える", () => {
      expect(UserRoleModel.canUse(["admin"], ["political_fund"])).toBe(true);
      expect(UserRoleModel.canUse(["admin"], ["research_fund"])).toBe(true);
      expect(UserRoleModel.canUse(["admin"], ["admin"])).toBe(true);
    });

    it("political_fund だけのユーザーは政治資金の機能だけを使える", () => {
      expect(UserRoleModel.canUse(["political_fund"], ["political_fund"])).toBe(true);
      expect(UserRoleModel.canUse(["political_fund"], ["research_fund"])).toBe(false);
      expect(UserRoleModel.canUse(["political_fund"], ["admin"])).toBe(false);
    });

    it("research_fund だけのユーザーは調査研究費の機能だけを使える", () => {
      expect(UserRoleModel.canUse(["research_fund"], ["research_fund"])).toBe(true);
      expect(UserRoleModel.canUse(["research_fund"], ["political_fund"])).toBe(false);
      expect(UserRoleModel.canUse(["research_fund"], ["admin"])).toBe(false);
    });

    it("複数のロールを持つユーザーはどちらの機能も使える", () => {
      const roles = ["political_fund", "research_fund"] as const;
      expect(UserRoleModel.canUse(roles, ["political_fund"])).toBe(true);
      expect(UserRoleModel.canUse(roles, ["research_fund"])).toBe(true);
      expect(UserRoleModel.canUse(roles, ["admin"])).toBe(false);
    });

    it("許可ロールを複数指定したときはどれか 1 つを持っていれば使える", () => {
      expect(UserRoleModel.canUse(["research_fund"], ["political_fund", "research_fund"])).toBe(
        true,
      );
    });

    it("ロールを 1 つも持たないユーザーはどの機能も使えない", () => {
      expect(UserRoleModel.canUse([], ["political_fund"])).toBe(false);
      expect(UserRoleModel.canUse([], ["research_fund"])).toBe(false);
      expect(UserRoleModel.canUse([], ["admin"])).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("admin を含む場合は true を返す", () => {
      expect(UserRoleModel.isAdmin(["political_fund", "admin"])).toBe(true);
    });

    it("admin を含まない場合は false を返す", () => {
      expect(UserRoleModel.isAdmin(["political_fund", "research_fund"])).toBe(false);
      expect(UserRoleModel.isAdmin([])).toBe(false);
    });
  });

  describe("hasNoRole", () => {
    it("ロールが空のときだけ true を返す", () => {
      expect(UserRoleModel.hasNoRole([])).toBe(true);
      expect(UserRoleModel.hasNoRole(["research_fund"])).toBe(false);
    });
  });

  describe("normalize", () => {
    it("重複を除き、admin / political_fund / research_fund の順に並べる", () => {
      expect(UserRoleModel.normalize(["research_fund", "admin", "research_fund"])).toEqual([
        "admin",
        "research_fund",
      ]);
    });

    it("空の集合はそのまま空で返す", () => {
      expect(UserRoleModel.normalize([])).toEqual([]);
    });

    it("廃止した user など未知のロールが含まれる場合は例外を投げる", () => {
      expect(() => UserRoleModel.normalize(["user"])).toThrow("不明なロールです: user");
    });
  });
});
