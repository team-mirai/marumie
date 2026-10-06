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
    const schedule = GrantSchedule.generate({
      termStart: book.termStart,
      financialYear: book.financialYear,
      referenceDate,
      registeredGrants: await this.repository.registeredGrants(bookId),
    });
    if (schedule.status === "invalid") throw new GrantRegistrationError(schedule.errors[0].message);
    return {
      grants: schedule.value,
      termStart: book.termStart,
      financialYear: book.financialYear,
    };
  }
}
