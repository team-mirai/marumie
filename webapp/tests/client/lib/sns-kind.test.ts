import { snsKindOf } from "@/client/lib/sns-kind";

describe("snsKindOf", () => {
  it.each([
    ["https://x.com/mineshima_mirai", "X"],
    ["https://twitter.com/foo", "X"],
    ["https://www.instagram.com/foo/", "Instagram"],
    ["https://www.tiktok.com/@foo", "TikTok"],
    ["https://www.youtube.com/channel/UC123", "YouTube"],
    ["https://youtu.be/abc", "YouTube"],
    ["https://www.threads.com/@foo", "Threads"],
    ["https://note.com/foo", "note"],
    ["https://open.spotify.com/show/abc", "Spotify"],
    ["https://line.me/R/ti/p/@foo", "LINE"],
    ["https://www.facebook.com/foo", "Facebook"],
  ])("%s は %s", (url, kind) => {
    expect(snsKindOf(url)).toBe(kind);
  });

  it("ホスト名で判定し、パスやほかのドメインの一部には反応しない", () => {
    expect(snsKindOf("https://example.com/x.com")).toBeNull();
    expect(snsKindOf("https://notx.com/foo")).toBeNull();
  });

  it("URL として読めなければ null", () => {
    expect(snsKindOf("not a url")).toBeNull();
  });
});
