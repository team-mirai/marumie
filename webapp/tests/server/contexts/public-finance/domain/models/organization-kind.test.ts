import { OrganizationKind } from "@/server/contexts/public-finance/domain/models/organization-kind";

describe("OrganizationKind.fromTypeCodes", () => {
  it("政党本部（01）・政党の支部（02）なら政党とする", () => {
    expect(OrganizationKind.fromTypeCodes(["01"])).toBe("party");
    expect(OrganizationKind.fromTypeCodes(["02"])).toBe("party");
  });

  it("どれかの年が政党なら政党とする", () => {
    expect(OrganizationKind.fromTypeCodes(["04", "01"])).toBe("party");
  });

  it("政党以外の区分や未入力なら政治団体とする", () => {
    expect(OrganizationKind.fromTypeCodes(["03", "04"])).toBe("group");
    expect(OrganizationKind.fromTypeCodes([])).toBe("group");
  });

  it("前後の空白は無視する", () => {
    expect(OrganizationKind.fromTypeCodes([" 01 "])).toBe("party");
  });
});
