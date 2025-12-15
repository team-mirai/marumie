"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// テキストリンク集
const getTextLinks = (currentSlug: string) => [
  {
    label: "TOP",
    href: `/o/${currentSlug}/#top`,
  },
  {
    label: "収支の流れ",
    href: `/o/${currentSlug}/#cash-flow`,
  },
  {
    label: "月ごとの収支推移",
    href: `/o/${currentSlug}/#monthly-trends`,
  },
  {
    label: "貸借対照表",
    href: `/o/${currentSlug}/#balance-sheet`,
  },
  {
    label: "すべての出入金",
    href: `/o/${currentSlug}/#transactions`,
  },
  {
    label: "データについて",
    href: `/o/${currentSlug}/#explanation`,
  },
  {
    label: "チームみらいについて",
    href: `/o/${currentSlug}/#about`,
  },
  {
    label: "寄附で応援する",
    href: "https://team-mir.ai/support/donation",
  },
  {
    label: "チームみらい党員になる",
    href: "https://team-mir.ai/support/membership",
  },
  {
    label: "よくあるご質問",
    href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
  },
  {
    label: "利用規約",
    href: "/terms",
  },
  {
    label: "プライバシーポリシー",
    href: "/privacy",
  },
];

// SNSリンク集
const socialLinks = [
  {
    name: "webサイト",
    href: "https://team-mir.ai/",
    icon: "icon-web.svg",
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@team_mirai_jp",
    icon: "icon-yt.svg",
  },
  {
    name: "LINE",
    href: "https://line.me/R/ti/p/@465hhyop?oat__id=5529589",
    icon: "icon-line.svg",
  },
  {
    name: "X",
    mainText: "X",
    subText: "（旧Twitter）",
    href: "https://x.com/team_mirai_jp",
    icon: "icon-x.svg",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/team_mirai_jp/",
    icon: "icon-insta.svg",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/teammirai.official",
    icon: "icon-fb.svg",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@annotakahiro2024",
    icon: "icon-tiktok.svg",
  },
  {
    name: "GitHub",
    href: "https://github.com/team-mirai-volunteer/marumie",
    icon: "icon-github.svg",
  },
];

export default function Footer() {
  const pathname = usePathname();

  // 現在のslugを取得（/o/[slug]/... の形式の場合、なければdefaultを使用）
  const currentSlug = pathname.startsWith("/o/") ? pathname.split("/")[2] : "team-mirai";

  const textLinks = getTextLinks(currentSlug);

  const renderTextLink = (link: (typeof textLinks)[0]) => {
    const isExternal = link.href.startsWith("http");
    return (
      <Link
        key={link.href}
        href={link.href}
        className="text-gray-800 text-sm font-bold leading-[1.36em] hover:opacity-80 transition-opacity"
        {...(isExternal && { target: "_blank", rel: "noopener" })}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <footer className="w-full bg-gradient-to-tl from-[#BCECD3] to-[#64D8C6] px-8 lg:px-[117px] py-12 lg:pt-12 lg:pb-9">
      <div className="max-w-[1278px] mx-auto flex flex-col items-center gap-9 lg:gap-10">
        {/* Logo - PC版のみ表示 */}
        <div className="hidden lg:block w-[150px] h-[127px] relative">
          <Image
            src="/logos/team-mirai-logo.svg"
            alt="Team Mirai Logo"
            fill
            className="object-contain"
          />
        </div>

        {/* Text Links */}
        {/* SP: 2カラム縦並び / PC: 2行横並び */}
        <div className="flex flex-col gap-4 items-center">
          {/* SP: 2カラム / PC: 1行目（最初の7つ）*/}
          <div className="flex gap-[48px] lg:gap-8">
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-8">
              {textLinks.slice(0, 7).map(renderTextLink)}
            </div>
            <div className="flex flex-col gap-3 lg:hidden">
              {textLinks.slice(7).map(renderTextLink)}
            </div>
          </div>

          {/* PC: 2行目（残り）*/}
          <div className="hidden lg:flex gap-8">{textLinks.slice(7).map(renderTextLink)}</div>
        </div>

        {/* SNS Icons */}
        <div className="w-[299px] lg:w-auto">
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener"
                className="flex lg:flex-row items-center gap-1 lg:gap-1 hover:opacity-80 transition-opacity"
                aria-label={social.name}
              >
                <div className="w-12 h-12 lg:w-7 lg:h-7 rounded-full flex items-center justify-center relative bg-white">
                  <Image
                    src={`/images/social-icons/${social.icon}`}
                    alt={social.name}
                    width={48}
                    height={48}
                    className="lg:w-7 lg:h-7"
                  />
                </div>
                {/* PC版のみラベル表示 */}
                <span className="hidden lg:block text-base font-bold text-black">
                  {social.mainText || social.name}
                  {social.subText && (
                    <span className="text-xs ml-1 opacity-80">{social.subText}</span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Logo - SP版のみ表示 */}
        <div className="block lg:hidden w-[150px] h-[127px] relative">
          <Image
            src="/logos/team-mirai-logo.svg"
            alt="Team Mirai Logo"
            fill
            className="object-contain"
          />
        </div>

        {/* Copyright */}
        <div className="w-full text-center">
          <p className="text-gray-600 text-sm leading-[1.25em]">
            © 2025 Team Mirai All rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
