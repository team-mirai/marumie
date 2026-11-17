import "server-only";
import {
  AboutCard,
  AboutExternalLink,
  AboutSectionHeading,
} from "@/client/components/about/AboutParts";
import { SOURCE_CODE_URL } from "@/client/lib/header-navigation";

/** 導入希望の登録フォーム（Google フォーム） */
const ADOPTION_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc44gK0ce3a1e_i6raz56Zan49MlxExvnqYd4B5dngMvf-qbw/viewform";

/** 「オープンソースでだれでも使える」。導入希望の登録フォームとソースコード（GitHub）へのリンクを出す。 */
export default function AboutOpenSourceSection() {
  return (
    <AboutCard labelledBy="about-oss" className="gap-6">
      <AboutSectionHeading
        id="about-oss"
        eyebrow="オープンソースでだれでも使える"
        title={
          <>
            まる見え政治資金を使いたい
            <wbr />
            議員／政治団体の方へ
          </>
        }
      >
        本ツールはすでにオープンソースとして無料で公開されており、あらゆる議員・政治団体のみなさんにお使いいただけます。導入についてご興味のある方は、
        <a
          href={ADOPTION_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="導入希望の登録フォーム（Googleフォームが別タブで開きます）"
          className="font-bold text-[#238778] underline hover:no-underline"
        >
          登録フォーム
        </a>
        からご登録ください。
      </AboutSectionHeading>
      <AboutExternalLink
        href={SOURCE_CODE_URL}
        ariaLabel="ソースコードを見る（GitHubが別タブで開きます）"
      >
        ソースコードを見る（GitHub）
      </AboutExternalLink>
    </AboutCard>
  );
}
