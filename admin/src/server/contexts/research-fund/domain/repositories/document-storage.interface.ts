import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export interface DocumentStorage {
  upload(bytes: Uint8Array, mime: string): Promise<ResearchFundResult<string>>;
  createSignedUrl(storageKey: string, expiresIn: number): Promise<ResearchFundResult<string>>;
  remove(storageKey: string): Promise<void>;
}
