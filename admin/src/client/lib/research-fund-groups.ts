/**
 * 支出群に紐づいた仕訳の期間を「2026.02.08 〜 05.14」の形にする。
 * 同じ年なら終わりの年を省き、1 件だけ／同日なら 1 つの日付にする。
 */
export function formatLinkedPeriod(period: { start: string; end: string } | null): string {
  if (!period) return "—";
  const start = period.start.replaceAll("-", ".");
  const end = period.end.replaceAll("-", ".");
  if (start === end) return start;
  return `${start} 〜 ${period.start.slice(0, 4) === period.end.slice(0, 4) ? end.slice(5) : end}`;
}
