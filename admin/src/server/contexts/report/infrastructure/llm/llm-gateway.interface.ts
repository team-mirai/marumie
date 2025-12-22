import type { CounterpartAddressSearchResult } from "@/server/contexts/report/infrastructure/llm/types";

export interface SearchAddressParams {
  companyName: string;
  hint?: string;
}

export interface LLMGateway {
  searchAddress(params: SearchAddressParams): Promise<CounterpartAddressSearchResult>;
}
