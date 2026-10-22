import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

/** ブラウザが書類を置く先。キーと、そのキーにだけ書き込める署名付き URL */
export interface DocumentUploadTarget {
  uploadKey: string;
  uploadUrl: string;
}

/**
 * ブラウザから原本のバケットへ書類を直接置くためのストレージ（#1824）。
 * ファイル本体は Vercel の関数のリクエストボディ上限（4.5MB）を超えうるので、関数を通さない。
 */
export interface DocumentUploadStorage {
  /** prefix の下に新しいキーを作り、そのキーにだけ書き込める署名付き URL を発行する */
  createUploadTarget(prefix: string): Promise<DocumentUploadTarget>;
  /**
   * ブラウザが置いた書類を正式なキーへ移し、そのキーを返す。移すので同じアップロードは 1 回しか登録できない。
   * 置かれていなければ invalid を返す。
   */
  claimUpload(uploadKey: string): Promise<ResearchFundResult<string>>;
}
