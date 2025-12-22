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

export type SearchErrorType = "API_ERROR" | "TIMEOUT" | "RATE_LIMIT" | "NO_RESULTS";

export interface ApiError {
  type: "API_ERROR";
  message: string;
  retryable: boolean;
}

export interface TimeoutError {
  type: "TIMEOUT";
  message: string;
}

export interface RateLimitError {
  type: "RATE_LIMIT";
  retryAfter: number;
}

export interface NoResultsError {
  type: "NO_RESULTS";
  message: string;
}

export type SearchError = ApiError | TimeoutError | RateLimitError | NoResultsError;

export type SearchResult =
  | { success: true; data: CounterpartAddressSearchResult }
  | { success: false; error: SearchError };
