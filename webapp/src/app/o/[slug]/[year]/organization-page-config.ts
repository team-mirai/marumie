/** 政党・政治団体ページ（/o/[slug]/[year]）で選べる年度 */
export const VALID_YEARS = [2025, 2026] as const;
export const DEFAULT_YEAR = 2026;

// 政党ページとして見せる団体。ほかは政治団体ページ（代表者の写真・SNS の見出し）にする。
// シードの sample-party は、E2E で政党ページを確かめるために政党として扱う
export const PARTY_SLUGS: readonly string[] = ["team-mirai", "sample-party"];

export function isValidYear(year: number): boolean {
  return VALID_YEARS.includes(year as (typeof VALID_YEARS)[number]);
}
