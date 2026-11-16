import { FOOTER_SOCIAL_LINKS, socialLinkLabel } from "@/client/lib/footer-navigation";

describe("FOOTER_SOCIAL_LINKS", () => {
  it("デザイン v9 の6つの SNS を並べる", () => {
    expect(FOOTER_SOCIAL_LINKS.map((link) => link.name)).toEqual([
      "YouTube",
      "X（旧Twitter）",
      "LINE",
      "Instagram",
      "Facebook",
      "TikTok",
    ]);
  });

  it("v9 の新しいアイコン（LINE / Instagram / TikTok）を使う", () => {
    expect(FOOTER_SOCIAL_LINKS.map((link) => link.icon)).toEqual([
      "icon-yt.svg",
      "icon-x.svg",
      "icon-line2.svg",
      "icon-ig.svg",
      "icon-fb.svg",
      "icon-tiktok2.svg",
    ]);
  });
});

describe("socialLinkLabel", () => {
  it("だれの何かと、別タブで開くことを読み上げる", () => {
    expect(socialLinkLabel(FOOTER_SOCIAL_LINKS[0])).toBe("チームみらいのYouTube（別タブで開きます）");
    expect(socialLinkLabel(FOOTER_SOCIAL_LINKS[1])).toBe(
      "チームみらいのX（旧Twitter）（別タブで開きます）",
    );
  });
});
