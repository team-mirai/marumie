import type { ReactNode } from "react";
import type { ProfileLink, SnsKind } from "@/client/lib/profile-links";

/** SNS のアイコン（24×24 の図形）。v8 のデザインの図形をそのまま使う */
const SNS_GLYPHS: Record<SnsKind, ReactNode> = {
  X: <path d="M4.5 4h4l3.6 5 4.3-5h1.8l-5.3 6.2L19.5 20h-4l-3.9-5.4L7 20H5.2l5.6-6.5z" />,
  YouTube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="M10.2 9.3v5.4l4.6-2.7z" fill="#fff" />
    </>
  ),
  Instagram: (
    <>
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.6" cy="7.4" r="1.2" />
    </>
  ),
  TikTok: (
    <path d="M13.6 4h2.7c.2 1.9 1.5 3.2 3.3 3.4v2.7a6 6 0 0 1-3.3-1v6.2a5.1 5.1 0 1 1-4.4-5v2.8a2.4 2.4 0 1 0 1.7 2.3z" />
  ),
  Threads: (
    <path d="M16.2 11.3c-.3-2.4-1.9-3.6-4.1-3.6-1.6 0-2.9.7-3.6 1.9l1.5 1c.5-.8 1.2-1.1 2.1-1.1 1.1 0 1.9.6 2.1 1.8a8 8 0 0 0-2-.2c-2.3 0-3.8 1.2-3.8 2.9 0 1.6 1.3 2.8 3.2 2.8 2 0 3.3-1.2 3.6-3.2.6.4.9 1 .9 1.8 0 1.9-1.8 3.4-4.3 3.4-3.2 0-5.2-2.3-5.2-5.8s2-5.9 5.2-5.9c2.4 0 4.1 1.1 4.8 3.1l1.7-.6C17.7 5.6 15.4 4.2 12 4.2 7.6 4.2 5 7.2 5 12s2.6 7.8 7 7.8c3.5 0 6-2.1 6-5 0-1.5-.7-2.7-1.8-3.5zm-4.4 3.8c-.9 0-1.3-.5-1.3-1 0-.7.7-1.1 1.9-1.1.6 0 1.1 0 1.6.2-.2 1.3-1 1.9-2.2 1.9z" />
  ),
  note: (
    <path d="M6.5 18V6.5h7.2c2.3 0 3.8 1.4 3.8 3.7V18h-2.6v-7.3c0-1.1-.6-1.8-1.7-1.8H9.1V18z" />
  ),
  Spotify: (
    <path
      d="M6.5 9.4c3.8-1.1 7.9-.8 11 1M7.2 12.6c3.1-.9 6.3-.6 8.9.9M7.9 15.6c2.4-.6 4.7-.4 6.7.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  ),
  LINE: (
    <path d="M12 5c-4.4 0-8 2.8-8 6.3 0 3.1 2.9 5.7 6.7 6.2l-.4 2.1c-.1.4.3.6.6.4l3.5-2.6c3.2-.7 5.6-3.2 5.6-6.1C20 7.8 16.4 5 12 5z" />
  ),
  Facebook: (
    <path d="M13.4 20v-6.6h2.3l.4-2.7h-2.7V9c0-.8.3-1.3 1.4-1.3h1.4V5.3a19 19 0 0 0-2.1-.1c-2.1 0-3.6 1.3-3.6 3.6v1.9H8.2v2.7h2.3V20z" />
  ),
};

interface ProfileLinksProps {
  /** 読み上げで「（名前）の X」のように添える持ち主の名前 */
  ownerName: string;
  links: ProfileLink[];
}

/** 見出しカードの名前の下に並べる、公式サイトのリンクと SNS のアイコン。どれも別タブで開く。 */
export default function ProfileLinks({ ownerName, links }: ProfileLinksProps) {
  if (links.length === 0) return null;

  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {links.map((link) => (
        <li key={`${link.type}:${link.url}`} className="flex">
          {link.type === "site" ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ownerName}の${link.label}（別タブで開きます）`}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-white pl-3 pr-[11px] text-[12px] font-bold text-[#0B0F0E] shadow-[inset_0_0_0_1px_#C9D3CF] transition-colors hover:bg-[#E2F6F3] hover:shadow-[inset_0_0_0_1px_#0F8472]"
            >
              {link.label}
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          ) : (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#0B0F0E] shadow-[inset_0_0_0_1px_#C9D3CF] transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-[#E2F6F3] hover:shadow-[inset_0_0_0_1px_#0F8472]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                {SNS_GLYPHS[link.kind]}
              </svg>
              <span className="sr-only">{`${ownerName}の${link.label}（別タブで開きます）`}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
