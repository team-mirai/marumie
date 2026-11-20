import "server-only";
import type {
  Politician,
  PoliticianInput,
  PoliticianProfileInput,
} from "@/shared/models/politician";

export interface IPoliticianRepository {
  findAll(): Promise<Politician[]>;
  findById(id: string): Promise<Politician | null>;
  save(id: string | null, input: PoliticianInput): Promise<void>;
  /** プロフィールの列だけを更新する。氏名・スラッグ・当選日・所属には触れない（#2031） */
  saveProfile(id: string, profile: PoliticianProfileInput): Promise<void>;
  setResearchFundPublic(id: string, isPublic: boolean): Promise<void>;
  /** 非公開のまま「準備中」として一覧に出すときの添え書き。null で出さない、空文字で添え書きなし */
  setResearchFundComingSoonNote(id: string, note: string | null): Promise<void>;
  /** 顔写真の Storage 上のキーを付け替える。null で写真なし */
  setPhotoPath(id: string, photoPath: string | null): Promise<void>;
  delete(id: string): Promise<void>;
}
