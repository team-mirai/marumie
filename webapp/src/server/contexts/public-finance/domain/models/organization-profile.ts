/** 政治団体ページの見出しカードに出す、団体のプロフィール（#1917 で admin から登録する） */
export interface OrganizationProfile {
  /** 公式サイトの URL。未登録なら null */
  websiteUrl: string | null;
  /** SNS の URL（表示順どおり） */
  snsUrls: string[];
  /**
   * 代表者の顔写真の版。写真を差し替えるたびに変わるので、写真の URL に付けてブラウザのキャッシュを切り替える。
   * 写真が未登録なら null
   */
  photoVersion: string | null;
}

export const OrganizationProfile = {
  /** Storage 上のキー（例: political-organizations/1/abc.jpg）の末尾のファイル名を版にする */
  photoVersion(photoPath: string | null): string | null {
    if (!photoPath) return null;
    const fileName = photoPath.split("/").pop() ?? "";
    return fileName.replace(/\.[^.]*$/, "") || null;
  },
};
