import "server-only";
import type { Politician, PoliticianInput } from "@/shared/models/politician";

export interface IPoliticianRepository {
  findAll(): Promise<Politician[]>;
  findById(id: string): Promise<Politician | null>;
  save(id: string | null, input: PoliticianInput): Promise<void>;
  setResearchFundPublic(id: string, isPublic: boolean): Promise<void>;
  /** 顔写真の Storage 上のキーを付け替える。null で写真なし */
  setPhotoPath(id: string, photoPath: string | null): Promise<void>;
  delete(id: string): Promise<void>;
}
