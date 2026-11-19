export interface ReceiptStorage {
  /** 非公開バケットの領収書を、期限つきの署名URLで配信する。 */
  createSignedUrl(storageKey: string, expiresIn: number): Promise<string>;
}
