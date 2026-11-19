import "server-only";
import { ListGrantsUsecase } from "@/server/contexts/research-fund/application/usecases/list-grants-usecase";
import {
  isCalendarMonth,
  todayInJst,
} from "@/server/contexts/research-fund/domain/models/calendar-date";
import { GrantRegistrationError } from "@/server/contexts/research-fund/domain/models/grant-registration";
import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";
import type { GrantRepository } from "@/server/contexts/research-fund/domain/repositories/grant-repository.interface";
import { buildGrantJournalWrite } from "@/server/contexts/research-fund/domain/services/grant-journal-builder";

/** 下書きを経ず確認済で支給の収入仕訳を作る。振込は機械的なため目視確認を挟まない。 */
export class RegisterGrantUsecase {
  private listGrants: ListGrantsUsecase;

  constructor(private repository: GrantRepository) {
    this.listGrants = new ListGrantsUsecase(repository);
  }

  async execute(
    bookId: string,
    month: string,
    userId: string,
    referenceDate: string = todayInJst(),
    /** 手入力された支給日。省略時はその月の既定日（当選月は当選日）。 */
    inputEntryDate?: string,
    /** 手入力された支給額。省略時は自動計算の額（当選月は日割）。 */
    inputAmount?: number,
  ) {
    if (!isCalendarMonth(month))
      throw new GrantRegistrationError("月はYYYY-MM形式で指定してください");
    const { grants, termStart } = await this.listGrants.execute(bookId, referenceDate);
    const registrable = GrantSchedule.registrable(grants, month);
    if (registrable.status === "invalid")
      throw new GrantRegistrationError(registrable.errors[0].message);

    // 支給日・金額の検証は buildGrantJournalWrite が行うので、画面を経由しない呼び出しも同じ判定で弾ける。
    const write = buildGrantJournalWrite({
      month,
      termStart,
      entryDate: inputEntryDate,
      amount: inputAmount === undefined ? registrable.value.amount : inputAmount,
      accounts: await this.repository.accounts(),
    });
    if (write.status === "invalid") throw new GrantRegistrationError(write.errors[0].message);
    return this.repository.create(bookId, month, write.value, userId);
  }
}
