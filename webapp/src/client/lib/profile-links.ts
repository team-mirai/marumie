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

/** サービスのドメイン。URL のホスト名がこれと一致するか、そのサブドメインなら該当する SNS とみなす */
const SNS_DOMAINS: [string[], SnsKind][] = [
  [["x.com"], "X"],
  [["instagram.com"], "Instagram"],
  [["tiktok.com"], "TikTok"],
  [["youtube.com"], "YouTube"],
  [["threads.com", "threads.net"], "Threads"],
  [["note.com"], "note"],
  [["spotify.com"], "Spotify"],
  [["line.me"], "LINE"],
  [["facebook.com"], "Facebook"],
];

export function detectSnsKind(url: string): SnsKind | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  return (
    SNS_DOMAINS.find(([domains]) =>
      domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)),
    )?.[1] ?? null
  );
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
