import {
  FOOTER_SOCIAL_LINKS,
  socialLinkLabel,
  sortFooterPoliticiansByKana,
} from "@/client/lib/footer-navigation";
import { buildPoliticianMenuItems, parseHeaderPath } from "@/client/lib/header-navigation";

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

describe("sortFooterPoliticiansByKana", () => {
  const YAMADA = { slug: "yamada", name: "山田太郎", nameKana: "やまだたろう", hasPhoto: false };
  const ABE = { slug: "abe", name: "阿部花子", nameKana: "あべはなこ", hasPhoto: false };
  const KATO = { slug: "kato", name: "加藤次郎", nameKana: "カトウジロウ", hasPhoto: false };
  const NO_KANA = { slug: "no-kana", name: "安藤", nameKana: null, hasPhoto: false };

  it("前の年度にしかいない議員も含めて、年度をまたいでふりがなの五十音順に並べる", () => {
    const politiciansByYear = { 2025: [ABE, KATO], 2026: [KATO, YAMADA] };
    const items = buildPoliticianMenuItems(politiciansByYear, parseHeaderPath("/"));

    expect(items.map((item) => item.slug)).toEqual(["kato", "yamada", "abe"]);
    expect(
      sortFooterPoliticiansByKana(items, politiciansByYear).map((item) => item.slug),
    ).toEqual(["abe", "kato", "yamada"]);
  });

  it("ふりがなが未登録の議員は後ろに回す", () => {
    const politiciansByYear = { 2026: [NO_KANA, YAMADA, ABE] };
    const items = buildPoliticianMenuItems(politiciansByYear, parseHeaderPath("/"));

    expect(
      sortFooterPoliticiansByKana(items, politiciansByYear).map((item) => item.slug),
    ).toEqual(["abe", "yamada", "no-kana"]);
  });
});
