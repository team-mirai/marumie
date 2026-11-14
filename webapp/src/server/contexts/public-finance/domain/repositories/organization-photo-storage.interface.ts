export interface IOrganizationPhotoStorage {
  /** 非公開バケットの代表者の顔写真を、期限つきの署名URLで配信する。 */
  createSignedUrl(photoPath: string, expiresIn: number): Promise<string>;
}
