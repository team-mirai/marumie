import "server-only";
import AboutLoopVideo from "@/client/components/about/AboutLoopVideo";
import { AboutCard, AboutCtaLink, AboutSectionHeading } from "@/client/components/about/AboutParts";
import ResearchFundSurveyCard from "@/client/components/common/ResearchFundSurveyCard";
import ResearchFundIntroLinks from "@/client/components/research-fund/ResearchFundIntroLinks";

/**
 * 「議員の調研費についても公開」。調研費の説明と使用方針へのリンク、トップの議員カードの説明動画、
 * 実際の議員の調研費（トップの「所属議員の調研費」）への入口、調研費の公開についてのアンケートを出す。
 */
export default function AboutResearchFundSection() {
  return (
    <AboutCard labelledBy="about-rf" className="gap-7">
      <div className="flex min-w-0 flex-col gap-4">
        <AboutSectionHeading
          id="about-rf"
          eyebrow={
            <span role="note" className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-6 items-center rounded-full bg-[#F5FF3B] px-2.5 text-[12px] font-extrabold tracking-normal text-black">
                更新
              </span>
              2026年11月に公開
            </span>
          }
          title="議員の調研費についても公開"
        >
          国会議員の活動のために国から支給される調研費を何に使っているのかを公開します。支出の全体像、明細に加えて、使用方針や主要な使途などを、議員自身の言葉で説明しています。
        </AboutSectionHeading>
        <ResearchFundIntroLinks />
      </div>

      <figure className="m-0 w-full overflow-hidden rounded-[20px] bg-[#EDF4F1] p-[clamp(12px,2.4vw,28px)]">
        <AboutLoopVideo
          src="/about/rf-members3-trim3.mp4"
          poster="/about/rf-members3-trim3-poster@2x.webp"
          width={1528}
          height={1192}
          label="トップページ「所属議員の調研費」の画面。左の議員リストで上から順に議員を切り替えると、右のカードの支給総額・支出総額と使い道のサンキー図がその議員のものに変わる"
          className="block h-auto w-full rounded-xl bg-[#EDF4F1]"
        />
        <figcaption className="mt-2.5 text-right text-[12px] leading-[1.4] text-[#6B7280]">
          ※データはダミーです
        </figcaption>
        <div className="mt-5 flex justify-center">
          <AboutCtaLink href="/#home-rf">実際の議員の調研費を見る</AboutCtaLink>
        </div>
      </figure>

      <ResearchFundSurveyCard headingId="about-voice" headingLevel="h3" />
    </AboutCard>
  );
}
