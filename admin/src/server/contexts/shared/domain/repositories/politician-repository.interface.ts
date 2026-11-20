import "server-only";
import type {
  Politician,
  PoliticianInput,
  PoliticianProfileInput,
  PoliticianResearchFundPublication,
} from "@/shared/models/politician";

export interface IPoliticianRepository {
  findAll(): Promise<Politician[]>;
  findById(id: string): Promise<Politician | null>;
  save(id: string | null, input: PoliticianInput): Promise<void>;
  /** プロフィールの列だけを更新する。氏名・スラッグ・当選日・所属には触れない（#2031） */
  saveProfile(id: string, profile: PoliticianProfileInput): Promise<void>;
  /** 公開するかと「準備中」の添え書きを1回の更新で書く（値は Politician.setResearchFundPublic で決めたもの） */
  setResearchFundPublic(id: string, publication: PoliticianResearchFundPublication): Promise<void>;
  /** 「準備中」の添え書きだけを書く（値は Politician.setResearchFundComingSoonNote で決めたもの） */
  setResearchFundComingSoonNote(id: string, note: string | null): Promise<void>;
  /** 顔写真の Storage 上のキーを付け替える。null で写真なし */
  setPhotoPath(id: string, photoPath: string | null): Promise<void>;
  delete(id: string): Promise<void>;
}
