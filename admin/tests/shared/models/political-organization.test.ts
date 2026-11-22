import {
  PoliticalOrganizationInput,
  PoliticalOrganizationLinks,
} from "@/shared/models/political-organization";

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

describe("PoliticalOrganizationInput", () => {
  describe("normalize", () => {
    it("前後の空白を除き、空の任意項目を未登録（null）にする", () => {
      expect(
        PoliticalOrganizationInput.normalize({
          displayName: " チームみらい ",
          slug: " team-mirai ",
          orgName: "  ",
          description: undefined,
        }),
      ).toEqual({ displayName: "チームみらい", slug: "team-mirai", orgName: null, description: null });
    });

    it("任意項目に値があれば前後の空白を除いて残す", () => {
      expect(
        PoliticalOrganizationInput.normalize({
          displayName: "チームみらい",
          slug: "team-mirai",
          orgName: " 正式名称 ",
          description: " 説明 ",
        }),
      ).toMatchObject({ orgName: "正式名称", description: "説明" });
    });

    it("公式サイト・SNS は渡されたときだけ整える（空の公式サイトは未登録）", () => {
      const basics = { displayName: "チームみらい", slug: "team-mirai" };
      expect(PoliticalOrganizationInput.normalize(basics)).not.toHaveProperty("websiteUrl");
      expect(PoliticalOrganizationInput.normalize(basics)).not.toHaveProperty("snsUrls");
      expect(
        PoliticalOrganizationInput.normalize({ ...basics, websiteUrl: " ", snsUrls: [" https://x.com/a ", ""] }),
      ).toMatchObject({ websiteUrl: null, snsUrls: ["https://x.com/a"] });
    });
  });

  describe("validateRequired", () => {
    it("表示名とスラッグがあれば通す", () => {
      expect(PoliticalOrganizationInput.validateRequired({ displayName: "a", slug: "b" })).toBeNull();
    });

    it.each(["", "  "])("表示名が空ならエラー: '%s'", (displayName) => {
      expect(PoliticalOrganizationInput.validateRequired({ displayName, slug: "b" })).toBe("表示名は必須です");
    });

    it.each(["", "  "])("スラッグが空ならエラー: '%s'", (slug) => {
      expect(PoliticalOrganizationInput.validateRequired({ displayName: "a", slug })).toBe("スラッグは必須です");
    });
  });

  describe("validate", () => {
    const valid = { displayName: "a", slug: "b", orgName: null, description: null };

    it("必須項目と公式サイト・SNS が正しければ通す", () => {
      expect(PoliticalOrganizationInput.validate(valid)).toBeNull();
      expect(
        PoliticalOrganizationInput.validate({ ...valid, websiteUrl: null, snsUrls: ["https://x.com/a"] }),
      ).toBeNull();
    });

    it("必須項目が無ければエラー", () => {
      expect(PoliticalOrganizationInput.validate({ ...valid, slug: "" })).toBe("スラッグは必須です");
    });

    it("公式サイトの URL が不正ならエラー", () => {
      expect(PoliticalOrganizationInput.validate({ ...valid, websiteUrl: "example.jp" })).toBe(
        "公式サイトの URL を正しく入力してください",
      );
    });
  });
});
