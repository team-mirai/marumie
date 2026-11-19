import type { PayeeAddressSearchData } from "@/server/contexts/research-fund/domain/models/payee-address-search";

export interface PayeeAddressSearchGateway {
  /** 組み立て済みのプロンプトで Web を検索し、候補一覧を返す。解析できなければ候補は空 */
  search(prompt: string, name: string): Promise<PayeeAddressSearchData>;
}
