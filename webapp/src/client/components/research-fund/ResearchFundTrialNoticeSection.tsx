import "server-only";
import GradientMessageCard from "@/client/components/common/GradientMessageCard";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/1A-smuVBxS9ar8Z7PuP4TeZpc1Re9EhqmFdTWjrzgFHg/viewform";

interface ResearchFundTrialNoticeSectionProps {
  politicianName: string;
}

/** 調研費を法令に先行して試験公開していることと、ご意見フォームへの導線を伝えるカード。 */
export default function ResearchFundTrialNoticeSection({
  politicianName,
}: ResearchFundTrialNoticeSectionProps) {
  return (
    <GradientMessageCard title={`${politicianName}の調研費、法律より一足先に試験公開中👉`}>
      国民にとってわかりやすく、納得感のある公開のあり方を探るため、法令で義務付けられた公開に先行して試験的に公開しています。今後、チームみらい所属の他の議員11名分の調研費や、党独自の使用ガイドラインも順次公開していきます。ご感想やご意見はこちらの
      <a
        href={FEEDBACK_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold underline hover:no-underline"
      >
        ご意見フォーム
      </a>
      にお寄せください。
    </GradientMessageCard>
  );
}
