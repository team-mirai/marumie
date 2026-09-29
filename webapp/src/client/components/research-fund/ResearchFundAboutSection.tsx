import "server-only";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import MainButton from "@/client/components/ui/MainButton";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const BODY_CLASS =
  "text-[11px] sm:text-[15px] leading-[1.82] sm:leading-[1.87] tracking-[0.01em] text-gray-500 sm:text-gray-800 font-medium sm:font-normal font-japanese";
const HEADING_CLASS = "text-base sm:text-lg font-bold text-gray-800 mb-3 font-japanese";

/** B-5 データについて。既存の「データについて」と同構成に、調研費の記載を足す。 */
export default function ResearchFundAboutSection({ data }: { data: ResearchFundPageData }) {
  return (
    <MainColumnCard id="explanation">
      <div className="space-y-9">
        <div>
          <h3 className={HEADING_CLASS}>みらい まる見え政治資金について</h3>
          <p className={BODY_CLASS}>
            本プロジェクトは、チームみらいによって政治資金の透明化を目的に開発されたオープンソースソフトウェアです。すでにオープンソースで
            <a
              href="https://github.com/team-mirai-volunteer/marumie"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#238778] underline hover:no-underline"
            >
              こちらのGitHub
            </a>
            にて無償公開中であり、政党や所属を問わず利用可能な形で提供しております。開発コミュニティにご興味のある方は
            <a
              href="https://action.team-mir.ai/missions/join-slack"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#238778] underline hover:no-underline"
            >
              アクションボード
            </a>
            からSlackにご参加ください。
          </p>
        </div>

        <div>
          <h3 className={HEADING_CLASS}>調研費のデータについて</h3>
          <p className={BODY_CLASS}>{data.dataNote}</p>
        </div>

        <div>
          <h3 className={HEADING_CLASS}>免責事項</h3>
          <p className={BODY_CLASS}>
            本サイトで公開するデータは、可能な限り正確かつ最新の情報を反映するよう努めていますが、現時点においてはその正確性・完全性・即時性について保証するものではありません。今後は、これらの側面について一層踏み込んだ公開を目指してまいります。最終的な収支は、別途公開される「政治資金収支報告書」「選挙運動費用収支報告書」並びに「調査研究広報滞在費に係る使途等報告書」をご確認ください。
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <a
          href="https://team-mirai.notion.site/FAQ-27ef6f56bae180c085e9f97d05a5d59c"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MainButton>よくあるご質問</MainButton>
        </a>
      </div>
    </MainColumnCard>
  );
}
