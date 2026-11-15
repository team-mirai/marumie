import { parsePoliticianPathSegment } from "@/shared/research-fund/preview-path";

export const FAQ_URL = "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c";
export const ABOUT_HREF = "/about";
/** トップの「データについて」（共通の下部ブロック） */
export const DATA_NOTES_HREF = "/#explanation";

/** ヘッダーで切り替えられる年。年の切り替えは左から古い順に並べる */
export const HEADER_YEARS = [2025, 2026] as const;
const DEFAULT_HEADER_YEAR = 2026;

/**
 * ヘッダーのナビの項目（デザイン v8 の B 案・5項目）。
 * - pf / rf はメガメニュー（SP では次の段階）を開く
 * - about / data は同じタブで、faq は別タブで移る
 */
export type HeaderNavKey = "pf" | "rf" | "about" | "faq" | "data";

export interface HeaderNavItem {
  key: HeaderNavKey;
  label: string;
}

const HEADER_NAV_ITEMS: readonly HeaderNavItem[] = [
  { key: "pf", label: "政党・政治団体" },
  { key: "rf", label: "調研費" },
  { key: "about", label: "まる見え政治資金とは" },
  { key: "faq", label: "よくあるご質問" },
  { key: "data", label: "データについて" },
];

/**
 * ヘッダーに並べるナビの項目。
 * 調研費を公開している議員が 1 人もいなければ、メニューが空になるので「調研費」を出さない。
 */
export function getHeaderNavItems(hasResearchFundPoliticians: boolean): readonly HeaderNavItem[] {
  return hasResearchFundPoliticians
    ? HEADER_NAV_ITEMS
    : HEADER_NAV_ITEMS.filter((item) => item.key !== "rf");
}

/** メガメニュー（SP では次の段階）を開く項目か */
export function isMenuNavKey(key: HeaderNavKey): key is "pf" | "rf" {
  return key === "pf" || key === "rf";
}

/** 開いているページ。/o/[slug]/[year]/... と /p/[slug]/[year]/... を読み取る */
type HeaderCurrentPage =
  | { kind: "organization"; slug: string; year: number | null }
  | { kind: "politician"; slug: string; year: number | null }
  | { kind: "about" }
  | { kind: "other" };

export function parseHeaderPath(pathname: string): HeaderCurrentPage {
  const [, root, slugSegment, yearSegment] = pathname.split("/");
  if (root === "about") return { kind: "about" };
  if ((root === "o" || root === "p") && slugSegment) {
    const parsedYear = yearSegment ? Number.parseInt(yearSegment, 10) : Number.NaN;
    const year = Number.isNaN(parsedYear) ? null : parsedYear;
    const slug = decodeURIComponent(slugSegment);
    if (root === "o") return { kind: "organization", slug, year };
    // プレビュー URL（/p/{slug}~{文字列}/{年度}）でも、表示中の判定は議員の slug で行う
    return { kind: "politician", slug: parsePoliticianPathSegment(slug).slug, year };
  }
  return { kind: "other" };
}

/** 下線を付ける（`aria-current="page"` にする）ナビの項目 */
export function getCurrentNavKey(current: HeaderCurrentPage): HeaderNavKey | null {
  switch (current.kind) {
    case "organization":
      return "pf";
    case "politician":
      return "rf";
    case "about":
      return "about";
    default:
      return null;
  }
}

function organizationYearHref(slug: string, year: number): string {
  return `/o/${encodeURIComponent(slug)}/${year}`;
}

function politicianYearHref(slug: string, year: number): string {
  return `/p/${encodeURIComponent(slug)}/${year}`;
}

/** メガメニューの「政党・政治団体」の1行 */
export interface HeaderOrganizationMenuItem {
  slug: string;
  name: string;
  /** 正式名（未登録なら null） */
  officialName: string | null;
  /** そのページを表示中か（「表示中」を付ける） */
  isCurrent: boolean;
  /** 名前を押したときの行き先 */
  href: string;
  /** 年の切り替え。表示中でなければどれも選ばれていない */
  years: { year: number; href: string; isSelected: boolean }[];
}

export function buildOrganizationMenuItems(
  organizations: readonly { slug: string; displayName: string; orgName: string | null }[],
  current: HeaderCurrentPage,
): HeaderOrganizationMenuItem[] {
  return organizations.map((organization) => {
    const isCurrent = current.kind === "organization" && current.slug === organization.slug;
    const selectedYear = isCurrent ? current.year : null;
    return {
      slug: organization.slug,
      name: organization.displayName,
      officialName: organization.orgName,
      isCurrent,
      href: organizationYearHref(organization.slug, selectedYear ?? DEFAULT_HEADER_YEAR),
      years: HEADER_YEARS.map((year) => ({
        year,
        href: organizationYearHref(organization.slug, year),
        isSelected: selectedYear === year,
      })),
    };
  });
}

/** メガメニューの「調研費」の1行 */
export interface HeaderPoliticianMenuItem {
  slug: string;
  name: string;
  isCurrent: boolean;
  /** 名前を押したときの行き先（表示中ならその年度、そうでなければ最新の年度） */
  href: string;
  /** 調研費を公開している年度（古い順）。表示中でなければどれも選ばれていない */
  years: { year: number; href: string; isSelected: boolean }[];
}

/**
 * 年度ごとの公開中の議員一覧から、メガメニューの議員の行を作る。
 * 一覧には調研費を公開している議員しか入っていないので、非公開の議員（プレビュー URL で見ている議員を含む）は出ない。
 * 並びは最新の年度の一覧の順で、それより前の年度にしかいない議員を後ろに足す。
 */
export function buildPoliticianMenuItems(
  politiciansByYear: Readonly<Record<number, readonly { slug: string; name: string }[]>>,
  current: HeaderCurrentPage,
): HeaderPoliticianMenuItem[] {
  const yearsNewestFirst = [...HEADER_YEARS].sort((a, b) => b - a);
  const politicians = new Map<string, { name: string; years: number[] }>();
  for (const year of yearsNewestFirst) {
    for (const politician of politiciansByYear[year] ?? []) {
      const entry = politicians.get(politician.slug);
      if (entry) {
        entry.years.push(year);
      } else {
        politicians.set(politician.slug, { name: politician.name, years: [year] });
      }
    }
  }

  return [...politicians].map(([slug, { name, years }]) => {
    const isCurrent = current.kind === "politician" && current.slug === slug;
    const selectedYear =
      isCurrent && current.year !== null && years.includes(current.year) ? current.year : null;
    const latestYear = years[0];
    return {
      slug,
      name,
      isCurrent,
      href: politicianYearHref(slug, selectedYear ?? latestYear),
      years: [...years]
        .sort((a, b) => a - b)
        .map((year) => ({
          year,
          href: politicianYearHref(slug, year),
          isSelected: selectedYear === year,
        })),
    };
  });
}
