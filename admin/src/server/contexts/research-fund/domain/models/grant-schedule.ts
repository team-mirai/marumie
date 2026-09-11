import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

export interface GrantSchedule {
  /** 当選日と基準日は、タイムゾーンに依存しない YYYY-MM-DD の暦日。 */
  termStart: string;
  /** 1月から12月までの暦年。 */
  financialYear: number;
  referenceDate: string;
  /** 年を含む YYYY-MM。別年度の登録と混同しない。 */
  registeredMonths: readonly string[];
}

export interface ScheduledGrant {
  month: string;
  amount: number;
  status: "registered" | "available" | "upcoming";
}

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !value.startsWith("0000-") &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export const GrantSchedule = {
  generate(input: GrantSchedule): ResearchFundResult<readonly ScheduledGrant[]> {
    for (const path of ["termStart", "referenceDate"] as const) {
      if (!isCalendarDate(input[path])) {
        return invalidResearchFundResult(
          path,
          RF_ERROR_CODES.INVALID_DATE,
          "日付は実在する日をYYYY-MM-DD形式で指定してください",
        );
      }
    }
    if (
      !Number.isInteger(input.financialYear) ||
      input.financialYear < 1 ||
      input.financialYear > 9999
    ) {
      return invalidResearchFundResult(
        "financialYear",
        RF_ERROR_CODES.INVALID_DATE,
        "年度は1から9999までの整数で指定してください",
      );
    }
    for (const [index, month] of input.registeredMonths.entries()) {
      if (!/^\d{4}-\d{2}$/.test(month) || !isCalendarDate(`${month}-01`)) {
        return invalidResearchFundResult(
          `registeredMonths.${index}`,
          RF_ERROR_CODES.INVALID_DATE,
          "登録済みの月は実在する年月をYYYY-MM形式で指定してください",
        );
      }
    }

    const registeredMonths = new Set(input.registeredMonths);
    const termMonth = input.termStart.slice(0, 7);
    const currentMonth = input.referenceDate.slice(0, 7);
    const grants: ScheduledGrant[] = [];
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const month = `${String(input.financialYear).padStart(4, "0")}-${String(monthNumber).padStart(2, "0")}`;
      if (month < termMonth) continue;

      const monthEnd = new Date(`${month}-01T00:00:00.000Z`);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
      const daysInMonth = monthEnd.getUTCDate();
      const eligibleDays =
        month === termMonth ? daysInMonth - Number(input.termStart.slice(8, 10)) + 1 : daysInMonth;
      // 月途中按分は当選日を含む在職日数 / 暦月の日数、1円未満切り捨てとする。
      // ハンドオフ未規定の初日算入・端数処理は実装上の前提であり、法令解釈は別途確認が必要。
      const amount = Math.floor((1_000_000 * eligibleDays) / daysInMonth);
      // 過去月の未登録分も今から登録できる。当選月は当選日を迎えるまで未到来。
      const available = month <= currentMonth && input.referenceDate >= input.termStart;
      grants.push({
        month,
        amount,
        status: registeredMonths.has(month) ? "registered" : available ? "available" : "upcoming",
      });
    }
    return { status: "valid", value: grants };
  },
};
