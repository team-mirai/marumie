import "server-only";
import {
  AboutCard,
  AboutCtaExternalLink,
  AboutExternalLink,
  AboutSectionHeading,
} from "@/client/components/about/AboutParts";
import { SOURCE_CODE_URL } from "@/client/lib/header-navigation";

/** 導入希望の登録フォーム（Google フォーム） */
const ADOPTION_FORM_URL = "https://forms.gle/sPx3jFbYCSRamqEE6";

/**
 * 「オープンソースでだれでも使える」。全ページの下部ブロックに置き、
 * 導入希望の登録フォームへのボタンとソースコード（GitHub）へのリンクを出す。
 */
export default function OpenSourceAdoptionSection() {
  return (
    <AboutCard labelledBy="site-oss" className="gap-6">
      <AboutSectionHeading
        id="site-oss"
        eyebrow="オープンソースでだれでも使える"
        title={
          <>
            まる見え政治資金を使いたい
            <wbr />
            議員／政治団体の方へ
          </>
        }
      >
        本ツールはすでにオープンソースとして無料で公開されており、あらゆる議員・政治団体のみなさんにお使いいただけます。導入についてご興味のある方は、下のボタンからご登録ください。
      </AboutSectionHeading>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
        <AboutCtaExternalLink
          href={ADOPTION_FORM_URL}
          ariaLabel="導入を希望する（Googleフォームが別タブで開きます）"
        >
          導入を希望する
        </AboutCtaExternalLink>
        <AboutExternalLink
          href={SOURCE_CODE_URL}
          ariaLabel="ソースコードを見る（GitHubが別タブで開きます）"
        >
          ソースコードを見る（GitHub）
        </AboutExternalLink>
      </div>
    </AboutCard>
  );
}
