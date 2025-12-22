import "server-only";

import type { CounterpartAddressSearchResult } from "@/server/contexts/report/domain/models/address-search";

export interface SearchCounterpartAddressParams {
  name: string;
  hint?: string;
}

export interface ILLMGateway {
  searchCounterpartAddress(
    params: SearchCounterpartAddressParams,
  ): Promise<CounterpartAddressSearchResult>;
}
