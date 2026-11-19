/**
 * 公開サイトに出す公式サイト・SNS の URL（議員 #1916 と政治団体 #1917 で共通）。
 */

/** SNS の URL を登録できる上限。v8 の表示例で 7 件なので余裕をもたせる */
export const MAX_SNS_URLS = 20;
const MAX_URL_LENGTH = 2048;

export function isHttpUrl(value: string) {
  if (value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch {
    return false;
  }
}
