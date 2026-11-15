/** 顔写真の配信可否を決めるための、議員の公開設定と写真のキー。 */
export interface PoliticianPhotoSource {
  /** 議員が調研費を「公開する」設定か。false ならプレビュー URL からだけ配信する */
  isPublic: boolean;
  /** 顔写真の Storage 上のキー。未登録なら null */
  photoPath: string | null;
}

export interface PoliticianPhotoRepository {
  /** slug の議員の公開設定と写真のキー。議員がいなければ null */
  findPhoto(slug: string): Promise<PoliticianPhotoSource | null>;
}
