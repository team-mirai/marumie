/** 見出しカードに並べる SNS の種類。URL から判定する */
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

export type ProfileLink =
  | { type: "site"; url: string; label: string }
  | { type: "sns"; url: string; label: string; kind: SnsKind };

const SNS_PATTERNS: [RegExp, SnsKind][] = [
  [/x\.com/, "X"],
  [/instagram/, "Instagram"],
  [/tiktok/, "TikTok"],
  [/youtube/, "YouTube"],
  [/threads\./, "Threads"],
  [/note\.com/, "note"],
  [/spotify/, "Spotify"],
  [/line\.me/, "LINE"],
  [/facebook/, "Facebook"],
];

export function detectSnsKind(url: string): SnsKind | null {
  return SNS_PATTERNS.find(([pattern]) => pattern.test(url))?.[1] ?? null;
}

/**
 * 公式サイトと SNS の URL を、見出しカードに並べる順（公式サイト → SNS を登録順）のリンクにする。
 * 種類が分からない SNS の URL は、v8 のデザインどおり公式サイトのリンクとして扱う。
 */
export function buildProfileLinks(websiteUrl: string | null, snsUrls: string[]): ProfileLink[] {
  const links: ProfileLink[] = [...(websiteUrl ? [websiteUrl] : []), ...snsUrls].map((url) => {
    const kind = detectSnsKind(url);
    return kind
      ? { type: "sns", url, label: kind, kind }
      : { type: "site", url, label: "公式サイト" };
  });
  return [
    ...links.filter((link) => link.type === "site"),
    ...links.filter((link) => link.type === "sns"),
  ];
}
