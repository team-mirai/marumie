export interface IProfilePhotoStorage {
  /** 非公開バケットの顔写真を、期限つきの署名URLで配信する。 */
  createSignedUrl(path: string, expiresIn: number): Promise<string>;
}
