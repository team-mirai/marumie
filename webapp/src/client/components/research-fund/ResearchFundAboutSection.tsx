import "server-only";
import MainColumnCard from "@/client/components/layout/MainColumnCard";
import MainButton from "@/client/components/ui/MainButton";
import type { ResearchFundPageData } from "@/server/contexts/research-fund/domain/models/research-fund-page";

const BODY_CLASS =
  "text-[11px] sm:text-[15px] leading-[1.82] sm:leading-[1.87] tracking-[0.01em] text-gray-500 sm:text-gray-800 font-medium sm:font-normal font-japanese";
const HEADING_CLASS = "text-base sm:text-lg font-bold text-gray-800 mb-3 font-japanese";

function formatMan(amount: number): string {
  return `${Math.round(amount / 10000).toLocaleString("ja-JP")}万円`;
}

/**
 * 未使用分の説明。返還額を成績のように見せないため、数字を出すのは
 * サンキーの最終帯とこの文の2箇所だけにする（デザイン仕様 §5）。
 */
function unusedSentence(data: ResearchFundPageData): string {
  const grantedMonths = data.monthly.filter((month) => month.granted > 0).length;
  const period = grantedMonths > 0 ? `${grantedMonths}ヶ月分・` : "";
  return `余った分：${formatMan(data.kpi.spent)}を使い、${formatMan(
    data.unused,
  )}は使っていません（${period}年末時点で確定します）。`;
}

/** B-5 データについて。既存の「データについて」と同構成に、調研費の記載を足す。 */
export default function ResearchFundAboutSection({ data }: { data: ResearchFundPageData }) {
  const updateNote = data.nextUpdateNote
    ? `更新は不定期で、次回は${data.nextUpdateNote}の予定です。`
    : "更新は不定期です。";

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
          <h3 className={HEADING_CLASS}>調査研究費のデータについて</h3>
          <p className={BODY_CLASS}>
            {data.dataNote ??
              `${data.financialYear}年に${data.politician.name}に支給された調査研究費のうち、仕訳が完了し公開した支出を1件ずつ掲載しています。費目はチームみらい独自の詳細区分にマッピングし、使途等報告書で定められた法律上の区分にも切り替えて表示できます。`}
            {updateNote}
            {unusedSentence(data)}
          </p>
        </div>

        <div>
          <h3 className={HEADING_CLASS}>免責事項</h3>
          <p className={BODY_CLASS}>
            本サイトで公開するデータは、可能な限り正確かつ最新の情報を反映するよう努めていますが、現時点においてはその正確性・完全性・即時性について保証するものではありません。最終的な使途は、別途公開される「調査研究広報滞在費の使途等報告書」をご確認ください。
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
