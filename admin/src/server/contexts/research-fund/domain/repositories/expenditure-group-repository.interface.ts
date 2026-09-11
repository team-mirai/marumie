import type {
  ExpenditureGroupRecord,
  ExpenditureGroupWrite,
  LinkableEntry,
} from "@/server/contexts/research-fund/domain/models/expenditure-group";

export interface ExpenditureGroupRepository {
  /** 帳簿が無ければ null。policyComment は未記入なら空文字 */
  book(bookId: string): Promise<{ policyComment: string } | null>;
  savePolicyComment(bookId: string, policyComment: string): Promise<void>;
  list(bookId: string): Promise<ExpenditureGroupRecord[]>;
  find(bookId: string, groupId: string): Promise<ExpenditureGroupRecord | null>;
  /** 帳簿の費用仕訳。支給（収入）は成果の対象外なので含めない */
  entries(bookId: string): Promise<LinkableEntry[]>;
  /**
   * 支出群・紐づけ・成果物を 1 トランザクションで作る。
   * 他の支出群に属する仕訳が含まれていれば ExpenditureGroupError を投げ、何も作らない。
   */
  create(bookId: string, input: ExpenditureGroupWrite): Promise<string>;
  /** create と同じ保証で、既存の紐づけ・成果物を入れ替える */
  update(bookId: string, groupId: string, input: ExpenditureGroupWrite): Promise<void>;
  /** 支出群を消す。紐づけと成果物は onDelete: Cascade で一緒に消える */
  remove(bookId: string, groupId: string): Promise<void>;
  /**
   * 渡された順に displayOrder を 0 から振り直す。
   * 帳簿の支出群と過不足があれば（一覧が古いなら）ExpenditureGroupError を投げ、何も変えない。
   */
  reorder(bookId: string, groupIds: readonly string[]): Promise<void>;
}
