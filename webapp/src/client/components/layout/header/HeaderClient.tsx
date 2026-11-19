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
/** SP のメニューを画面全体に広げ、開閉の動きを付ける幅（デザイン v9 の SP） */
const SP_FULLSCREEN_QUERY = "(max-width: 640px)";
/** 閉じる動き（globals.css の sp-menu-lift）を見せてから閉じるまでの時間 */
const SP_MENU_CLOSE_MS = 330;

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
  // SP のメニュー。isSpMenuClosing は閉じる動きを見せている間
  const [isSpMenuOpen, setIsSpMenuOpen] = useState(false);
  const [isSpMenuClosing, setIsSpMenuClosing] = useState(false);
  const spCloseTimerRef = useRef<number | null>(null);

  const headerRef = useRef<HTMLElement>(null);
  const megaTriggerRefs = useRef<Partial<Record<"pf" | "rf", HTMLButtonElement | null>>>({});
  const spTriggerRef = useRef<HTMLButtonElement>(null);

  const clearSpCloseTimer = () => {
    if (spCloseTimerRef.current === null) return;
    window.clearTimeout(spCloseTimerRef.current);
    spCloseTimerRef.current = null;
  };

  /** ページを移るときなど、動きを付けずにすぐ閉じる */
  const closeMenus = () => {
    clearSpCloseTimer();
    setMegaMenu(null);
    setIsSpMenuOpen(false);
    setIsSpMenuClosing(false);
  };

  /** SP のメニューを、開くときの逆の動き（中身が消え、幕が巻き上がる）を見せてから閉じる。動きを減らす設定ならすぐ閉じる */
  const closeSpMenuAnimated = () => {
    if (spCloseTimerRef.current !== null) return;
    const shouldAnimate =
      window.matchMedia(SP_FULLSCREEN_QUERY).matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shouldAnimate) {
      closeMenus();
      return;
    }
    setIsSpMenuClosing(true);
    spCloseTimerRef.current = window.setTimeout(closeMenus, SP_MENU_CLOSE_MS);
  };

  const isAnyMenuOpen = megaMenu !== null || isSpMenuOpen;

  /** SP のメニューが画面全体を覆っている間は、Tab のフォーカスをヘッダー（閉じるボタンとメニュー）の中で循環させる */
  const trapSpMenuFocus = (event: KeyboardEvent) => {
    const header = headerRef.current;
    if (!header || !window.matchMedia(SP_FULLSCREEN_QUERY).matches) return;
    // 隠れている PC のナビなどを除き、いま見えているものだけを対象にする
    const focusables = Array.from(
      header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    const isInside = active instanceof Node && header.contains(active);
    if (event.shiftKey && (!isInside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!isInside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  };

  // メニューの外側のクリックと Esc で閉じる。Esc では開いたボタンにフォーカスを戻す
  useEffect(() => {
    if (!isAnyMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && headerRef.current?.contains(event.target)) return;
      closeMenus();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && megaMenu === null) {
        trapSpMenuFocus(event);
        return;
      }
      if (event.key !== "Escape") return;
      if (megaMenu) {
        const trigger = megaTriggerRefs.current[megaMenu];
        closeMenus();
        trigger?.focus();
        return;
      }
      closeSpMenuAnimated();
      spTriggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAnyMenuOpen, megaMenu]);

  // SP のメニューが画面全体を覆っている間は、後ろのページをスクロールさせない
  useEffect(() => {
    if (!isSpMenuOpen) return;
    const query = window.matchMedia(SP_FULLSCREEN_QUERY);
    const root = document.documentElement;
    const apply = () => {
      root.style.overflow = query.matches ? "hidden" : "";
    };
    apply();
    query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      root.style.overflow = "";
    };
  }, [isSpMenuOpen]);

  useEffect(() => clearSpCloseTimer, []);

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
        data-sp-menu={isSpMenuClosing ? "closing" : isSpMenuOpen ? "open" : undefined}
        className={`fixed top-0 left-0 right-0 z-40 px-2.5 py-3 xl:px-6 xl:py-4 ${
          // SP のメニューを開いたら画面全体を覆う。ヘッダーの行は白、その下は薄いグリーン
          isSpMenuOpen ? "max-[640px]:bottom-0 max-[640px]:p-0" : ""
        }`}
      >
        <div
          className={`bg-white rounded-[20px] px-3 py-3 xl:px-6 xl:py-0 relative z-10 ${
            isSpMenuOpen
              ? "max-[640px]:flex max-[640px]:h-full max-[640px]:flex-col max-[640px]:rounded-none max-[640px]:bg-transparent max-[640px]:p-0"
              : ""
          }`}
        >
          {/* SP でメニューを開いても、ロゴ・サービス名・メニューボタンが動かないよう、
              閉じているとき（header の px-2.5 py-3 ＋ 白い枠の px-3 py-3）と同じ位置に置く */}
          <div
            className={`flex items-center gap-2 xl:h-16 ${
              isSpMenuOpen
                ? "max-[640px]:flex-none max-[640px]:bg-white max-[640px]:px-[1.375rem] max-[640px]:pt-6 max-[640px]:pb-3 max-[640px]:shadow-[0_1px_0_#DCE4E1]"
                : ""
            }`}
          >
            {/* Logo and Title Section */}
            <Link
              href="/"
              onClick={(event) => {
                closeMenus();
                // トップを表示中は同じ URL への遷移になり、Next.js はスクロール位置を戻さないので、自分で先頭へ戻す
                // 修飾キー付き（新しいタブで開くなど）はブラウザに任せる
                const isPlainClick =
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey;
                const isOnTop =
                  window.location.pathname === "/" &&
                  !window.location.search &&
                  !window.location.hash;
                if (isPlainClick && isOnTop) {
                  event.preventDefault();
                  window.scrollTo({ top: 0 });
                }
              }}
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

              {/* サービス名のロゴ（デザイン v9）。SP でも PC 用のロゴを幅に合わせて縮めて1行で出す */}
              <Image
                src="/logos/service-logo-pc-marumie.svg"
                alt="みらいまる見え政治資金"
                width={187}
                height={26}
                className="block h-[22px] w-auto max-w-[min(240px,calc(100vw-120px))] object-contain object-left xl:h-7 xl:max-w-[300px]"
                priority
              />
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
                aria-label={isSpMenuOpen ? "メニューを閉じる" : "メニュー"}
                aria-expanded={isSpMenuOpen}
                aria-controls={isSpMenuOpen ? SP_MENU_ID : undefined}
                onClick={() => {
                  if (isSpMenuOpen) {
                    closeSpMenuAnimated();
                    return;
                  }
                  // PC 幅で開いたメガメニューが隠れたまま残っていると、Tab の循環と Esc が SP のメニューに効かないので閉じておく
                  setMegaMenu(null);
                  setIsSpMenuOpen(true);
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
              {/* 開いたまま別のメニューに切り替えたら作り直し、幕が下りる動きを初めから流す */}
              <HeaderMegaMenu
                key={megaMenu}
                id={MEGA_MENU_ID}
                menu={megaMenu}
                organizations={organizationItems}
                politicians={politicianItems}
                onNavigate={closeMenus}
              />
            </div>
          )}
          {isSpMenuOpen && (
            <div className="sp-menu-clip min-[1080px]:hidden max-[640px]:flex max-[640px]:min-h-0 max-[640px]:flex-1 max-[640px]:flex-col">
              <HeaderSpMenu
                id={SP_MENU_ID}
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
