import type {
  Payee,
  PayeeInput,
  PayeeSummary,
} from "@/server/contexts/research-fund/domain/models/payee";

/** 支払先は議員ごとに持つ。どの操作も議員で絞り込み、別の議員の支払先を返さない・変更しない */
export interface PayeeRepository {
  /** 議員の支払先を、紐づいている仕訳の件数つきで返す */
  list(politicianId: string): Promise<PayeeSummary[]>;
  /** 議員の支払先を 1 件返す。別の議員の支払先なら null */
  find(politicianId: string, id: string): Promise<Payee | null>;
  /** 同じ名称・住所の支払先がすでにあれば PayeeError を投げる */
  create(politicianId: string, input: PayeeInput): Promise<Payee>;
  /** 別の議員の支払先・存在しない支払先なら PayeeError を投げる */
  update(politicianId: string, id: string, input: PayeeInput): Promise<Payee>;
}
