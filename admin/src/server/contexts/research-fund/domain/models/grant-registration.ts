import { isCalendarDate } from "@/server/contexts/research-fund/domain/models/calendar-date";
import {
  INVALID_JOURNAL_AMOUNT_MESSAGE,
  isJournalAmount,
} from "@/server/contexts/research-fund/domain/models/journal-amount";
import type { JournalEntryStatus } from "@/server/contexts/research-fund/domain/models/journal-entry";
import type { JournalLine } from "@/server/contexts/research-fund/domain/models/journal-posting";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export class GrantRegistrationError extends Error {}

/** 支給1件分の登録内容。複式行は JournalPosting、重複検知の hash は JournalEntryHash が組み立てる。 */
export interface GrantWrite {
  /** 暦日を YYYY-MM-DD で指定する。タイムゾーンによる日付のずれを避ける。 */
  entryDate: string;
  description: string;
  amount: number;
  hash: string;
  lines: readonly JournalLine[];
  /** 作る仕訳の状態（JournalEntry.initialStatus） */
  status: JournalEntryStatus;
}

/**
 * 支給の仕訳日の初期値。既定は毎月1日だが、当選月だけは当選日を使う。
 * 手入力された支給日の下限にもなる（当選日より前の日付で在職前の収入を計上しないため）。
 */
export function grantEntryDate(month: string, termStart: string): string {
  return month === termStart.slice(0, 7) ? termStart : `${month}-01`;
}

/** 支給日として選べる範囲（両端を含む YYYY-MM-DD）。 */
interface GrantEntryDateRange {
  first: string;
  last: string;
}

/**
 * ある月の支給日として選べる範囲。その月の中で、当選月は当選日から（在職前の収入を計上しないため）。
 * 画面の日付入力の範囲と、サーバーの検証（validateGrantEntryDate）の両方がこれを使う。
 */
export function grantEntryDateRange(month: string, termStart: string): GrantEntryDateRange {
  const monthEnd = new Date(`${month}-01T00:00:00.000Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  return { first: grantEntryDate(month, termStart), last: monthEnd.toISOString().slice(0, 10) };
}

/**
 * 手入力された支給日を検証する。画面を経由しない呼び出しも同じ判定で弾くため、
 * UI の min/max ではなくこの関数を唯一の根拠にする。
 */
export function validateGrantEntryDate(
  month: string,
  termStart: string,
  entryDate: string,
): ResearchFundResult<string> {
  if (!isCalendarDate(entryDate))
    return invalidResearchFundResult(
      "entryDate",
      RF_ERROR_CODES.INVALID_DATE,
      "支給日は実在する日をYYYY-MM-DD形式で指定してください",
    );
  const range = grantEntryDateRange(month, termStart);
  if (entryDate.slice(0, 7) !== month || entryDate > range.last)
    return invalidResearchFundResult(
      "entryDate",
      RF_ERROR_CODES.INVALID_DATE,
      "支給日はその月の日付を指定してください",
    );
  // 当選月は当選日より前に在職前の収入を計上しない。
  if (entryDate < range.first)
    return invalidResearchFundResult(
      "entryDate",
      RF_ERROR_CODES.INVALID_DATE,
      "支給日は当選日以降の日付を指定してください",
    );
  return { status: "valid", value: entryDate };
}

/**
 * 手入力された支給額を検証する。実際の振込額は自動計算の額と一致しないことがあるため変更を許すが、
 * 画面を経由しない呼び出しも同じ判定で弾くため、UI の min/step ではなくこの関数を唯一の根拠にする。
 * 範囲は仕訳の金額と同じ（支給額はそのまま仕訳の金額になるため）。
 */
export function validateGrantAmount(amount: unknown): ResearchFundResult<number> {
  if (typeof amount !== "number" || !isJournalAmount(amount))
    return invalidResearchFundResult(
      "amount",
      RF_ERROR_CODES.INVALID_AMOUNT,
      INVALID_JOURNAL_AMOUNT_MESSAGE,
    );
  return { status: "valid", value: amount };
}

export function grantDescription(month: string): string {
  return `調査研究広報滞在費 ${Number(month.slice(5, 7))}月分`;
}
