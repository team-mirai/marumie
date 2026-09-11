import type {
  PublicationSnapshot,
  PublishableEntry,
} from "@/server/contexts/research-fund/domain/models/publication";

export interface PublicationRepository {
  /** 公開画面の materials。帳簿が無ければ null。 */
  snapshot(bookId: string): Promise<PublicationSnapshot | null>;
  /** 指定した仕訳の現在の状態と、帳簿の公開範囲。帳簿が無ければ null。 */
  pending(
    bookId: string,
    ids: readonly string[],
  ): Promise<{ entries: PublishableEntry[]; publishedThrough: string | null } | null>;
  /** 確認済の仕訳だけを published にし、公開範囲を更新する。 */
  publish(bookId: string, ids: readonly string[], publishedThrough: string | null): Promise<void>;
}
