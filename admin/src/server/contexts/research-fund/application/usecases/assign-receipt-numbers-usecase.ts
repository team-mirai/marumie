import "server-only";
import { planReceiptNumbers } from "@/server/contexts/research-fund/domain/models/receipt-number";
import type { ReceiptNumberRepository } from "@/server/contexts/research-fund/domain/repositories/receipt-number-repository.interface";

/**
 * 帳簿の未採番の書類に領収書等番号を振る（採番済みの番号は変えない）。
 *
 * 番号は議員課提出用の帳簿の情報で公開内容を変えないので、webapp のキャッシュは無効化しない。
 */
export class AssignReceiptNumbersUsecase {
  constructor(private repository: ReceiptNumberRepository) {}
  async execute(bookId: string) {
    const assignments = planReceiptNumbers(await this.repository.listNumberingDocuments(bookId));
    if (assignments.length > 0) await this.repository.assign(bookId, assignments);
    return { assigned: assignments.length };
  }
}
