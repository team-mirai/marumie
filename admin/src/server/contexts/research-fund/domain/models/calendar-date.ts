/**
 * 暦日（YYYY-MM-DD）と日本時間の今日。
 *
 * 調研費の日付は、タイムゾーンに依存しない暦日の文字列として扱う（DB にも同じ表記で持つ）。
 * Date へ読むときは必ず UTC 固定で読み、サーバーの時計で日付がずれないようにする。
 * 日付を検証するモデル（帳簿・支給・立替・重複検知の hash）は、すべてこの判定を通す。
 */

/** YYYY-MM-DD の形。実在する日かどうかは isCalendarDate が判定する */
const CALENDAR_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
/** YYYY-MM の形。実在する年月かどうかは isCalendarMonth が判定する */
const CALENDAR_MONTH_FORMAT = /^\d{4}-\d{2}$/;

interface CalendarDateOptions {
  /**
   * 0000 年を実在する年として扱うか（既定は true）。
   * 年が入っていない入力（0000-01-01）を弾きたい判定だけ false を渡す。
   */
  allowYearZero?: boolean;
}

/**
 * 実在する暦日（YYYY-MM-DD）か。
 *
 * Date は存在しない日（2026-02-30 など）を翌月に繰り上げて解釈するので、解析した日付が
 * 入力と一致することまで確かめる。繰り上がった日をそのまま保存しないため。
 */
export function isCalendarDate(value: string, options?: CalendarDateOptions): boolean {
  if (!CALENDAR_DATE_FORMAT.test(value)) return false;
  if (options?.allowYearZero === false && value.startsWith("0000-")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** 実在する年月（YYYY-MM）か。1 日が実在する日であることで、月が 01〜12 であることも確かめる */
export function isCalendarMonth(value: string, options?: CalendarDateOptions): boolean {
  return CALENDAR_MONTH_FORMAT.test(value) && isCalendarDate(`${value}-01`, options);
}

/**
 * 日本時間の今日（YYYY-MM-DD）。
 *
 * 「未来日にできない」「支給日が到来したか」の判定は、サーバーの時計（UTC）ではなく事務所の
 * 時計で行う（UTC で数えると、日本時間の 0〜9 時が前日扱いになり、当日の日付を弾いてしまう）。
 * 日本時間は夏時間の無い固定の UTC+9 なので、時差を足して暦日を取り出す。
 */
export function todayInJst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
