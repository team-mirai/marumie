import type { GrantWrite } from "@/server/contexts/research-fund/domain/models/grant-registration";
import type { ResearchFundAccount } from "@/server/contexts/research-fund/domain/models/journal-posting";

export interface GrantBook {
  financialYear: number;
  /** 支給の起点となる当選日（YYYY-MM-DD） */
  termStart: string;
}

export interface RegisteredGrant {
  month: string;
  /** 登録時に入力された金額。自動計算の額と異なることがある。 */
  amount: number;
}

export interface GrantRepository {
  book(bookId: string): Promise<GrantBook | null>;
  /** 支給として登録済みの年月（YYYY-MM）と登録した金額。重複は呼び出し側で吸収する。 */
  registeredGrants(bookId: string): Promise<RegisteredGrant[]>;
  accounts(): Promise<ResearchFundAccount[]>;
  /** 同月の支給が既にあれば作成せず GrantRegistrationError を投げる。 */
  create(bookId: string, month: string, input: GrantWrite, userId: string): Promise<string>;
}
