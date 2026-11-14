"use client";
import "client-only";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HeaderMegaMenu from "@/client/components/layout/header/HeaderMegaMenu";
import HeaderSpMenu, { ExternalIcon } from "@/client/components/layout/header/HeaderSpMenu";
import {
  ABOUT_HREF,
  buildOrganizationMenuItems,
  buildPoliticianMenuItems,
  DATA_NOTES_HREF,
  FAQ_URL,
  getCurrentNavKey,
  getHeaderNavItems,
  isMenuNavKey,
  parseHeaderPath,
} from "@/client/lib/header-navigation";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import type { OrganizationsResponse } from "@/types/organization";

interface HeaderClientProps {
  organizations: OrganizationsResponse;
  /** 年度ごとの、調研費を公開している議員の一覧 */
  politiciansByYear: Record<number, ResearchFundPoliticianEntry[]>;
}

const MEGA_MENU_ID = "header-mega-menu";
const SP_MENU_ID = "header-sp-menu";

const NAV_ITEM_CLASS =
  "inline-flex h-11 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-sm font-bold text-black decoration-2 underline-offset-8 transition-colors hover:bg-[#F3F7F6] cursor-pointer";

export default function HeaderClient({ organizations, politiciansByYear }: HeaderClientProps) {
  const pathname = usePathname();
  const current = parseHeaderPath(pathname);
  const currentNavKey = getCurrentNavKey(current);
  const organizationItems = buildOrganizationMenuItems(organizations.organizations, current);
  const politicianItems = buildPoliticianMenuItems(politiciansByYear, current);
  const navItems = getHeaderNavItems(politicianItems.length > 0);

  // PC のメガメニュー
  const [megaMenu, setMegaMenu] = useState<"pf" | "rf" | null>(null);
  // SP のメニュー。spStep は「政党・政治団体」「調研費」の次の段階
  const [isSpMenuOpen, setIsSpMenuOpen] = useState(false);
  const [spStep, setSpStep] = useState<"pf" | "rf" | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const megaTriggerRefs = useRef<Partial<Record<"pf" | "rf", HTMLButtonElement | null>>>({});
  const spTriggerRef = useRef<HTMLButtonElement>(null);

  const closeMenus = () => {
    setMegaMenu(null);
    setIsSpMenuOpen(false);
    setSpStep(null);
  };

  const isAnyMenuOpen = megaMenu !== null || isSpMenuOpen;

  // メニューの外側のクリックと Esc で閉じる。Esc では開いたボタンにフォーカスを戻す
  useEffect(() => {
    if (!isAnyMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && headerRef.current?.contains(event.target)) return;
      closeMenus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = megaMenu ? megaTriggerRefs.current[megaMenu] : spTriggerRef.current;
      closeMenus();
      trigger?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAnyMenuOpen, megaMenu]);

  return (
    <>
      {megaMenu && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 hidden bg-[rgba(17,24,39,0.2)] min-[1080px]:block"
        />
      )}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-40 px-2.5 py-3 xl:px-6 xl:py-4"
      >
        <div className="bg-white rounded-[20px] px-3 py-3 xl:px-6 xl:py-0 relative z-10">
          <div className="flex items-center gap-2 xl:h-16">
            {/* Logo and Title Section */}
            <Link
              href="/"
              onClick={closeMenus}
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

            <div className="flex flex-1 items-center justify-end h-12 min-w-0">
              {/* PC のナビ（デザイン v8 の B 案・5項目） */}
              <nav
                className="hidden min-[1080px]:flex items-center gap-1"
                aria-label="メインナビゲーション"
              >
                {navItems.map((item) => {
                  const isCurrent = currentNavKey === item.key;
                  const currentClass = isCurrent ? "underline" : "";
                  if (isMenuNavKey(item.key)) {
                    const key = item.key;
                    const isOpen = megaMenu === key;
                    return (
                      <button
                        key={key}
                        ref={(element) => {
                          megaTriggerRefs.current[key] = element;
                        }}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? MEGA_MENU_ID : undefined}
                        aria-current={isCurrent ? "page" : undefined}
                        onClick={() => setMegaMenu(isOpen ? null : key)}
                        className={`${NAV_ITEM_CLASS} ${currentClass} ${isOpen ? "bg-[#E2F6F3]" : ""}`}
                      >
                        {item.label}
                        <Image
                          src="/icons/icon-chevron-down.svg"
                          alt=""
                          width={16}
                          height={16}
                          className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    );
                  }
                  if (item.key === "faq") {
                    return (
                      <a
                        key={item.key}
                        href={FAQ_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${item.label}（別タブで開きます）`}
                        onClick={closeMenus}
                        className={NAV_ITEM_CLASS}
                      >
                        {item.label}
                        <ExternalIcon className="ml-1 size-[13px] shrink-0 opacity-75" />
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={item.key}
                      href={item.key === "about" ? ABOUT_HREF : DATA_NOTES_HREF}
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={closeMenus}
                      className={`${NAV_ITEM_CLASS} ${currentClass}`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* SP のメニューボタン */}
              <button
                ref={spTriggerRef}
                type="button"
                aria-label="メニュー"
                aria-expanded={isSpMenuOpen}
                aria-controls={isSpMenuOpen ? SP_MENU_ID : undefined}
                onClick={() => {
                  setIsSpMenuOpen(!isSpMenuOpen);
                  setSpStep(null);
                }}
                className="flex min-[1080px]:hidden size-11 items-center justify-center rounded-lg cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    d={isSpMenuOpen ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {megaMenu && (
            <div className="hidden min-[1080px]:block">
              <HeaderMegaMenu
                id={MEGA_MENU_ID}
                menu={megaMenu}
                organizations={organizationItems}
                politicians={politicianItems}
                onNavigate={closeMenus}
              />
            </div>
          )}
          {isSpMenuOpen && (
            <div className="min-[1080px]:hidden">
              <HeaderSpMenu
                id={SP_MENU_ID}
                navItems={navItems}
                step={spStep}
                onStepChange={setSpStep}
                organizations={organizationItems}
                politicians={politicianItems}
                onNavigate={closeMenus}
              />
            </div>
          )}
        </div>
      </header>
    </>
  );
}
