const DEFAULT_ORGANIZATION_SLUG = "team-mirai";
const DEFAULT_YEAR = 2026;

export interface FooterTextLink {
  label: string;
  href: string;
}

/** ページ内アンカー以外の、どのページでも共通のリンク。 */
const COMMON_LINKS: FooterTextLink[] = [
  { label: "寄附で応援する", href: "https://team-mir.ai/support/donation" },
  { label: "チームみらい党員になる", href: "https://team-mir.ai/support/membership" },
  {
    label: "よくあるご質問",
    href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
  },
  { label: "利用規約", href: "/terms" },
  { label: "プライバシーポリシー", href: "/privacy" },
];

function getOrganizationLinks(slug: string): FooterTextLink[] {
  const base = `/o/${slug}/`;
  return [
    { label: "TOP", href: `${base}#top` },
    { label: "収支の流れ", href: `${base}#cash-flow` },
    { label: "月ごとの収支推移", href: `${base}#monthly-trends` },
    { label: "貸借対照表", href: `${base}#balance-sheet` },
    { label: "すべての出入金", href: `${base}#transactions` },
    { label: "データについて", href: `${base}#explanation` },
    { label: "チームみらいについて", href: `${base}#about` },
  ];
}

/**
 * 調研費ページ（/p/[slug]/[year]。全件ページを含む）のアンカー。
 * 調研費ページに無い貸借対照表だけは、並びを変えずに既定の政治団体ページを指す。
 */
function getPoliticianLinks(slug: string, year: number): FooterTextLink[] {
  const base = `/p/${encodeURIComponent(slug)}/${year}/`;
  return [
    { label: "TOP", href: `${base}#top` },
    { label: "収支の流れ", href: `${base}#cash-flow` },
    { label: "月ごとの収支推移", href: `${base}#monthly-trends` },
    { label: "貸借対照表", href: `/o/${DEFAULT_ORGANIZATION_SLUG}/#balance-sheet` },
    { label: "すべての出入金", href: `${base}#transactions` },
    { label: "データについて", href: `${base}#explanation` },
    { label: "チームみらいについて", href: `${base}#about` },
  ];
}

/**
 * フッターのテキストリンクを、今いるページに合わせて組み立てる。
 * 調研費ページではアンカーがそのページ内のセクションを指し、政治団体ページへ飛ばない。
 */
export function getFooterTextLinks(pathname: string): FooterTextLink[] {
  const [, rootSegment, slug, yearSegment] = pathname.split("/");

  if (rootSegment === "p" && slug) {
    const year = yearSegment && /^\d{4}$/.test(yearSegment) ? Number(yearSegment) : DEFAULT_YEAR;
    return [...getPoliticianLinks(decodeURIComponent(slug), year), ...COMMON_LINKS];
  }

  const organizationSlug = rootSegment === "o" && slug ? slug : DEFAULT_ORGANIZATION_SLUG;
  return [...getOrganizationLinks(organizationSlug), ...COMMON_LINKS];
}
