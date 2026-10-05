import "server-only";
import {
  GrantRegistrationError,
  japanCalendarDate,
} from "@/server/contexts/research-fund/domain/models/grant-registration";
import { GrantSchedule } from "@/server/contexts/research-fund/domain/models/grant-schedule";
import type { GrantRepository } from "@/server/contexts/research-fund/domain/repositories/grant-repository.interface";

export class ListGrantsUsecase {
  constructor(private repository: GrantRepository) {}

  async execute(bookId: string, referenceDate: string = japanCalendarDate()) {
    const book = await this.repository.book(bookId);
    if (!book) throw new GrantRegistrationError("帳簿が見つかりません");
    const registered = await this.repository.registeredGrants(bookId);
    const schedule = GrantSchedule.generate({
      termStart: book.termStart,
      financialYear: book.financialYear,
      referenceDate,
      registeredMonths: registered.map((grant) => grant.month),
    });
    if (schedule.status === "invalid") throw new GrantRegistrationError(schedule.errors[0].message);
    // 登録済みの月は、自動計算の額ではなく実際に登録した金額を出す。
    const registeredAmounts = new Map(registered.map((grant) => [grant.month, grant.amount]));
    const grants = schedule.value.map((grant) =>
      grant.status === "registered"
        ? { ...grant, amount: registeredAmounts.get(grant.month) ?? grant.amount }
        : grant,
    );
    return { grants, termStart: book.termStart, financialYear: book.financialYear };
  }
}
