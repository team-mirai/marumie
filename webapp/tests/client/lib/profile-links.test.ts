import { buildProfileLinks, detectSnsKind } from "@/client/lib/profile-links";

describe("detectSnsKind", () => {
  it.each([
    ["https://x.com/team_mirai_jp", "X"],
    ["https://www.instagram.com/team_mirai_jp/", "Instagram"],
    ["https://www.tiktok.com/@team_mirai_jp", "TikTok"],
    ["https://www.youtube.com/@team_mirai_jp", "YouTube"],
    ["https://www.threads.com/@team_mirai_jp", "Threads"],
    ["https://note.com/annotakahiro24", "note"],
    ["https://open.spotify.com/show/xxx", "Spotify"],
    ["https://line.me/R/ti/p/@465hhyop", "LINE"],
    ["https://www.facebook.com/teammirai.official", "Facebook"],
  ])("%s は %s", (url, kind) => {
    expect(detectSnsKind(url)).toBe(kind);
  });

  it("種類が分からない URL は null", () => {
    expect(detectSnsKind("https://team-mir.ai/")).toBeNull();
  });
});

describe("buildProfileLinks", () => {
  it("公式サイトを先頭に、SNS を登録順に並べる", () => {
    expect(
      buildProfileLinks("https://team-mir.ai/", [
        "https://www.youtube.com/@team_mirai_jp",
        "https://x.com/team_mirai_jp",
      ]),
    ).toEqual([
      { type: "site", url: "https://team-mir.ai/", label: "公式サイト" },
      { type: "sns", url: "https://www.youtube.com/@team_mirai_jp", label: "YouTube", kind: "YouTube" },
      { type: "sns", url: "https://x.com/team_mirai_jp", label: "X", kind: "X" },
    ]);
  });

  it("種類が分からない SNS の URL は公式サイトのリンクとして SNS より前に置く", () => {
    expect(buildProfileLinks(null, ["https://x.com/a", "https://blog.example.com/"])).toEqual([
      { type: "site", url: "https://blog.example.com/", label: "公式サイト" },
      { type: "sns", url: "https://x.com/a", label: "X", kind: "X" },
    ]);
  });

  it("何も登録されていなければ空", () => {
    expect(buildProfileLinks(null, [])).toEqual([]);
  });
});
