import "server-only";
import type { Metadata } from "next";
import LegalPageLayout, {
  Paragraph,
  SubSectionTitle,
  List,
} from "@/client/components/layout/LegalPageLayout";

export const metadata: Metadata = {
  title: "利用規約",
};

export default function TermsPage() {
  return (
    <LegalPageLayout title="利用規約">
      <Paragraph className="mb-6">
        本サービスをご利用いただく場合、以下の規約に同意いただいたものとみなします。
      </Paragraph>

      <div className="space-y-6">
        <div>
          <SubSectionTitle>第1条（公開するデータの範囲）</SubSectionTitle>
          <Paragraph>
            本サイトで公開するデータは、その正確性・完全性・即時性について保証するものではありません。最終的な収支は、別途公開される「政治資金収支報告書」をご確認ください。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>第2条（禁止事項）</SubSectionTitle>
          <Paragraph className="mb-3">
            本サービスのユーザー（以下「ユーザー」といいます。）は以下の行為を行ってはなりません。
          </Paragraph>
          <List
            items={[
              "法令または公序良俗に反する行為",
              "本サービスの運営を妨げる行為",
              "本サービスの情報を改ざん・加工し、誤解を招く形で利用する行為",
              "当団体または第三者の権利・利益を侵害する行為",
            ]}
          />
        </div>

        <div>
          <SubSectionTitle>第3条（知的財産権）</SubSectionTitle>
          <Paragraph>
            本サービスに掲載されるテキスト、画像、データ等の権利は、当団体または当団体が利用許諾を受けた正当な権利者に帰属します。ユーザーは私的利用の範囲を超えて使用してはなりません。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>第4条（サービスの変更・停止）</SubSectionTitle>
          <Paragraph>
            当団体は、ユーザーへの事前通知なく本サービスの内容を変更・停止できるものとし、それにより生じた損害について一切の責任を負いません。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>第5条（規約の変更）</SubSectionTitle>
          <Paragraph>
            当団体は必要に応じて本規約を変更することができ、変更後にユーザーが本サービスを利用した場合、当該変更に同意したものとみなします。
          </Paragraph>
        </div>

        <div>
          <SubSectionTitle>第6条（準拠法・管轄）</SubSectionTitle>
          <Paragraph>
            本規約は日本法に準拠し、本サービスに関連して生じる一切の紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </Paragraph>
        </div>
      </div>
    </LegalPageLayout>
  );
}
