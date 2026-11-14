import { Politician, type PoliticianInput } from "@/shared/models/politician";

const input: PoliticianInput = {
  name: "議員名",
  slug: "test-member",
  termStart: "2026-02-08",
  politicalOrganizationId: "",
  nameKana: "",
  house: "",
  constituency: "",
  profileUrl: "",
  websiteUrl: "",
  snsUrls: [],
};

describe("Politician.normalize", () => {
  it("前後の空白を除き、空の SNS 欄を詰める", () => {
    expect(
      Politician.normalize({
        ...input,
        nameKana: " みねしま ゆうや ",
        constituency: " 比例東京（東京7区） ",
        profileUrl: " https://team-mir.ai/member/shugiin/yuya-mineshima ",
        websiteUrl: " ",
        snsUrls: [" https://x.com/a ", "", "  ", "https://note.com/b"],
      }),
    ).toEqual({
      ...input,
      nameKana: "みねしま ゆうや",
      constituency: "比例東京（東京7区）",
      profileUrl: "https://team-mir.ai/member/shugiin/yuya-mineshima",
      websiteUrl: "",
      snsUrls: ["https://x.com/a", "https://note.com/b"],
    });
  });
});

describe("Politician.validate", () => {
  it("プロフィールが未入力でも保存できる", () => {
    expect(Politician.validate(input)).toEqual({ status: "valid" });
  });

  it("プロフィールをすべて入力して保存できる", () => {
    expect(
      Politician.validate({
        ...input,
        nameKana: "みねしま ゆうや",
        house: "shugiin",
        constituency: "比例東京（東京7区）",
        profileUrl: "https://team-mir.ai/member/shugiin/yuya-mineshima",
        websiteUrl: "https://example.com",
        snsUrls: ["https://x.com/a", "https://www.instagram.com/b"],
      }),
    ).toEqual({ status: "valid" });
  });

  it.each([
    [{ profileUrl: "team-mir.ai/member" }, "profileUrl"],
    [{ websiteUrl: "javascript:alert(1)" }, "websiteUrl"],
    [{ websiteUrl: "ftp://example.com" }, "websiteUrl"],
    [{ snsUrls: ["https://x.com/a", "not a url"] }, "snsUrls"],
    [{ snsUrls: [`https://example.com/${"a".repeat(2048)}`] }, "snsUrls"],
    [{ snsUrls: Array.from({ length: 21 }, (_, i) => `https://example.com/${i}`) }, "snsUrls"],
    [{ house: "kizokuin" }, "house"],
    [{ nameKana: "あ".repeat(256) }, "input"],
    [{ constituency: "あ".repeat(256) }, "input"],
    [{ snsUrls: "https://x.com/a" }, "input"],
    [{ nameKana: undefined }, "input"],
  ])("不正な値はエラーにする: %j", (patch, path) => {
    const result = Politician.validate({ ...input, ...patch } as unknown as PoliticianInput);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[0].path).toBe(path);
  });

  it("不正な SNS の URL は何件目かを示す", () => {
    const result = Politician.validate({ ...input, snsUrls: ["https://x.com/a", "x.com/b"] });
    expect(result.status === "invalid" && result.errors[0].message).toContain("2件目");
  });
});
