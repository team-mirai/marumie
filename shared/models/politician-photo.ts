/**
 * 議員の顔写真（#1916）。公開サイトの議員カード・議員ページの見出しに出す。
 * 形式はファイルの先頭バイトで判定し、ブラウザが申告する MIME は信用しない。
 */

/** 上限。Vercel の関数が受け取れるリクエスト本体（4.5MB）に収まるようにする */
export const POLITICIAN_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export const POLITICIAN_PHOTO_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type PoliticianPhotoMime = keyof typeof POLITICIAN_PHOTO_TYPES;

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function detectMime(bytes: Uint8Array): PoliticianPhotoMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return "image/webp";
  return null;
}

export type PoliticianPhotoValidation =
  | { status: "valid"; mime: PoliticianPhotoMime }
  | { status: "invalid"; message: string };

export const PoliticianPhoto = {
  validate(bytes: Uint8Array): PoliticianPhotoValidation {
    if (!bytes.length) return { status: "invalid", message: "画像ファイルを選択してください" };
    if (bytes.length > POLITICIAN_PHOTO_MAX_BYTES)
      return { status: "invalid", message: "顔写真は3MB以下の画像にしてください" };
    const mime = detectMime(bytes);
    if (!mime)
      return { status: "invalid", message: "顔写真は JPEG・PNG・WebP の画像にしてください" };
    return { status: "valid", mime };
  },
  /** Storage 上のキー。差し替えのたびに別のキーにして、古い写真がキャッシュから出続けないようにする */
  buildPath(politicianId: string, mime: PoliticianPhotoMime, uniqueId: string) {
    return `politicians/${politicianId}/${uniqueId}.${POLITICIAN_PHOTO_TYPES[mime]}`;
  },
  /**
   * 政治団体の代表者の顔写真（#1917）のキー。形式・上限は議員の顔写真と同じで、同じバケットに置く
   */
  buildPoliticalOrganizationPath(
    organizationId: string,
    mime: PoliticianPhotoMime,
    uniqueId: string,
  ) {
    return `political-organizations/${organizationId}/${uniqueId}.${POLITICIAN_PHOTO_TYPES[mime]}`;
  },
};
