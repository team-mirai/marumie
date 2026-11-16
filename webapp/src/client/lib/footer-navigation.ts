/** チームみらいの公式サイト */
export const OFFICIAL_SITE_URL = "https://team-mir.ai/";

interface FooterSocialLink {
  /** 読み上げ名に使うサービス名 */
  name: string;
  href: string;
  /** public/images/social-icons/ のファイル名 */
  icon: string;
}

/** フッターの SNS アイコン（デザイン v9 の並び） */
export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { name: "YouTube", href: "https://www.youtube.com/@team_mirai_jp", icon: "icon-yt.svg" },
  { name: "X（旧Twitter）", href: "https://x.com/team_mirai_jp", icon: "icon-x.svg" },
  {
    name: "LINE",
    href: "https://line.me/R/ti/p/@465hhyop?oat__id=5529589",
    icon: "icon-line2.svg",
  },
  { name: "Instagram", href: "https://www.instagram.com/team_mirai_jp/", icon: "icon-ig.svg" },
  { name: "Facebook", href: "https://www.facebook.com/teammirai.official", icon: "icon-fb.svg" },
  { name: "TikTok", href: "https://www.tiktok.com/@team_mirai_jp", icon: "icon-tiktok2.svg" },
];

/** SNS アイコンの読み上げ名。アイコンだけのリンクなので、だれの何かと別タブで開くことを伝える */
export function socialLinkLabel(link: FooterSocialLink): string {
  return `チームみらいの${link.name}（別タブで開きます）`;
}

/** ひらがなとカタカナ、濁点の有無を五十音の並びどおりに比べる */
const kanaCollator = new Intl.Collator("ja");

/**
 * フッターの議員を、年度をまたいでふりがなの五十音順に並べる。
 * 年度ごとの一覧はそれぞれ五十音順だが、メガメニューと同じ組み立てでは前の年度にしかいない議員が後ろに回るため並べ直す。
 * 並べ方は research-fund の sortPoliticiansByKana と同じ（ふりがな未登録の議員は後ろに回し、その中では名前で並べる）。
 */
export function sortFooterPoliticiansByKana<T extends { slug: string; name: string }>(
  items: readonly T[],
  politiciansByYear: Readonly<Record<number, readonly { slug: string; nameKana: string | null }[]>>,
): T[] {
  const kanaBySlug = new Map<string, string>();
  for (const politicians of Object.values(politiciansByYear)) {
    for (const politician of politicians) {
      const kana = politician.nameKana?.trim();
      if (kana && !kanaBySlug.has(politician.slug)) kanaBySlug.set(politician.slug, kana);
    }
  }

  return [...items].sort((a, b) => {
    const aKana = kanaBySlug.get(a.slug);
    const bKana = kanaBySlug.get(b.slug);
    if (aKana && bKana) return kanaCollator.compare(aKana, bKana);
    if (aKana) return -1;
    if (bKana) return 1;
    return kanaCollator.compare(a.name, b.name);
  });
}
