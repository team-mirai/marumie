import "server-only";
import Image from "next/image";
import {
  AboutCard,
  AboutCtaLink,
  AboutExternalLink,
  AboutSectionHeading,
} from "@/client/components/about/AboutParts";

/** 公開時のお知らせ（note） */
const LAUNCH_NOTE_URL = "https://note.com/team_mirai_jp/n/n58fca6f9e4e8";

interface AboutAimSectionProps {
  /** 「実際のチームみらいの収支を見る」の行き先。政党のデータが無ければ null（ボタンを出さない） */
  partyHref: string | null;
}

/** 「目指していること」。まとめの文と、実際のチームみらいの収支（政党ページ）への入口を出す。 */
export default function AboutAimSection({ partyHref }: AboutAimSectionProps) {
  return (
    <AboutCard labelledBy="about-aim" className="gap-10">
      <AboutSectionHeading
        id="about-aim"
        eyebrow="目指していること"
        title={
          <>
            「政治とカネ」の問題を終わらせる、
            <wbr />
            その一歩目として。
          </>
        }
      >
        これまで政治のお金は年に1回の収支報告書でしか公開されず、時期も使用から1年近くあとでした。まる見え政治資金は、これまで以上にお金の流れをできるだけ透明化することを目指します。
      </AboutSectionHeading>
      <AboutExternalLink
        href={LAUNCH_NOTE_URL}
        ariaLabel="公開時のお知らせを読む（noteが別タブで開きます）"
      >
        公開時のお知らせを読む（note）
      </AboutExternalLink>
      <div className="flex flex-col gap-5 rounded-[20px] bg-[#E2F6F3] p-[clamp(20px,3vw,36px)]">
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-bold tracking-[0.04em] text-[#238778]">
            チームみらい
          </span>
          <h3
            id="about-new-t"
            className="m-0 -mt-1.5 text-[18px] font-extrabold leading-[1.4] text-black min-[641px]:text-[20px]"
          >
            まる見え政治資金
          </h3>
        </div>
        <Image
          src="/about/party-top-section@2x.webp"
          alt="トップページ「チームみらいの収支」の画面。収入総額・支出総額・収支と現金残高と、収入から支出までのお金の流れのサンキー図が表示される"
          width={1728}
          height={1391}
          sizes="(min-width: 1080px) 920px, 100vw"
          className="block h-auto w-full rounded-xl"
        />
        {partyHref && <AboutCtaLink href={partyHref}>実際のチームみらいの収支を見る</AboutCtaLink>}
      </div>
    </AboutCard>
  );
}
