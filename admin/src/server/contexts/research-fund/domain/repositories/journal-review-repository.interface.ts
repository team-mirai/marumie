import type {
  JournalWrite,
  ReviewAccount,
  ReviewEntry,
} from "@/server/contexts/research-fund/domain/models/journal-review";
import type { Payee, PayeeInput } from "@/server/contexts/research-fund/domain/models/payee";
export interface JournalReviewRepository {
  list(bookId: string): Promise<ReviewEntry[]>;
  accounts(): Promise<ReviewAccount[]>;
  /** 支出と支給のどちらも返す。 */
  find(bookId: string, id: string): Promise<ReviewEntry | null>;
  /** 支出だけを返す（支給はまとめて確認済にする対象にならない）。 */
  findMany(bookId: string, ids: readonly string[]): Promise<ReviewEntry[]>;
  year(bookId: string): Promise<number | null>;
  /** 支給の起点となる当選日（YYYY-MM-DD）。帳簿が無ければ null */
  termStart(bookId: string): Promise<string | null>;
  create(bookId: string, input: JournalWrite, userId: string): Promise<string>;
  update(bookId: string, entry: ReviewEntry, input: JournalWrite): Promise<void>;
  discard(bookId: string, entry: ReviewEntry): Promise<void>;
  approveMany(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
  /** 下書き・確認済の支出の仕訳をまとめて削除する。1 件でも競合したら何も削除しない。 */
  discardMany(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
  /** 確認済の支出の仕訳をまとめて下書きに戻す。1 件でも競合したら何も変更しない。 */
  revertManyToDraft(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
  /** 公開中の仕訳を確認済に戻し、帳簿の公開範囲を残った公開中の仕訳の最新月末まで戻す。 */
  unpublish(bookId: string, entry: ReviewEntry): Promise<void>;
  /** 確認済の支出の仕訳を下書きに戻す（支給は対象にしない）。 */
  revertToDraft(bookId: string, entry: ReviewEntry): Promise<void>;
  /**
   * 同じ議員室（帳簿の政治家）で過去に入力された立替者を重複なく返す（入力欄の候補）。
   * 年度をまたいで同じ秘書が立て替えるので、この帳簿だけに限らない。
   */
  advancers(bookId: string): Promise<string[]>;
  /**
   * 支出の仕訳の立替者をまとめて設定・解除する（null で解除）。公開中の仕訳も対象にする。
   * 精算済の仕訳は変更できず、1 件でも競合したら何も変更しない。
   */
  setAdvancedBy(
    bookId: string,
    entries: readonly ReviewEntry[],
    advancedBy: string | null,
  ): Promise<void>;
  /**
   * 書類の無い支出の仕訳に、領収書等を徴し難かった事情を設定・削除する（null で削除）。
   * 公開中・精算済の仕訳も対象にする。競合したら（書類が付いた場合を含む）変更しない。
   */
  setReceiptAbsenceReason(bookId: string, entry: ReviewEntry, reason: string | null): Promise<void>;
  /** 帳簿の議員（支払先の持ち主）。帳簿が無ければ null */
  politicianId(bookId: string): Promise<string | null>;
  /**
   * 支出の仕訳の支払先をまとめて人の手で紐づける・外す（null で外す）。公開中・精算済の仕訳も対象にする。
   * 支払先が帳簿と同じ議員のものでなければ、1 件も変更せずに拒否する。1 件でも競合したら何も変更しない。
   */
  setPayee(bookId: string, entries: readonly ReviewEntry[], payeeId: string | null): Promise<void>;
  /**
   * 帳簿の議員の支払先を作成し、支出の仕訳に人の手で紐づける。1 件でも競合したら支払先も作成しない。
   * 同じ名称・住所の支払先が既にあれば作成も紐づけもしない。
   */
  createPayeeAndSetPayee(
    bookId: string,
    entries: readonly ReviewEntry[],
    politicianId: string,
    input: PayeeInput,
  ): Promise<Payee>;
  /** 未精算の立替をまとめて精算済にする。1 件でも競合したら何も変更しない。 */
  settleMany(bookId: string, entries: readonly ReviewEntry[], settledAt: string): Promise<void>;
  /** 精算済の立替をまとめて未精算に戻す。1 件でも競合したら何も変更しない。 */
  unsettleMany(bookId: string, entries: readonly ReviewEntry[]): Promise<void>;
}
