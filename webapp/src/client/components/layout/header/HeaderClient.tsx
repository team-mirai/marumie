"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OrganizationYearSheet from "@/client/components/layout/header/OrganizationYearSheet";
import { getHeaderNavigation } from "@/client/lib/header-navigation";
import type { OrganizationsResponse } from "@/types/organization";

const DEFAULT_YEAR = 2026;
const AVAILABLE_YEARS = [2025, 2026];

interface HeaderClientProps {
  organizations: OrganizationsResponse;
}

export default function HeaderClient({ organizations }: HeaderClientProps) {
  const pathname = usePathname();

  // 現在のslugとyearを取得（/o/[slug]/[year]/... または /p/[slug]/[year]/... の形式の場合）
  const pathSegments = pathname.split("/");
  const rootSegment = pathSegments[1];
  const isPoliticianPage = rootSegment === "p";
  const isPageWithSlug = rootSegment === "o" || isPoliticianPage;
  const slugFromPath = isPageWithSlug ? pathSegments[2] : null;
  const yearFromPath = isPageWithSlug && pathSegments[3] ? parseInt(pathSegments[3], 10) : null;

  const currentYear =
    yearFromPath && AVAILABLE_YEARS.includes(yearFromPath) ? yearFromPath : DEFAULT_YEAR;

  // ナビとロゴは今いるページ（議員ページならそのページ自身）を指す。
  const navSlug = slugFromPath ?? organizations.default;
  const navigation = navSlug
    ? getHeaderNavigation(isPoliticianPage ? "politician" : "organization", navSlug, currentYear)
    : null;
  const logoHref = navigation?.homeHref ?? "/";
  const navigationItems = navigation?.items ?? [];

  // 団体セレクタは政治団体しか扱えないので、議員ページでは既定の団体を初期値にする（2グループ化は #1361）。
  const currentOrganizationSlug = isPoliticianPage
    ? organizations.default
    : (slugFromPath ?? organizations.default);

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
              {navigationItems.map((item) => {
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
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center w-full max-w-[217px] min-w-0 h-12 flex-shrink">
              <OrganizationYearSheet
                organizations={organizations}
                initialSlug={currentOrganizationSlug ?? undefined}
                initialYear={currentYear}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
