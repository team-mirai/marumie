export interface PoliticianPhotoStorage {
  /** 非公開バケットの顔写真を、期限つきの署名URLで配信する。 */
  createSignedUrl(photoPath: string, expiresIn: number): Promise<string>;
}
