import type {
  Payee,
  PayeeDeletionImpact,
  PayeeDeletionResult,
  PayeeInput,
  PayeeJournalEntry,
  PayeeSummary,
} from "@/server/contexts/research-fund/domain/models/payee";
import type { PayeeAlias } from "@/server/contexts/research-fund/domain/models/payee-alias";
import type {
  PayeeMergeCandidate,
  PayeeMergeResult,
} from "@/server/contexts/research-fund/domain/models/payee-merge";

/** 支払先は議員ごとに持つ。どの操作も議員で絞り込み、別の議員の支払先を返さない・変更しない */
export interface PayeeRepository {
  /** 議員の支払先を、帳簿で紐づいている仕訳の件数つきで返す */
  list(politicianId: string, bookId: string): Promise<PayeeSummary[]>;
  /** 帳簿の仕訳のうち、議員の支払先に紐づいたものを日付の新しい順に返す。別の議員の支払先なら空 */
  listJournalEntries(
    politicianId: string,
    id: string,
    bookId: string,
  ): Promise<PayeeJournalEntry[]>;
  /** 議員の支払先を 1 件返す。別の議員の支払先なら null */
  find(politicianId: string, id: string): Promise<Payee | null>;
  /** 同じ名称・住所の支払先がすでにあれば PayeeError を投げる */
  create(politicianId: string, input: PayeeInput): Promise<Payee>;
  /** 別の議員の支払先・存在しない支払先なら PayeeError を投げる */
  update(politicianId: string, id: string, input: PayeeInput): Promise<Payee>;
  /**
   * 議員の支払先に記録された表記を記録の古い順に返す。同じ表記が記録されている同じ議員の別の支払先を添える。
   * 別の議員の支払先なら空
   */
  listAliases(politicianId: string, id: string): Promise<PayeeAlias[]>;
  /** 議員の支払先の表記を削除する。別の議員の支払先・別の支払先の表記・存在しない表記なら false */
  deleteAlias(politicianId: string, id: string, aliasId: string): Promise<boolean>;
  /** 議員の支払先を削除したときの影響を、議員のすべての帳簿の仕訳で数える。別の議員の支払先なら null */
  deletionImpact(politicianId: string, id: string): Promise<PayeeDeletionImpact | null>;
  /**
   * 議員の支払先を削除する。紐づいていた公開中でない仕訳は支払先が未設定に戻り、表記も一緒に消える。
   * 公開中の仕訳が紐づいていれば何も変えずに published を返す。別の議員の支払先なら not-found
   */
  delete(politicianId: string, id: string): Promise<PayeeDeletionResult>;
  /**
   * 議員の支払先のうち、id の支払先に統合できる候補（id 以外）を名称順に返す。
   * 仕訳の件数は議員のすべての帳簿で数え、記録された表記の名称を添える
   */
  listMergeCandidates(politicianId: string, id: string): Promise<PayeeMergeCandidate[]>;
  /**
   * 議員の支払先 sourceId を targetId に統合する（domain/models/payee-merge）。
   * 統合元の仕訳を統合先に紐づけ直し、表記と名称を統合先の表記にして、統合元を消す。
   * どちらかが別の議員の支払先なら not-found、統合できない理由があれば何も変えずに rejected を返す
   */
  merge(politicianId: string, targetId: string, sourceId: string): Promise<PayeeMergeResult>;
}
