import type { JournalLine } from "@/server/contexts/research-fund/domain/models/journal-posting";

export class GrantRegistrationError extends Error {}

/** 支給1件分の登録内容。複式行は JournalPosting、重複検知の hash は JournalEntryHash が組み立てる。 */
export interface GrantWrite {
  /** 暦日を YYYY-MM-DD で指定する。タイムゾーンによる日付のずれを避ける。 */
  entryDate: string;
  description: string;
  amount: number;
  hash: string;
  lines: readonly JournalLine[];
}

/** 年月を YYYY-MM で表す。GrantSchedule の month と同じ表記。 */
export function isGrantMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * 支給日の判定は日本時間の暦日で行う。
 * UTC のままだと日本時間の 0〜9 時に前日扱いとなり、支給日当日に登録できなくなる。
 */
export function japanCalendarDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 支給の仕訳日。テンプレートは毎月1日だが、当選月だけは当選日を使う。
 * 当選日より前の日付で在職前の収入を計上しないため。
 */
export function grantEntryDate(month: string, termStart: string): string {
  return month === termStart.slice(0, 7) ? termStart : `${month}-01`;
}

export function grantDescription(month: string): string {
  return `調査研究費 ${Number(month.slice(5, 7))}月分`;
}
