/** 支払先の住所検索の候補 1 件 */
export interface PayeeAddressCandidate {
  companyName: string;
  postalCode: string | null;
  address: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface PayeeAddressSearchData {
  candidates: PayeeAddressCandidate[];
  searchQuery: string;
}

/**
 * 住所検索の結果。支払先フォームは政治資金の取引先画面と同じ住所検索の UI を使うため、
 * 取引先の住所検索と同じ形で返す。
 */
export type PayeeAddressSearchResult =
  | { success: true; data: PayeeAddressSearchData }
  | {
      success: false;
      error:
        | { type: "API_ERROR"; message: string; retryable: boolean }
        | { type: "TIMEOUT"; message: string }
        | { type: "RATE_LIMIT"; retryAfter: number }
        | { type: "NO_RESULTS"; message: string };
    };
