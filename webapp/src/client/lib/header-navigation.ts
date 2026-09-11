const FAQ_URL = "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c";

interface HeaderNavigationItem {
  href: string;
  label: string;
}

/**
 * ヘッダーが表示している対象のページ。
 * 調研費の議員ページ（/p/[slug]/[year]）は政治団体ページ（/o/[slug]/[year]）とセクション構成が違うので、
 * アンカーの行き先を分ける。
 */
type HeaderPageKind = "organization" | "politician";

interface HeaderNavigation {
  /** ロゴとトップリンクの行き先（今いるページ自身） */
  homeHref: string;
  items: HeaderNavigationItem[];
}

/** 政治団体ページのセクション（/o/[slug]/[year]）。 */
const ORGANIZATION_SECTIONS: HeaderNavigationItem[] = [
  { href: "#cash-flow", label: "収支の流れ" },
  { href: "#monthly-trends", label: "1年間の推移" },
  { href: "#balance-sheet", label: "貸借対照表" },
  { href: "#transactions", label: "すべての出入金" },
  { href: "#explanation", label: "データについて" },
];

/** 議員ページのセクション（B-1〜B-5）。 */
const POLITICIAN_SECTIONS: HeaderNavigationItem[] = [
  { href: "#cash-flow", label: "使いみち" },
  { href: "#highlights", label: "活用方針と成果" },
  { href: "#monthly-trends", label: "1年間の推移" },
  { href: "#transactions", label: "すべての支出" },
  { href: "#explanation", label: "データについて" },
];

/**
 * ヘッダーのナビの行き先を組み立てる。
 * アンカーは今いるページ自身を基準にするので、議員ページで押しても政治団体ページに飛ばない。
 */
export function getHeaderNavigation(
  kind: HeaderPageKind,
  slug: string,
  year: number,
): HeaderNavigation {
  const homeHref =
    kind === "politician"
      ? `/p/${encodeURIComponent(slug)}/${year}/`
      : `/o/${encodeURIComponent(slug)}/${year}/`;
  const sections = kind === "politician" ? POLITICIAN_SECTIONS : ORGANIZATION_SECTIONS;

  return {
    homeHref,
    items: [
      ...sections.map((section) => ({ ...section, href: `${homeHref}${section.href}` })),
      { href: FAQ_URL, label: "よくあるご質問" },
    ],
  };
}
