import { buildPoliticianTitle } from "@/server/contexts/research-fund/domain/services/politician-title";

describe("buildPoliticianTitle", () => {
  it("院と選挙区を「・」でつなぐ", () => {
    expect(buildPoliticianTitle({ house: "shugiin", constituency: "比例東京（東京7区）" })).toBe(
      "衆議院議員・比例東京（東京7区）",
    );
  });

  it("院だけ・選挙区だけでも、登録されているものだけを出す", () => {
    expect(buildPoliticianTitle({ house: "sangiin", constituency: null })).toBe("参議院議員");
    expect(buildPoliticianTitle({ house: null, constituency: "比例区" })).toBe("比例区");
  });

  it("どちらも未登録（空白だけを含む）なら null", () => {
    expect(buildPoliticianTitle({ house: null, constituency: null })).toBeNull();
    expect(buildPoliticianTitle({ house: null, constituency: "  " })).toBeNull();
  });
});
