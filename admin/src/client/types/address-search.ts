/**
 * 住所検索機能のクライアント向け型定義
 *
 * infrastructure層（LLM）の実装詳細を隠蔽し、UIコンポーネントで使用する型を提供する
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
