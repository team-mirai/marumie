import type { CounterpartAddressSearchResult } from "@/server/contexts/report/domain/models/counterpart-address-search";

export interface SearchAddressParams {
  companyName: string;
  hint?: string;
}

export interface LLMGateway {
  searchAddress(params: SearchAddressParams): Promise<CounterpartAddressSearchResult>;
}
