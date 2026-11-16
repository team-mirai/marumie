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
