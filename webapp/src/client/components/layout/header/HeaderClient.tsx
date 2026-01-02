"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrganizationSelector from "./OrganizationSelector";
import type { OrganizationsResponse } from "@/types/organization";

const getNavigationItems = (currentSlug: string) => [
  { href: `/o/${currentSlug}/`, label: "トップ", desktopLabel: null },
  {
    href: `/o/${currentSlug}/#cash-flow`,
    label: "チームみらいの収支の流れ",
    desktopLabel: "収支の流れ",
  },
  {
    href: `/o/${currentSlug}/#monthly-trends`,
    label: "１年間の収支推移",
    desktopLabel: "1年間の推移",
  },
  {
    href: `/o/${currentSlug}/#balance-sheet`,
    label: "貸借対照表",
    desktopLabel: "貸借対照表",
  },
  {
    href: `/o/${currentSlug}/#transactions`,
    label: "すべての出入金",
    desktopLabel: "すべての出入金",
  },
  {
    href: `/o/${currentSlug}/#explanation`,
    label: "データについて",
    desktopLabel: "データについて",
  },
  {
    href: "https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c",
    label: "よくあるご質問",
    desktopLabel: "よくあるご質問",
  },
];

interface HeaderClientProps {
  organizations: OrganizationsResponse;
}

export default function HeaderClient({ organizations }: HeaderClientProps) {
  const pathname = usePathname();

  // 現在のslugを取得（/o/[slug]/... の形式の場合、なければdefaultを使用）
  const slugFromPath = pathname.startsWith("/o/") ? pathname.split("/")[2] : null;
  const currentSlug = slugFromPath ?? organizations.default;
  const logoHref = currentSlug ? `/o/${currentSlug}/` : "/";
  const navigationItems = currentSlug ? getNavigationItems(currentSlug) : [];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-2.5 py-3 xl:px-6 xl:py-4">
      {/* Main Header Container with rounded background */}
      <div className="bg-white rounded-[20px] px-3 py-3 xl:px-6 xl:py-0 relative z-10">
        <div className="flex items-center gap-2 xl:h-16">
          {/* Logo and Title Section */}
          <Link
            href={logoHref}
            className="flex items-center gap-2 xl:gap-4 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {/* Logo */}
            <div className="flex items-center">
              <div className="w-14 h-12 xl:w-12 xl:h-11 relative">
                {/* Team Mirai Logo */}
                <Image
                  src="/logos/team-mirai-logo.svg"
                  alt="Team Mirai Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Title and Subtitle - Mobile: Vertical Stack, Desktop: Horizontal with baseline alignment */}
            <div className="flex flex-col gap-1.5 2xl:flex-row 2xl:items-end 2xl:gap-2 min-w-0">
              {/* SP用ロゴ (xl未満で表示) */}
              <div className="h-[45px] relative w-[126px] xl:hidden">
                <Image
                  src="/logos/service-logo-sp.svg"
                  alt="みらいまる見え政治資金"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              {/* PC用ロゴ (xl以上で表示) */}
              <div className="hidden xl:block h-7 relative w-[300px]">
                <Image
                  src="/logos/service-logo-pc.svg"
                  alt="みらいまる見え政治資金"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>
          </Link>

          {/* Navigation Menu + Organization Selector */}
          <div className="flex items-center gap-8 flex-1 justify-end h-12 min-w-0">
            <nav
              className="hidden lg:flex items-center gap-6 flex-shrink-0"
              aria-label="メインナビゲーション"
            >
              {navigationItems
                .filter((item) => item.desktopLabel)
                .map((item) => {
                  const isExternal = item.href.startsWith("http");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-bold text-black hover:text-teal-600 transition-colors whitespace-nowrap cursor-pointer"
                      {...(isExternal && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      {item.desktopLabel}
                    </Link>
                  );
                })}
            </nav>
            <div className="flex items-center w-full max-w-[217px] min-w-0 h-12 flex-shrink">
              <OrganizationSelector
                organizations={organizations}
                initialSlug={currentSlug ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
