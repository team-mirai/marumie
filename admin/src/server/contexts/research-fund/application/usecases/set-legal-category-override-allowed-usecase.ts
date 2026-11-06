import "server-only";
import { isSerialId } from "@/server/contexts/research-fund/domain/models/entity-id";
import { LegalCategoryOverridePolicy } from "@/server/contexts/research-fund/domain/models/legal-category-override";
import type { IBookRepository } from "@/server/contexts/research-fund/domain/repositories/book-repository.interface";
import { BookError } from "@/server/contexts/research-fund/domain/types/book-error";

/**
 * 帳簿ごとに、仕訳の法定区分の上書きを許可・取り消しする（#1880）。管理者（admin）だけが使う（呼び出し側で確かめる）。
 * 上書き中の仕訳が残っている帳簿では許可を取り消せない。
 *
 * 許可の切り替えだけでは公開内容（仕訳の区分）は変わらないので、webapp のキャッシュは無効化しない。
 */
export class SetLegalCategoryOverrideAllowedUsecase {
  constructor(private repository: IBookRepository) {}

  async execute(politicianId: string, bookId: string, allowed: boolean) {
    if (!isSerialId(politicianId) || !isSerialId(bookId))
      throw new BookError("INVALID_ID", "IDが不正です");
    if (typeof allowed !== "boolean")
      throw new BookError("RF_INVALID_LEGAL_CATEGORY_OVERRIDE", "操作が不正です");
    const count = await this.repository.legalCategoryOverrideCount(politicianId, bookId);
    if (count === null) throw new BookError("INVALID_ID", "帳簿が見つかりません");
    if (!allowed) {
      const rejection = LegalCategoryOverridePolicy.revocationRejection(count);
      if (rejection) throw new BookError("RF_INVALID_LEGAL_CATEGORY_OVERRIDE", rejection);
    }
    await this.repository.setLegalCategoryOverrideAllowed(politicianId, bookId, allowed);
    return { allowed };
  }
}
