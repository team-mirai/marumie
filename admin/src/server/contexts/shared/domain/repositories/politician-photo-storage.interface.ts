import "server-only";
import type { PoliticianPhotoMime } from "@/shared/models/politician-photo";

export interface IPoliticianPhotoStorage {
  upload(path: string, bytes: Uint8Array, mime: PoliticianPhotoMime): Promise<void>;
  remove(path: string): Promise<void>;
  createSignedUrl(path: string, expiresIn: number): Promise<string>;
}
