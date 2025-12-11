/**
 * Serializer Utilities
 *
 * Common utility functions for XML serialization.
 */

/**
 * Formats a number amount for XML output.
 * Returns "0" for invalid/null values, otherwise rounds and converts to string.
 */
export function formatAmount(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? null)) {
    return "0";
  }
  const rounded = Math.round(Number(value));
  return rounded.toString();
}

/**
 * Formats a Date to Japanese imperial era format (ge/m/d).
 * e.g., "R7/1/15" for 2025-01-15
 *
 * Supported eras:
 * - 令和 (R): 2019-05-01 ~
 * - 平成 (H): 1989-01-08 ~ 2019-04-30
 * - 昭和 (S): 1926-12-25 ~ 1989-01-07
 */
export function formatWarekiDate(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 令和: 2019-05-01 ~
  if (year > 2019 || (year === 2019 && month >= 5)) {
    const reiwaYear = year - 2018;
    return `R${reiwaYear}/${month}/${day}`;
  }

  // 平成: 1989-01-08 ~ 2019-04-30
  if (year > 1989 || (year === 1989 && (month > 1 || day >= 8))) {
    const heiseiYear = year - 1988;
    return `H${heiseiYear}/${month}/${day}`;
  }

  // 昭和: 1926-12-25 ~ 1989-01-07
  if (year >= 1926) {
    const showaYear = year - 1925;
    return `S${showaYear}/${month}/${day}`;
  }

  // Fallback to Western calendar
  return `${year}/${month}/${day}`;
}
