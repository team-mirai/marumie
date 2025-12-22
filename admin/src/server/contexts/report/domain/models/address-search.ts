export type ConfidenceLevel = "high" | "medium" | "low";

export interface AddressCandidate {
  companyName: string;
  postalCode: string | null;
  address: string;
  confidence: ConfidenceLevel;
  source: string;
}

export interface CounterpartAddressSearchResult {
  candidates: AddressCandidate[];
  searchQuery: string;
}

export type SearchErrorType = "NO_RESULTS" | "SEARCH_FAILED";

export interface NoResultsError {
  type: "NO_RESULTS";
  message: string;
}

export interface SearchFailedError {
  type: "SEARCH_FAILED";
  message: string;
}

export type SearchError = NoResultsError | SearchFailedError;

export type SearchResult =
  | { success: true; data: CounterpartAddressSearchResult }
  | { success: false; error: SearchError };
