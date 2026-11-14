/** 議員カードにアイコンで出す SNS の種類 */
export type SnsKind =
  | "X"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "Threads"
  | "note"
  | "Spotify"
  | "LINE"
  | "Facebook";

const HOST_KINDS: [RegExp, SnsKind][] = [
  [/(^|\.)(x|twitter)\.com$/, "X"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)threads\.(com|net)$/, "Threads"],
  [/(^|\.)note\.com$/, "note"],
  [/(^|\.)spotify\.com$/, "Spotify"],
  [/(^|\.)line\.me$/, "LINE"],
  [/(^|\.)facebook\.com$/, "Facebook"],
];

/** URL のホスト名から SNS の種類を判定する。どれにも当たらなければ null（汎用のリンクのアイコンで出す） */
export function snsKindOf(url: string): SnsKind | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return HOST_KINDS.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}
