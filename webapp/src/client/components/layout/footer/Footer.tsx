import "server-only";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalIcon } from "@/client/components/layout/header/HeaderSpMenu";
import ComingSoonPill from "@/client/components/common/ComingSoonPill";
import OrganizationMenuIcon from "@/client/components/layout/header/OrganizationMenuIcon";
import PoliticianInitialAvatar from "@/client/components/layout/header/PoliticianInitialAvatar";
import {
  FOOTER_SOCIAL_LINKS,
  OFFICIAL_SITE_URL,
  socialLinkLabel,
  sortFooterPoliticiansByKana,
} from "@/client/lib/footer-navigation";
import {
  ABOUT_HREF,
  buildComingSoonPoliticianMenuItems,
  buildOrganizationMenuItems,
  buildPoliticianMenuItems,
  DATA_NOTES_HREF,
  FAQ_URL,
  RESEARCH_FUND_FEEDBACK_URL,
  SOURCE_CODE_URL,
} from "@/client/lib/header-navigation";
import { PublishedFiscalYears } from "@/server/contexts/public-finance/domain/models/published-fiscal-years";
import { loadHomePageData } from "@/server/contexts/public-finance/presentation/loaders/load-home-page-data";
import type { ResearchFundPoliticianEntry } from "@/server/contexts/research-fund/domain/models/research-fund-politician-list";
import { loadResearchFundComingSoonPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-coming-soon-politicians";
import { loadResearchFundPoliticians } from "@/server/contexts/research-fund/presentation/loaders/load-research-fund-politicians";

const FOCUS_CLASS =
  "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#30BCA7]";
const ROW_CLASS =
  "grid grid-cols-1 gap-2.5 border-b border-black/14 pb-5 min-[641px]:grid-cols-[200px_minmax(0,1fr)] min-[641px]:gap-4 min-[641px]:pb-6";
// PC は左の見出しを、右側 1 行目（高さ 44px のリンク）の上下中央にそろえる。
// 太さは v9 の描画に合わせて 900（v9 の宣言は 700 だが、h2 への 900 !important が効く）
const HEADING_CLASS =
  "m-0 text-sm leading-[1.6] font-black text-black min-[641px]:flex min-[641px]:min-h-11 min-[641px]:flex-wrap min-[641px]:items-center min-[641px]:self-start";
const PEOPLE_CLASS = "flex flex-wrap gap-x-5 gap-y-0.5";
const PERSON_LINK_CLASS = `inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-black hover:underline hover:underline-offset-3 ${FOCUS_CLASS}`;
const TEXT_LINK_CLASS = `inline-flex min-h-11 items-center hover:text-black hover:underline hover:underline-offset-3 ${FOCUS_CLASS}`;
const EXTERNAL_ICON_CLASS = "ml-1 size-[0.75em] shrink-0";

/**
 * 全ページ共通のフッター（デザイン v9 の案 B）。
 * サイトマップ（政党・政治団体／議員の調研費／このサイトについて）→ ロゴと SNS → 規約 の順に並べる。
 * 政治団体と議員は公開中のデータから並べる（議員は五十音順）。
 */
export default async function Footer() {
  const [homeData, politicianLists, comingSoonPoliticians] = await Promise.all([
    // 政党と政治団体を分けて並べ、代表者の写真を出すため、政党かどうかと写真の有無が分かるトップの集計を使う。
    // DB に届かない環境（CI のビルド時など）でもフッターは描けるようにする
    loadHomePageData(PublishedFiscalYears.all).catch((error) => {
      console.error("loadHomePageData error:", error);
      return null;
    }),
    // 調研費を「公開しない」議員は loader が返さないので、フッターにも出ない
    Promise.all(
      PublishedFiscalYears.all.map((financialYear) =>
        loadResearchFundPoliticians({ financialYear }).catch((error) => {
          console.error("loadResearchFundPoliticians error:", error);
          return [] as ResearchFundPoliticianEntry[];
        }),
      ),
    ),
    // 調研費を非公開のまま「準備中」のタグを添えて出す議員（公開中の議員の後ろに並べる）
    loadResearchFundComingSoonPoliticians(),
  ]);

  const notCurrent = { kind: "other" } as const;
  const parties = buildOrganizationMenuItems(
    (homeData?.parties ?? []).map((party) => ({ ...party, kind: "party" as const })),
    notCurrent,
  );
  const groups = buildOrganizationMenuItems(
    (homeData?.groups ?? []).map((group) => ({ ...group, kind: "group" as const })),
    notCurrent,
  );
  const politiciansByYear = Object.fromEntries(
    PublishedFiscalYears.all.map((year, index) => [year, politicianLists[index]]),
  );
  const politicians = sortFooterPoliticiansByKana(
    buildPoliticianMenuItems(politiciansByYear, notCurrent),
    politiciansByYear,
  );
  const comingSoon = buildComingSoonPoliticianMenuItems(comingSoonPoliticians, politicians);

  return (
    <footer className="w-full bg-gradient-to-tl from-[#BCECD3] to-[#64D8C6] text-[#1F2937]">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-5 px-[clamp(16px,4vw,48px)] pt-7 pb-6 min-[641px]:gap-7 min-[641px]:pt-11 min-[641px]:pb-8">
        {parties.length + groups.length > 0 && (
          <SitemapRow label="政党・政治団体" heading="政党・政治団体">
            <div className={PEOPLE_CLASS}>
              {parties.map((party) => (
                <Link key={party.slug} href={party.href} className={PERSON_LINK_CLASS}>
                  <OrganizationMenuIcon slug={party.slug} hasPhoto={party.hasPhoto} ringed />
                  {party.name}の収支
                </Link>
              ))}
              {groups.map((group) => (
                <Link key={group.slug} href={group.href} className={PERSON_LINK_CLASS}>
                  <OrganizationMenuIcon slug={group.slug} hasPhoto={group.hasPhoto} ringed />
                  {group.name}の収支
                </Link>
              ))}
            </div>
          </SitemapRow>
        )}

        {politicians.length > 0 && (
          <SitemapRow
            label="議員の調研費"
            heading={
              <>
                議員の調研費
                <small className="ml-0.5 inline text-[11px] font-normal whitespace-nowrap text-[#1F2937]">
                  （五十音順）
                </small>
              </>
            }
          >
            <div className={PEOPLE_CLASS}>
              {politicians.map((politician) => (
                <Link key={politician.slug} href={politician.href} className={PERSON_LINK_CLASS}>
                  <PoliticianInitialAvatar
                    name={politician.name}
                    photoUrl={politician.photoUrl}
                    size="footer"
                  />
                  {politician.name}
                </Link>
              ))}
              {comingSoon.map((politician) => (
                <Link key={politician.slug} href={politician.href} className={PERSON_LINK_CLASS}>
                  <PoliticianInitialAvatar
                    name={politician.name}
                    photoUrl={politician.photoUrl}
                    size="footer"
                  />
                  {politician.name}
                  <ComingSoonPill className="-ml-0.5 bg-white/80" />
                </Link>
              ))}
            </div>
          </SitemapRow>
        )}

        <SitemapRow label="このサイトについて" heading="このサイトについて">
          <div className="flex flex-wrap gap-x-6 text-sm font-medium">
            <Link href={ABOUT_HREF} className={TEXT_LINK_CLASS}>
              まる見え政治資金とは
            </Link>
            <Link href={DATA_NOTES_HREF} className={TEXT_LINK_CLASS}>
              データについて
            </Link>
            <ExternalTextLink href={FAQ_URL} label="よくあるご質問" />
            <ExternalTextLink href={SOURCE_CODE_URL} label="ソースコード（GitHub）" />
            <ExternalTextLink href={OFFICIAL_SITE_URL} label="チームみらい公式サイト" />
            <span className="mt-2 basis-full">
              <a
                href={RESEARCH_FUND_FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="調研費公開についてのアンケート（Googleフォームが別タブで開きます）"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black px-5 text-sm font-bold text-white transition-colors hover:bg-[#0F8472] focus-visible:bg-[#0F8472] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black"
              >
                調研費公開についてのアンケート
                <ExternalIcon className="size-[0.75em] shrink-0" />
              </a>
            </span>
          </div>
        </SitemapRow>

        <div className="flex flex-col flex-wrap items-start justify-between gap-5 min-[641px]:flex-row min-[641px]:items-center">
          <Link
            href="/"
            aria-label="まる見え政治資金 トップへ"
            className={`flex items-center gap-5 ${FOCUS_CLASS}`}
          >
            <Image
              src="/logos/team-mirai-logo.svg"
              alt="チームみらい"
              width={117}
              height={100}
              className="block h-20 w-auto min-[641px]:h-[100px]"
            />
            <Image
              src="/logos/service-logo-pc-marumie.svg"
              alt="まる見え政治資金"
              width={216}
              height={30}
              className="block h-6 w-auto min-[641px]:h-[30px]"
            />
          </Link>
          <ul aria-label="チームみらいのSNS" className="flex flex-wrap gap-2.5">
            {FOOTER_SOCIAL_LINKS.map((social) => (
              <li key={social.icon}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialLinkLabel(social)}
                  className="inline-flex size-10 rounded-full transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#30BCA7] motion-reduce:transition-none"
                >
                  <Image
                    src={`/images/social-icons/${social.icon}`}
                    alt=""
                    width={40}
                    height={40}
                    className="block size-10"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
          <Link href="/terms" className={`hover:underline ${FOCUS_CLASS}`}>
            利用規約
          </Link>
          <Link href="/privacy" className={`hover:underline ${FOCUS_CLASS}`}>
            プライバシーポリシー
          </Link>
          <span>© 2025 Team Mirai All rights Reserved</span>
        </div>
      </div>
    </footer>
  );
}

function SitemapRow({
  label,
  heading,
  children,
}: {
  label: string;
  heading: ReactNode;
  children: ReactNode;
}) {
  return (
    <nav aria-label={label} className={ROW_CLASS}>
      <h2 className={HEADING_CLASS}>{heading}</h2>
      {children}
    </nav>
  );
}

function ExternalTextLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}（別タブで開きます）`}
      className={TEXT_LINK_CLASS}
    >
      {label}
      <ExternalIcon className={EXTERNAL_ICON_CLASS} />
    </a>
  );
}
