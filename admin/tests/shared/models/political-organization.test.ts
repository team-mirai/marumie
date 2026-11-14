import { PoliticalOrganizationLinks } from "@/shared/models/political-organization";

describe("PoliticalOrganizationLinks", () => {
  it("前後の空白を除き、空の SNS 欄を詰める（順序は保つ）", () => {
    expect(
      PoliticalOrganizationLinks.normalize({
        websiteUrl: "  https://example.jp ",
        snsUrls: ["https://b.example", " ", " https://a.example "],
      }),
    ).toEqual({ websiteUrl: "https://example.jp", snsUrls: ["https://b.example", "https://a.example"] });
  });

  it("未入力は通す", () => {
    expect(PoliticalOrganizationLinks.validate({ websiteUrl: "", snsUrls: [] })).toBeNull();
  });

  it.each(["example.jp", "ftp://example.jp", "javascript:alert(1)"])(
    "http(s) でない公式サイトはエラー: %s",
    (websiteUrl) => {
      expect(PoliticalOrganizationLinks.validate({ websiteUrl, snsUrls: [] })).toBe(
        "公式サイトの URL を正しく入力してください",
      );
    },
  );

  it("不正な SNS の URL は何件目かを示す", () => {
    expect(
      PoliticalOrganizationLinks.validate({
        websiteUrl: "",
        snsUrls: ["https://x.com/a", "x.com/b"],
      }),
    ).toBe("SNS の URL（2件目）を正しく入力してください");
  });

  it("SNS は 20 件まで", () => {
    const snsUrls = Array.from({ length: 21 }, (_, i) => `https://example.jp/${i}`);
    expect(PoliticalOrganizationLinks.validate({ websiteUrl: "", snsUrls })).toBe(
      "SNS の URL は20件までです",
    );
  });
});
