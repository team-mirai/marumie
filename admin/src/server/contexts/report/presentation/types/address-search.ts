/**
 * 住所検索アクションの型定義
 *
 * Presentation層で定義し、Client層からimportされる
 */

/** 住所検索の候補 */
export interface AddressCandidate {
  companyName: string;
  postalCode: string | null;
  address: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

/** 住所検索の成功結果 */
export interface AddressSearchData {
  candidates: AddressCandidate[];
  searchQuery: string;
}

/** 住所検索のエラー */
export type AddressSearchError =
  | { type: "API_ERROR"; message: string; retryable: boolean }
  | { type: "TIMEOUT"; message: string }
  | { type: "RATE_LIMIT"; retryAfter: number }
  | { type: "NO_RESULTS"; message: string };

/** 住所検索の結果（成功 or 失敗） */
export type AddressSearchResult =
  | { success: true; data: AddressSearchData }
  | { success: false; error: AddressSearchError };
