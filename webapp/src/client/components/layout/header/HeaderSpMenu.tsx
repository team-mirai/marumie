import Link from "next/link";
import OrganizationMenuIcon from "@/client/components/layout/header/OrganizationMenuIcon";
import PoliticianInitialAvatar from "@/client/components/layout/header/PoliticianInitialAvatar";
import {
  ABOUT_HREF,
  DATA_NOTES_HREF,
  FAQ_URL,
  type HeaderOrganizationMenuItem,
  type HeaderPoliticianMenuItem,
  RESEARCH_FUND_FEEDBACK_URL,
  SOURCE_CODE_URL,
} from "@/client/lib/header-navigation";

interface HeaderSpMenuProps {
  id: string;
  organizations: HeaderOrganizationMenuItem[];
  politicians: HeaderPoliticianMenuItem[];
  onNavigate: () => void;
}

const FOCUS_CLASS =
  "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#30BCA7]";
const SECTION_CLASS = "flex flex-col gap-2.5 border-b border-[#DCE4E1] py-[18px]";
const LABEL_CLASS =
  "flex items-baseline justify-between text-xs font-bold tracking-[0.04em] text-[#0F8472]";
const LINK_ROW_CLASS = `flex min-h-12 items-center justify-between text-[15px] font-bold ${FOCUS_CLASS}`;

/**
 * SP のメニューボタンで開くメニュー（デザイン v9 の案 C-1 フラットリスト型）。
 * 政党・政治団体 → 議員の調研費（顔写真で選ぶ）→ このサイトについて → 調研費についてのご意見 を1枚に並べる。
 * 開閉の動き（幕が下りる・項目が順にすべり込む）は globals.css の `.sp-menu` に置く。
 */
export default function HeaderSpMenu({
  id,
  organizations,
  politicians,
  onNavigate,
}: HeaderSpMenuProps) {
  return (
    <nav
      id={id}
      aria-label="メニュー"
      className="sp-menu mt-3 flex max-h-[calc(100dvh-120px)] flex-col overflow-y-auto overscroll-contain border-t border-[#DCE4E1] px-1 pb-5 text-black max-[640px]:m-0 max-[640px]:max-h-none max-[640px]:min-h-0 max-[640px]:flex-1 max-[640px]:border-t-0 max-[640px]:bg-[#E3F2EF] max-[640px]:px-5 max-[640px]:pt-1 max-[640px]:pb-10"
    >
      <section aria-label="政党・政治団体" className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>政党・政治団体</span>
        <ul>
          {organizations.map((organization) => (
            <li key={organization.slug}>
              <Link
                href={organization.href}
                onClick={onNavigate}
                aria-current={organization.isCurrent ? "page" : undefined}
                className={`flex min-h-[52px] items-center gap-3 text-base font-extrabold ${FOCUS_CLASS}`}
              >
                <OrganizationMenuIcon slug={organization.slug} hasPhoto={organization.hasPhoto} />
                <span className="min-w-0 flex-1">{organization.name}の収支</span>
                <ChevronRightIcon />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {politicians.length > 0 && (
        <section aria-label="議員の調研費" className={SECTION_CLASS}>
          <span className={LABEL_CLASS}>
            議員の調研費
            <small className="text-[11px] font-normal tracking-normal text-[#5B6470]">
              五十音順
            </small>
          </span>
          <ul className="grid grid-cols-4 gap-x-1.5 gap-y-3.5">
            {politicians.map((politician) => (
              <li key={politician.slug} className="min-w-0">
                <Link
                  href={politician.href}
                  onClick={onNavigate}
                  aria-current={politician.isCurrent ? "page" : undefined}
                  className={`flex flex-col items-center gap-1.5 text-center text-[11px] font-bold leading-[1.3] ${FOCUS_CLASS}`}
                >
                  <PoliticianInitialAvatar
                    name={politician.name}
                    photoUrl={politician.photoUrl}
                    size="face"
                  />
                  {politician.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="このサイトについて" className={SECTION_CLASS}>
        <span className={LABEL_CLASS}>このサイトについて</span>
        <ul>
          <li>
            <Link href={ABOUT_HREF} onClick={onNavigate} className={LINK_ROW_CLASS}>
              <span className="min-w-0 flex-1">まる見え政治資金とは</span>
              <ChevronRightIcon />
            </Link>
          </li>
          <li>
            <Link href={DATA_NOTES_HREF} onClick={onNavigate} className={LINK_ROW_CLASS}>
              <span className="min-w-0 flex-1">データについて</span>
              <ChevronRightIcon />
            </Link>
          </li>
          <li>
            <ExternalRow href={FAQ_URL} label="よくあるご質問" onNavigate={onNavigate} />
          </li>
          <li>
            <ExternalRow
              href={SOURCE_CODE_URL}
              label="ソースコード（GitHub）"
              onNavigate={onNavigate}
            />
          </li>
        </ul>
      </section>

      <div className="flex flex-col pt-5">
        <a
          href={RESEARCH_FUND_FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          aria-label="調研費についてのご意見（別タブで開きます）"
          className="flex h-[46px] items-center justify-center rounded-full border border-black bg-white text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#30BCA7] active:bg-[#30BCA7] active:text-white"
        >
          調研費についてのご意見
          <ExternalIcon className="ml-1 size-3 shrink-0" />
        </a>
      </div>
    </nav>
  );
}

/** 別タブで開く行。矢印（↗）は文字のすぐ右に置く */
function ExternalRow({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      aria-label={`${label}（別タブで開きます）`}
      className={`flex min-h-12 items-center text-[15px] font-bold ${FOCUS_CLASS}`}
    >
      {label}
      <ExternalIcon className="ml-1 size-3 shrink-0" />
    </a>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-[18px] shrink-0 text-[#5B6470]"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
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
