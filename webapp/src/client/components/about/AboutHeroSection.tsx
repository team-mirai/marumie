import "server-only";
import Image from "next/image";
import type { ReactNode } from "react";
import OrganizationAvatar from "@/client/components/home/OrganizationAvatar";
import { AboutCard } from "@/client/components/about/AboutParts";
import PoliticianAvatar from "@/client/components/research-fund/PoliticianAvatar";
import {
  type AboutPublishedCategory,
  type AboutPublishedSummary,
  describeAboutPublishedSummary,
} from "@/client/lib/about-published";

interface AboutHeroSectionProps {
  summary: AboutPublishedSummary;
  /** 「2026.11.16時点」と、その読み上げ「2026年11月16日時点」 */
  asOf: { text: string; spoken: string };
}

const NUMBER_CLASS = "font-num font-bold leading-none tracking-[-0.02em] text-[#30BCA7]";
// 内訳の丸アイコン。2 つ目からは前のアイコンに重ねる
const AVATAR_CLASS = "size-[26px] flex-none shadow-[0_0_0_2px_#fff] not-first:-ml-[7px]";

/**
 * 「まる見え政治資金とは」の先頭のカード。見出しと、現時点で公開している収支の数と内訳を出す。
 * SP は数と内訳を左揃えの1行（例: 「14 政党1＋議員の調研費12＋議員の政治団体1」）にし、アイコン付きの一覧は出さない。
 */
export default function AboutHeroSection({ summary, asOf }: AboutHeroSectionProps) {
  const categories = [summary.parties, summary.politicians, summary.groups].filter(
    (category) => category.items.length > 0,
  );

  return (
    <AboutCard labelledBy="about-title">
      <div className="flex min-w-0 flex-col gap-6">
        <span className="inline-flex items-center gap-2.5 text-[14px] font-bold text-[#089781]">
          <span aria-hidden="true" className="h-0.5 w-6 bg-[#30BCA7]" />
          まる見え政治資金
        </span>
        <h1
          id="about-title"
          className="m-0 break-keep text-[30px] font-black leading-[1.3] tracking-[0.01em] text-black [overflow-wrap:anywhere] [text-wrap:balance] min-[641px]:text-[clamp(30px,3.5vw,42px)]"
        >
          政党と議員のお金の流れを
          <wbr />
          まる見えに
        </h1>
        <p className="m-0 max-w-[560px] text-[16px] leading-[1.9] tracking-[0.02em] text-[#374151] [text-wrap:pretty]">
          チームみらいに関するお金の流れをわかりやすく公開しています
        </p>
      </div>

      <section
        aria-label={`現時点（${asOf.spoken}）で公開している収支：${describeAboutPublishedSummary(summary)}`}
        className="mt-7 flex flex-wrap items-stretch gap-x-10 gap-y-5 min-[641px]:mt-10"
      >
        <div className="flex flex-col items-start gap-2">
          <span className="text-[13px] font-bold tracking-[0.04em] text-[#238778]">
            現時点で公開している収支
          </span>
          <span className="flex flex-wrap items-baseline gap-1.5">
            <span className={`${NUMBER_CLASS} text-[48px] min-[641px]:text-[clamp(56px,6vw,80px)]`}>
              {summary.total}
            </span>
            {/* SP だけ、数の右に内訳を1行で添える */}
            <span className="inline text-[14px] font-bold leading-[1.9] text-black min-[641px]:hidden">
              {categories.map((category, index) => (
                <span key={category.label}>
                  {index > 0 && "＋"}
                  <span className="whitespace-nowrap">
                    {category.label}
                    <b className="font-num mx-0.5 text-[16px] font-bold leading-[1.25] text-black">
                      {category.items.length}
                    </b>
                  </span>
                </span>
              ))}
            </span>
          </span>
        </div>

        {categories.length > 0 && (
          <div className="hidden flex-wrap items-end gap-x-8 gap-y-4 border-l border-[#E5E7EB] pl-[clamp(0px,2.4vw,32px)] min-[641px]:flex">
            <PublishedCategory category={summary.parties}>
              {summary.parties.items.map((party) => (
                <Image
                  key={party.slug}
                  src="/logos/team-mirai-logo.svg"
                  alt={party.name}
                  width={26}
                  height={26}
                  className="block h-[26px] w-auto flex-none"
                />
              ))}
            </PublishedCategory>
            <PublishedCategory category={summary.politicians}>
              {summary.politicians.items.map((politician) => (
                <PoliticianAvatar
                  key={politician.slug}
                  photoUrl={politician.photoUrl}
                  alt={politician.name}
                  className={AVATAR_CLASS}
                />
              ))}
            </PublishedCategory>
            <PublishedCategory category={summary.groups}>
              {summary.groups.items.map((group) => (
                <span
                  key={group.slug}
                  className={`flex items-center justify-center overflow-hidden rounded-full bg-[#E2F6F3] ${AVATAR_CLASS}`}
                >
                  <OrganizationAvatar
                    slug={group.slug}
                    alt={group.label}
                    hasPhoto={group.hasPhoto}
                  />
                </span>
              ))}
            </PublishedCategory>
          </div>
        )}
      </section>
      <div className="mt-5 text-right text-[12px] leading-[1.33] text-[#6B7280] tabular-nums">
        {asOf.text}
      </div>
    </AboutCard>
  );
}

/** PC の内訳の1区分（区分名・数・アイコン） */
function PublishedCategory<T>({
  category,
  children,
}: {
  category: AboutPublishedCategory<T>;
  children: ReactNode;
}) {
  if (category.items.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-bold text-[#374151]">{category.label}</span>
      <span className="flex flex-wrap items-baseline gap-1">
        <span className={`${NUMBER_CLASS} text-[clamp(32px,3.4vw,44px)]`}>
          {category.items.length}
        </span>
        <span className="ml-2.5 flex items-center self-center">{children}</span>
      </span>
    </div>
  );
}
