export interface AddressCandidate {
  companyName: string;
  postalCode: string | null;
  address: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface CounterpartAddressSearchResult {
  candidates: AddressCandidate[];
  searchQuery: string;
}

export type SearchError =
  | { type: "API_ERROR"; message: string; retryable: boolean }
  | { type: "TIMEOUT"; message: string }
  | { type: "RATE_LIMIT"; retryAfter: number }
  | { type: "NO_RESULTS"; message: string };

export type SearchResult =
  | { success: true; data: CounterpartAddressSearchResult }
  | { success: false; error: SearchError };
