/** 政党・政治団体ページ（/o/[slug]/[year]）で選べる年度 */
export const VALID_YEARS = [2025, 2026] as const;
export const DEFAULT_YEAR = 2026;

export function isValidYear(year: number): boolean {
  return VALID_YEARS.includes(year as (typeof VALID_YEARS)[number]);
}
