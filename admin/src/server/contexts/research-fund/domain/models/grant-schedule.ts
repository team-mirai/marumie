import {
  isCalendarDate,
  isCalendarMonth,
} from "@/server/contexts/research-fund/domain/models/calendar-date";
import {
  invalidResearchFundResult,
  RF_ERROR_CODES,
  type ResearchFundResult,
} from "@/server/contexts/research-fund/domain/types/validation";

/** 支給として登録済みの 1 件。自動計算の額ではなくこの額が支給の実績となる。 */
export interface RegisteredGrant {
  /** 年を含む YYYY-MM。別年度の登録と混同しない。 */
  month: string;
  /** 登録時に入力された金額。自動計算の額と異なることがある。 */
  amount: number;
}

export interface GrantSchedule {
  /** 当選日と基準日は、タイムゾーンに依存しない YYYY-MM-DD の暦日。 */
  termStart: string;
  /** 1月から12月までの暦年。 */
  financialYear: number;
  referenceDate: string;
  registeredGrants: readonly RegisteredGrant[];
}

export interface ScheduledGrant {
  month: string;
  amount: number;
  status: "registered" | "available" | "upcoming";
}

export const GrantSchedule = {
  generate(input: GrantSchedule): ResearchFundResult<readonly ScheduledGrant[]> {
    for (const path of ["termStart", "referenceDate"] as const) {
      if (!isCalendarDate(input[path], { allowYearZero: false })) {
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
    for (const [index, grant] of input.registeredGrants.entries()) {
      if (!isCalendarMonth(grant.month, { allowYearZero: false })) {
        return invalidResearchFundResult(
          `registeredGrants.${index}.month`,
          RF_ERROR_CODES.INVALID_DATE,
          "登録済みの月は実在する年月をYYYY-MM形式で指定してください",
        );
      }
    }

    // 登録済みの月は、自動計算の額ではなく実際に登録した額を出す。同月が重複したら後の登録を採る。
    const registeredAmounts = new Map(
      input.registeredGrants.map((grant) => [grant.month, grant.amount]),
    );
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
      const automaticAmount = Math.floor((1_000_000 * eligibleDays) / daysInMonth);
      // 過去月の未登録分も今から登録できる。当選月は当選日を迎えるまで未到来。
      const available = month <= currentMonth && input.referenceDate >= input.termStart;
      const registeredAmount = registeredAmounts.get(month);
      grants.push({
        month,
        amount: registeredAmount ?? automaticAmount,
        status:
          registeredAmount !== undefined ? "registered" : available ? "available" : "upcoming",
      });
    }
    return { status: "valid", value: grants };
  },

  /**
   * 支給の予定から、指定した月の支給を登録できるかを判定する。
   * 年度に無い月・登録済の月・支給日が来ていない月は、却下理由を返す。
   */
  registrable(
    grants: readonly ScheduledGrant[],
    month: string,
  ): ResearchFundResult<ScheduledGrant> {
    const grant = grants.find((candidate) => candidate.month === month);
    if (!grant)
      return invalidResearchFundResult(
        "month",
        RF_ERROR_CODES.INVALID_DATE,
        "この年度に支給のない月です",
      );
    if (grant.status === "registered")
      return invalidResearchFundResult(
        "month",
        RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "この月の支給はすでに登録されています",
      );
    if (grant.status === "upcoming")
      return invalidResearchFundResult(
        "month",
        RF_ERROR_CODES.INVALID_STATUS_TRANSITION,
        "支給日が到来していません",
      );
    return { status: "valid", value: grant };
  },
};
