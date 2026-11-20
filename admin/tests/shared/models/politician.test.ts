import {
  Politician,
  type PoliticianInput,
  RESEARCH_FUND_COMING_SOON_NOTE_MAX_LENGTH,
} from "@/shared/models/politician";

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

describe("Politician.setResearchFundPublic", () => {
  it("公開すると「準備中」の添え書きも消す（公開中かつ準備中にしない）", () => {
    expect(Politician.setResearchFundPublic(true)).toEqual({
      status: "valid",
      value: { isResearchFundPublic: true, researchFundComingSoonNote: null },
    });
  });

  it("非公開にするときは公開フラグだけを変え、添え書きには触れない", () => {
    expect(Politician.setResearchFundPublic(false)).toEqual({
      status: "valid",
      value: { isResearchFundPublic: false },
    });
  });

  it("真偽値以外は受け付けない", () => {
    expect(Politician.setResearchFundPublic("true" as unknown as boolean).status).toBe("invalid");
  });
});

describe("Politician.setResearchFundComingSoonNote", () => {
  it("非公開の議員は、前後の空白を除いた添え書きで準備中にできる", () => {
    expect(
      Politician.setResearchFundComingSoonNote({ isResearchFundPublic: false }, "  12月中旬 "),
    ).toEqual({ status: "valid", value: "12月中旬" });
  });

  it("空の添え書きは「添え書きなしで準備中」、null は「準備中にしない」", () => {
    expect(
      Politician.setResearchFundComingSoonNote({ isResearchFundPublic: false }, "   "),
    ).toEqual({ status: "valid", value: "" });
    expect(Politician.setResearchFundComingSoonNote({ isResearchFundPublic: false }, null)).toEqual(
      { status: "valid", value: null },
    );
  });

  it("公開中の議員は準備中にできない", () => {
    const result = Politician.setResearchFundComingSoonNote({ isResearchFundPublic: true }, "x");
    expect(result.status).toBe("invalid");
    if (result.status === "invalid")
      expect(result.errors[0].message).toContain("公開中の議員は「準備中」にできません");
  });

  it("公開中の議員でも、準備中をやめる（null）のは受け付ける", () => {
    expect(Politician.setResearchFundComingSoonNote({ isResearchFundPublic: true }, null)).toEqual({
      status: "valid",
      value: null,
    });
  });

  it("上限より長い添え書きは受け付けない", () => {
    const result = Politician.setResearchFundComingSoonNote(
      { isResearchFundPublic: false },
      "あ".repeat(RESEARCH_FUND_COMING_SOON_NOTE_MAX_LENGTH + 1),
    );
    expect(result.status).toBe("invalid");
  });
});
