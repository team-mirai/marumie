import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export interface DocumentStorage {
  upload(bytes: Uint8Array, mime: string): Promise<ResearchFundResult<string>>;
  /** 読み取り（LLM）に渡す原本のバイト列を取り出す */
  download(storageKey: string): Promise<ResearchFundResult<Uint8Array>>;
  createSignedUrl(storageKey: string, expiresIn: number): Promise<ResearchFundResult<string>>;
  remove(storageKey: string): Promise<void>;
}
