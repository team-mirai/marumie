import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import PoliticianInitialAvatar from "@/client/components/layout/header/PoliticianInitialAvatar";
import {
  ABOUT_HREF,
  DATA_NOTES_HREF,
  FAQ_URL,
  type HeaderNavItem,
  type HeaderNavKey,
  type HeaderOrganizationMenuItem,
  type HeaderPoliticianMenuItem,
  isMenuNavKey,
} from "@/client/lib/header-navigation";

interface HeaderSpMenuProps {
  id: string;
  navItems: readonly HeaderNavItem[];
  /** 次の段階を開いている項目。null なら項目の一覧 */
  step: "pf" | "rf" | null;
  onStepChange: (step: "pf" | "rf" | null) => void;
  organizations: HeaderOrganizationMenuItem[];
  politicians: HeaderPoliticianMenuItem[];
  onNavigate: () => void;
}

const ROW_CLASS =
  "flex min-h-14 items-center justify-between border-b border-[#F3F4F6] px-3 text-lg font-bold text-[#111827]";
const LINK_ROW_CLASS =
  "flex min-h-[52px] items-center gap-3 border-b border-[#F3F4F6] px-3 text-base font-bold text-[#111827]";

const DIRECT_HREFS: Record<Exclude<HeaderNavKey, "pf" | "rf" | "faq">, string> = {
  about: ABOUT_HREF,
  data: DATA_NOTES_HREF,
};

/** SP のメニューボタンで開くメニュー（デザイン v8 の仮のメニュー）。 */
export default function HeaderSpMenu({
  id,
  navItems,
  step,
  onStepChange,
  organizations,
  politicians,
  onNavigate,
}: HeaderSpMenuProps) {
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const stepButtonRefs = useRef<Partial<Record<"pf" | "rf", HTMLButtonElement | null>>>({});
  const previousStepRef = useRef(step);

  // 段階を切り替えると押したボタンが消えるので、開いたときは「戻る」へ、戻ったときは開いた項目へフォーカスを移す
  useEffect(() => {
    const previous = previousStepRef.current;
    previousStepRef.current = step;
    if (previous === step) return;
    if (step !== null) {
      backButtonRef.current?.focus();
    } else if (previous !== null) {
      stepButtonRefs.current[previous]?.focus();
    }
  }, [step]);

  return (
    <div
      id={id}
      className="mt-3 flex max-h-[calc(100vh-120px)] flex-col overflow-y-auto border-t border-[#EEF0EF] px-1 pt-3 pb-2"
    >
      {step === null ? (
        <ul className="flex flex-col">
          {navItems.map(({ key, label }) => (
            <li key={key} className="flex flex-col">
              {isMenuNavKey(key) ? (
                <button
                  ref={(element) => {
                    stepButtonRefs.current[key] = element;
                  }}
                  type="button"
                  onClick={() => onStepChange(key)}
                  className={`${ROW_CLASS} cursor-pointer text-left`}
                >
                  {label}
                  <Image src="/icons/icon-chevron-right.svg" alt="" width={18} height={18} />
                </button>
              ) : key === "faq" ? (
                <a
                  href={FAQ_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onNavigate}
                  aria-label={`${label}（別タブで開きます）`}
                  className={ROW_CLASS}
                >
                  {label}
                  <ExternalIcon />
                </a>
              ) : (
                <Link href={DIRECT_HREFS[key]} onClick={onNavigate} className={ROW_CLASS}>
                  {label}
                  <Image src="/icons/icon-chevron-right.svg" alt="" width={18} height={18} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <button
            ref={backButtonRef}
            type="button"
            onClick={() => onStepChange(null)}
            className="flex min-h-11 cursor-pointer items-center gap-1 self-start px-2 text-sm font-bold text-[#238778]"
          >
            ‹ 戻る
          </button>
          <p className="px-3 pt-1 pb-2 text-xs font-bold text-[#6B7280]">
            {step === "pf" ? "政党・政治団体" : "調研費"}
          </p>
          <ul className="flex flex-col">
            {step === "pf"
              ? organizations.flatMap((organization) =>
                  [...organization.years].reverse().map(({ year, href, isSelected }) => (
                    <li key={`${organization.slug}-${year}`} className="flex flex-col">
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isSelected ? "page" : undefined}
                        className={LINK_ROW_CLASS}
                      >
                        <span className="min-w-0 flex-1">{organization.name}</span>
                        <span className="text-xs font-medium text-[#6B7280]">{year}年</span>
                      </Link>
                    </li>
                  )),
                )
              : politicians.flatMap((politician) =>
                  [...politician.years].reverse().map(({ year, href, isSelected }) => (
                    <li key={`${politician.slug}-${year}`} className="flex flex-col">
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={isSelected ? "page" : undefined}
                        className={LINK_ROW_CLASS}
                      >
                        <PoliticianInitialAvatar name={politician.name} size="sm" />
                        <span className="min-w-0 flex-1">{politician.name}</span>
                        <span className="text-xs font-medium text-[#6B7280]">{year}年</span>
                      </Link>
                    </li>
                  )),
                )}
          </ul>
        </>
      )}
    </div>
  );
}

/** 別タブで開くリンクの矢印（↗） */
export function ExternalIcon({ className = "size-4 shrink-0 opacity-75" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}
